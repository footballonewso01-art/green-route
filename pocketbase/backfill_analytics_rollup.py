#!/usr/bin/env python3
"""Build and merge the historical analytics rollup without blocking startup.

The staging GROUP BY work writes to a separate SQLite database. Production is
opened read-only during that phase, so PocketBase can continue recording clicks.
The final merge is resumable and uses small transactions to keep write-lock
windows short.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
import time
from pathlib import Path


DIMENSIONS = (
    ("country", "COALESCE(NULLIF(country, ''), 'Unknown')"),
    ("referrer", "COALESCE(NULLIF(referrer, ''), 'Direct')"),
    ("device", "COALESCE(NULLIF(device, ''), 'Other')"),
    ("browser", "COALESCE(NULLIF(browser, ''), 'Other')"),
    ("os", "COALESCE(NULLIF(os, ''), 'Other')"),
)


def log(message: str) -> None:
    print(f"[analytics-backfill] {message}", flush=True)


def connect(path: Path, timeout: float = 30.0) -> sqlite3.Connection:
    connection = sqlite3.connect(str(path), timeout=timeout)
    connection.execute("PRAGMA busy_timeout = 30000")
    return connection


def read_state(db_path: Path) -> tuple[str, int, int]:
    with connect(db_path) as db:
        row = db.execute(
            "SELECT status, max_click_rowid, last_stage_id "
            "FROM analytics_rollup_state WHERE id = 'historical'"
        ).fetchone()
    if row is None:
        raise RuntimeError("analytics_rollup_state is missing; deploy the schema migration first")
    return str(row[0]), int(row[1]), int(row[2])


def stage_is_ready(stage_path: Path, cutoff: int) -> bool:
    if not stage_path.exists():
        return False
    try:
        with connect(stage_path) as stage:
            row = stage.execute(
                "SELECT value FROM meta WHERE key = 'status'"
            ).fetchone()
            cutoff_row = stage.execute(
                "SELECT value FROM meta WHERE key = 'max_click_rowid'"
            ).fetchone()
        return bool(row and row[0] == "ready" and cutoff_row and int(cutoff_row[0]) == cutoff)
    except sqlite3.Error:
        return False


def create_stage(db_path: Path, stage_path: Path, cutoff: int) -> None:
    if stage_path.exists():
        stage_path.unlink()

    log(f"building stage through clicks.rowid={cutoff}")
    stage = connect(stage_path, timeout=60.0)
    try:
        stage.execute("PRAGMA journal_mode = DELETE")
        stage.execute("PRAGMA synchronous = NORMAL")
        stage.execute("PRAGMA temp_store = FILE")
        stage.execute("ATTACH DATABASE ? AS source", (str(db_path),))
        stage.executescript(
            """
            CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
            CREATE TABLE rollup (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              link_id TEXT NOT NULL,
              bucket TEXT NOT NULL,
              dimension_type TEXT NOT NULL,
              dimension_value TEXT NOT NULL,
              total INTEGER NOT NULL,
              unique_count INTEGER NOT NULL,
              UNIQUE (link_id, bucket, dimension_type, dimension_value)
            );
            """
        )
        stage.executemany(
            "INSERT INTO meta (key, value) VALUES (?, ?)",
            (("status", "building"), ("max_click_rowid", str(cutoff))),
        )
        stage.commit()

        started = time.monotonic()
        stage.execute(
            """
            INSERT INTO rollup (
              link_id, bucket, dimension_type, dimension_value, total, unique_count
            )
            SELECT
              link_id,
              strftime('%Y-%m-%dT%H:00:00Z', created),
              'all',
              '',
              count(id),
              COALESCE(sum(CASE WHEN is_unique = 1 THEN 1 ELSE 0 END), 0)
            FROM source.clicks
            WHERE rowid <= ?
            GROUP BY link_id, strftime('%Y-%m-%dT%H:00:00Z', created)
            ORDER BY link_id, strftime('%Y-%m-%dT%H:00:00Z', created)
            """,
            (cutoff,),
        )
        stage.commit()
        log(f"staged core totals in {time.monotonic() - started:.1f}s")

        for dimension_type, expression in DIMENSIONS:
            dimension_started = time.monotonic()
            stage.execute(
                f"""
                INSERT INTO rollup (
                  link_id, bucket, dimension_type, dimension_value, total, unique_count
                )
                SELECT
                  link_id,
                  strftime('%Y-%m-%dT%H:00:00Z', created),
                  ?,
                  {expression},
                  count(id),
                  0
                FROM source.clicks
                WHERE rowid <= ?
                GROUP BY
                  link_id,
                  strftime('%Y-%m-%dT%H:00:00Z', created),
                  {expression}
                ORDER BY
                  link_id,
                  strftime('%Y-%m-%dT%H:00:00Z', created),
                  {expression}
                """,
                (dimension_type, cutoff),
            )
            stage.commit()
            log(f"staged {dimension_type} in {time.monotonic() - dimension_started:.1f}s")

        row_count = stage.execute("SELECT count(*) FROM rollup").fetchone()[0]
        raw_totals = stage.execute(
            """
            SELECT count(*), COALESCE(sum(CASE WHEN is_unique = 1 THEN 1 ELSE 0 END), 0)
            FROM source.clicks WHERE rowid <= ?
            """,
            (cutoff,),
        ).fetchone()
        core_totals = stage.execute(
            "SELECT COALESCE(sum(total), 0), COALESCE(sum(unique_count), 0) "
            "FROM rollup WHERE dimension_type = 'all'"
        ).fetchone()
        dimension_totals = dict(
            stage.execute(
                "SELECT dimension_type, COALESCE(sum(total), 0) FROM rollup "
                "WHERE dimension_type != 'all' GROUP BY dimension_type"
            ).fetchall()
        )
        if core_totals != raw_totals:
            raise RuntimeError(f"stage core mismatch: raw={raw_totals}, rollup={core_totals}")
        for dimension_type, _ in DIMENSIONS:
            if int(dimension_totals.get(dimension_type, -1)) != int(raw_totals[0]):
                raise RuntimeError(
                    f"stage {dimension_type} mismatch: raw={raw_totals[0]}, "
                    f"rollup={dimension_totals.get(dimension_type)}"
                )
        stage.execute("UPDATE meta SET value = 'ready' WHERE key = 'status'")
        stage.execute("INSERT INTO meta (key, value) VALUES ('row_count', ?)", (str(row_count),))
        stage.commit()
        log(f"stage ready with {row_count:,} aggregate rows")
    finally:
        stage.close()


UPSERT_SQL = """
    INSERT INTO analytics_hourly_rollup (
      link_id, bucket, dimension_type, dimension_value, total, unique_count
    )
    SELECT ?, ?, ?, ?, ?, ?
    WHERE EXISTS (SELECT 1 FROM links WHERE id = ?)
    ON CONFLICT (link_id, bucket, dimension_type, dimension_value)
    DO UPDATE SET
      total = analytics_hourly_rollup.total + excluded.total,
      unique_count = analytics_hourly_rollup.unique_count + excluded.unique_count
