"""One-time reconciliation of persisted billing periods with Stripe.

Run this only after the `period_start` schema field has been deployed:
    STRIPE_SECRET_KEY=... python3 /pb/backfill_billing_periods.py

It intentionally logs aggregate counts only, never customer emails, ids or keys.
"""

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from typing import Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DB_PATH = os.getenv("PB_DATA_DB", "/pb/pb_data/data.db")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
DRY_RUN = os.getenv("DRY_RUN", "").lower() in {"1", "true", "yes"}


def stripe_subscription(subscription_id: str) -> dict:
    request = Request(
        f"https://api.stripe.com/v1/subscriptions/{subscription_id}",
        headers={"Authorization": f"Bearer {STRIPE_SECRET_KEY}"},
    )
    with urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def period_from_subscription(subscription: dict) -> Tuple[str, str]:
    items = subscription.get("items", {}).get("data", [])
    first_item = items[0] if items else {}
    start = subscription.get("current_period_start") or first_item.get("current_period_start")
    end = subscription.get("current_period_end") or first_item.get("current_period_end")
    if not isinstance(start, (int, float)) or not isinstance(end, (int, float)):
        raise ValueError("Stripe subscription has no valid current period")

    def pocketbase_date(timestamp: float) -> str:
        return datetime.fromtimestamp(timestamp, timezone.utc).strftime("%Y-%m-%d %H:%M:%S.000Z")

    return pocketbase_date(start), pocketbase_date(end)


def mapped_status(subscription: dict) -> Optional[str]:
    if subscription.get("status") in {"canceled", "unpaid", "incomplete_expired"}:
        return "canceled"
    if subscription.get("cancel_at_period_end") is True:
        return "canceling"
    return None


def main() -> int:
    if not STRIPE_SECRET_KEY:
        print("STRIPE_SECRET_KEY is required", file=sys.stderr)
        return 2
    if not os.path.exists(DB_PATH):
        print("PocketBase data.db was not found", file=sys.stderr)
        return 2

    conn = sqlite3.connect(DB_PATH)
    try:
        columns = {row[1] for row in conn.execute("PRAGMA table_info(billing)")}
        if "period_start" not in columns or "end_date" not in columns:
            print("Billing period schema is missing; run repair_db.py first", file=sys.stderr)
            return 2

        rows = conn.execute(
            """
            SELECT id, user_id, stripe_subscription_id
            FROM billing
            WHERE TRIM(COALESCE(stripe_subscription_id, '')) <> ''
            """
        ).fetchall()

        synced = 0
        failed = 0
        for billing_id, user_id, subscription_id in rows:
            try:
                subscription = stripe_subscription(subscription_id)
                period_start, period_end = period_from_subscription(subscription)
                status = mapped_status(subscription)

                if not DRY_RUN:
                    conn.execute(
                        """
                        UPDATE billing
                        SET period_start = ?, end_date = ?, status = COALESCE(?, status)
                        WHERE id = ?
                        """,
                        (period_start, period_end, status, billing_id),
                    )
                    # A user can have an old canceled subscription from an upgrade.
                    # Only the matching current subscription may update entitlement.
                    conn.execute(
                        """
                        UPDATE users
                        SET plan_expires_at = ?
                        WHERE id = ? AND stripe_subscription_id = ?
                        """,
                        (period_end, user_id, subscription_id),
                    )
                synced += 1
            except (HTTPError, URLError, ValueError, json.JSONDecodeError) as error:
                failed += 1
                print(f"Could not sync one billing record: {type(error).__name__}", file=sys.stderr)

        # Older manual purchases and trials were created before billing periods
        # existed. Their record creation time is the grant start, while the user
        # record is the authoritative source of a still-active grant's expiry.
        # A record that no longer matches the user's entitlement must not remain
        # active simply because historic data omitted both boundaries.
        legacy_rows = conn.execute(
            """
            SELECT
              b.id, b.plan, b.created, b.period_start, b.end_date,
              COALESCE(u.plan, ''), COALESCE(u.plan_expires_at, '')
            FROM billing b
            JOIN users u ON u.id = b.user_id
            WHERE b.status IN ('active', 'canceling')
              AND TRIM(COALESCE(b.stripe_subscription_id, '')) = ''
              AND (COALESCE(b.period_start, '') = '' OR COALESCE(b.end_date, '') = '')
            """
        ).fetchall()
        legacy_synced = 0
        legacy_expired = 0
        for billing_id, plan, created, period_start, period_end, user_plan, user_expiry in legacy_rows:
            if user_plan == plan and user_expiry:
                if not DRY_RUN:
                    conn.execute(
                        """
                        UPDATE billing
                        SET period_start = ?, end_date = ?
                        WHERE id = ?
                        """,
                        (period_start or created, period_end or user_expiry, billing_id),
                    )
                legacy_synced += 1
            else:
                if not DRY_RUN:
                    conn.execute("UPDATE billing SET status = 'expired' WHERE id = ?", (billing_id,))
                legacy_expired += 1

        if not DRY_RUN:
            conn.commit()
        print(
            "Billing period reconciliation complete: "
            f"stripe_synced={synced}, legacy_synced={legacy_synced}, "
            f"legacy_expired={legacy_expired}, failed={failed}, dry_run={DRY_RUN}"
        )
        return 0 if failed == 0 else 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
