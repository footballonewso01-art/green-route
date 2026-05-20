import subprocess
import json
import time

def run_sql(sql, label=""):
    start = time.time()
    cmd = [
        "fly", "ssh", "console",
        "-a", "greenroute-pb",
        "-C", f'sqlite3 /pb/pb_data/data.db "{sql}"'
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    elapsed = time.time() - start
    output = res.stdout.strip()
    # Remove the "Connecting to..." line
    lines = [l for l in output.split('\n') if not l.startswith('Connecting')]
    result = '\n'.join(lines).strip()
    if label:
        print(f"[{label}] ({elapsed:.2f}s) => {result}")
    return result, elapsed

print("=" * 60)
print("ANALYTICS SYSTEM DIAGNOSTIC REPORT")
print("=" * 60)

# 1. Database size
print("\n--- DATABASE STATS ---")
run_sql("SELECT count(*) FROM clicks", "Total clicks")
run_sql("SELECT count(*) FROM links", "Total links")
run_sql("SELECT count(*) FROM users", "Total users")

# 2. Index verification
print("\n--- INDEXES ---")
run_sql(".indexes clicks", "Clicks indexes")
run_sql(".indexes links", "Links indexes")

# 3. Database file size
run_sql("SELECT page_count * page_size / 1024 / 1024 as size_mb FROM pragma_page_count(), pragma_page_size()", "DB size (MB)")

# 4. Performance benchmarks - WITH indexes
print("\n--- QUERY PERFORMANCE (WITH INDEXES) ---")

# Find a real user with most links
user_result, _ = run_sql("SELECT user_id FROM links GROUP BY user_id ORDER BY count(*) DESC LIMIT 1", "Top user")
top_user = user_result.strip()

# Count their clicks
run_sql(f"SELECT count(*) FROM clicks WHERE link_id IN (SELECT id FROM links WHERE user_id = '{top_user}')", f"Clicks for top user ({top_user})")

# Benchmark: Total + Unique query
run_sql(f"SELECT count(c.id) as total, COALESCE(sum(CASE WHEN c.is_unique = 1 THEN 1 ELSE 0 END), 0) as uniq FROM clicks c WHERE c.link_id IN (SELECT id FROM links WHERE user_id = '{top_user}') AND c.created >= datetime('now', '-7 days')", "Query 1: Totals (7d)")

# Benchmark: Countries query
run_sql(f"SELECT COALESCE(c.country, 'Unknown') as name, count(c.id) as clicks FROM clicks c WHERE c.link_id IN (SELECT id FROM links WHERE user_id = '{top_user}') AND c.created >= datetime('now', '-7 days') GROUP BY name ORDER BY clicks DESC LIMIT 5", "Query 2: Countries (7d)")

# Benchmark: Trend query  
run_sql(f"SELECT date(c.created) as date, count(c.id) as clicks FROM clicks c WHERE c.link_id IN (SELECT id FROM links WHERE user_id = '{top_user}') AND c.created >= datetime('now', '-7 days') GROUP BY date ORDER BY date ASC", "Query 3: Trend (7d)")

# Benchmark: Heatmap query
run_sql(f"SELECT CAST(strftime('%w', c.created) AS INTEGER) as dow, CAST(strftime('%H', c.created) AS INTEGER) as hour, count(c.id) as clicks FROM clicks c WHERE c.link_id IN (SELECT id FROM links WHERE user_id = '{top_user}') AND c.created >= datetime('now', '-7 days') GROUP BY dow, hour", "Query 4: Heatmap (7d)")

# 5. 90-day benchmark (heaviest query)
print("\n--- HEAVY LOAD: 90-DAY QUERIES ---")
run_sql(f"SELECT count(c.id) FROM clicks c WHERE c.link_id IN (SELECT id FROM links WHERE user_id = '{top_user}') AND c.created >= datetime('now', '-90 days')", "Query: Count 90d")
run_sql(f"SELECT date(c.created) as date, count(c.id) as clicks FROM clicks c WHERE c.link_id IN (SELECT id FROM links WHERE user_id = '{top_user}') AND c.created >= datetime('now', '-90 days') GROUP BY date ORDER BY date ASC", "Query: Trend 90d")

# 6. Growth rate
print("\n--- GROWTH RATE ---")
run_sql("SELECT date(created) as d, count(*) as cnt FROM clicks GROUP BY d ORDER BY d DESC LIMIT 7", "Clicks per day (last 7)")
run_sql("SELECT count(*) FROM clicks WHERE created >= datetime('now', '-1 days')", "Clicks last 24h")
run_sql("SELECT count(*) FROM clicks WHERE created >= datetime('now', '-7 days')", "Clicks last 7d")
run_sql("SELECT count(*) FROM clicks WHERE created >= datetime('now', '-30 days')", "Clicks last 30d")

# 7. User distribution
print("\n--- USER DISTRIBUTION ---")
run_sql("SELECT l.user_id, count(c.id) as clicks FROM clicks c JOIN links l ON c.link_id = l.id GROUP BY l.user_id ORDER BY clicks DESC LIMIT 5", "Top 5 users by clicks")
run_sql("SELECT plan, count(*) FROM users GROUP BY plan", "Users by plan")

print("\n" + "=" * 60)
print("REPORT COMPLETE")