"""


def merge_stage(db_path: Path, stage_path: Path, cutoff: int, batch_size: int) -> None:
    stage = connect(stage_path)
    db = connect(db_path)
    try:
        total_rows = int(stage.execute("SELECT count(*) FROM rollup").fetchone()[0])
        _, state_cutoff, last_id = read_state(db_path)
        if state_cutoff != cutoff:
            raise RuntimeError(f"cutoff changed: state={state_cutoff}, stage={cutoff}")

        log(f"merging {total_rows:,} rows in batches of {batch_size:,}; resume id={last_id:,}")
        while True:
            rows = stage.execute(
                """
                SELECT id, link_id, bucket, dimension_type, dimension_value, total, unique_count
                FROM rollup
                WHERE id > ?
                ORDER BY id
                LIMIT ?
                """,
                (last_id, batch_size),
            ).fetchall()
            if not rows:
                break

            params = [
                (link_id, bucket, dimension_type, dimension_value, total, unique_count, link_id)
                for _, link_id, bucket, dimension_type, dimension_value, total, unique_count in rows
            ]
            next_id = int(rows[-1][0])
            for attempt in range(8):
                try:
                    db.execute("BEGIN IMMEDIATE")
                    db.executemany(UPSERT_SQL, params)
                    db.execute(
                        """
                        UPDATE analytics_rollup_state
                        SET status = 'merging', last_stage_id = ?, updated = datetime('now')
                        WHERE id = 'historical'
                        """,
                        (next_id,),
                    )
                    db.commit()
                    break
                except sqlite3.OperationalError as error:
                    db.rollback()
                    if "locked" not in str(error).lower() or attempt == 7:
                        raise
                    time.sleep(0.1 * (attempt + 1))

            last_id = next_id
            if last_id % (batch_size * 20) == 0 or last_id == total_rows:
                log(f"merged {last_id:,}/{total_rows:,}")
            time.sleep(0.02)

        db.execute("BEGIN IMMEDIATE")
        db.execute(
            """
            UPDATE analytics_rollup_state
            SET status = 'verifying', updated = datetime('now')
            WHERE id = 'historical' AND max_click_rowid = ?
            """,
            (cutoff,),
        )
        db.commit()
        log("historical merge staged; verifying")
    finally:
        stage.close()
        db.close()


def verify(db_path: Path, cutoff: int) -> None:
    with connect(db_path) as db:
        raw = db.execute(
            """
            SELECT
              count(*),
              COALESCE(sum(CASE WHEN is_unique = 1 THEN 1 ELSE 0 END), 0)
            FROM clicks
            WHERE rowid <= ?
              AND link_id IN (SELECT id FROM links)
            """,
            (cutoff,),
        ).fetchone()
        historical_rollup = db.execute(
            """
            SELECT
              COALESCE(sum(total), 0),
              COALESCE(sum(unique_count), 0)
            FROM analytics_hourly_rollup
            WHERE dimension_type = 'all'
              AND link_id IN (SELECT id FROM links)
            """
        ).fetchone()
        quick_check = db.execute("PRAGMA quick_check").fetchone()[0]

    if historical_rollup[0] < raw[0] or historical_rollup[1] < raw[1]:
        raise RuntimeError(
            f"rollup verification failed: raw={raw}, rollup={historical_rollup}"
        )
    if quick_check != "ok":
        raise RuntimeError(f"SQLite quick_check failed: {quick_check}")
    log(
        "verified raw historical totals are covered "
        f"(raw={raw[0]:,}/{raw[1]:,}, rollup={historical_rollup[0]:,}/{historical_rollup[1]:,}); quick_check=ok"
    )


def mark_complete(db_path: Path, cutoff: int) -> None:
    with connect(db_path) as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute(
            """
            UPDATE analytics_rollup_state
            SET status = 'complete', updated = datetime('now')
            WHERE id = 'historical' AND max_click_rowid = ?
            """,
            (cutoff,),
        )
        db.commit()
    log("historical backfill complete")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="/pb/pb_data/data.db")
    parser.add_argument("--stage", default="/pb/pb_data/analytics_rollup_stage.db")
    parser.add_argument("--batch-size", type=int, default=2000)
    parser.add_argument("--keep-stage", action="store_true")
    args = parser.parse_args()

    db_path = Path(args.db).resolve()
    stage_path = Path(args.stage).resolve()
    if db_path == stage_path:
        raise RuntimeError("stage database must differ from production database")
    if not db_path.exists():
        raise RuntimeError(f"database not found: {db_path}")

    status, cutoff, last_id = read_state(db_path)
    log(f"state={status}, cutoff={cutoff:,}, last_stage_id={last_id:,}")
    if status == "complete":
        verify(db_path, cutoff)
        return 0

    if not stage_is_ready(stage_path, cutoff):
        if last_id != 0:
            raise RuntimeError("stage is missing after a partial merge; refusing a non-idempotent rebuild")
        create_stage(db_path, stage_path, cutoff)

    merge_stage(db_path, stage_path, cutoff, max(100, args.batch_size))
    verify(db_path, cutoff)
    mark_complete(db_path, cutoff)
    if not args.keep_stage and stage_path.exists():
        os.remove(stage_path)
        log("removed staging database")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        log(f"ERROR: {error}")
        sys.exit(1)
