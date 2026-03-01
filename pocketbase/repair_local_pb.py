import sqlite3
import json
import os

DB_PATH = "pocketbase/pb_data/data.db"

# The "official" field metadata from pb_schema.json for the links collection
BG_IMAGE_FIELD = {
    "hidden": False,
    "id": "l_bgimg",
    "maxSelect": 1,
    "maxSize": 5242880,
    "mimeTypes": [
        "image/jpeg",
        "image/png",
        "image/svg+xml",
        "image/gif",
        "image/webp"
    ],
    "name": "bg_image",
    "presentable": False,
    "protected": False,
    "required": False,
    "system": False,
    "thumbs": None,
    "type": "file"
}

# Mapping of field names to the "Official" IDs from pb_schema.json
OFFICIAL_IDS = {
    "id": "l_id",
    "slug": "l_slug",
    "destination_url": "l_dest",
    "user_id": "l_uid",
    "active": "l_actv",
    "clicks_count": "l_ccnt",
    "interstitial_enabled": "l_intst",
    "title": "l_title",
    "order": "l_order",
    "show_on_profile": "l_show",
    "mode": "l_mode",
    "icon_type": "l_itype",
    "icon_value": "l_ival",
    "icon_color": "l_icol",
    "cloaking": "l_cloak",
    "utm_source": "l_utms",
    "utm_medium": "l_utmm",
    "utm_campaign": "l_utmc",
    "geo_targeting": "l_geot",
    "device_targeting": "l_devt",
    "ab_split": "l_abspl",
    "split_urls": "l_splur",
    "start_at": "l_start",
    "expire_at": "l_expir",
    "safe_page_url": "l_safe",
    "fb_pixel": "l_fbpx",
    "google_pixel": "l_gpx",
    "tiktok_pixel": "l_ttpx",
    "size": "l_size",
    "bg_image": "l_bgimg"
}

def repair():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Physical Table Update
        cursor.execute("PRAGMA table_info(links)")
        columns = [row[1] for row in cursor.fetchall()]
        if "bg_image" not in columns:
            print("Adding physical column 'bg_image' to links table...")
            cursor.execute("ALTER TABLE links ADD COLUMN bg_image TEXT DEFAULT '';")
        else:
            print("'bg_image' column already exists.")

        # 2. Metadata Update (_collections)
        cursor.execute("SELECT id, schema FROM _collections WHERE name='links'")
        row = cursor.fetchone()
        if not row:
            print("Links collection metadata not found.")
            return

        cid, schema_json = row
        schema = json.loads(schema_json)
        
        # Synchronize IDs and check for bg_image
        bg_image_present = False
        new_schema = []
        
        for field in schema:
            name = field.get('name')
            if name == 'bg_image':
                bg_image_present = True
            
            # Sync to official ID if possible to prevent import errors
            if name in OFFICIAL_IDS:
                field['id'] = OFFICIAL_IDS[name]
            
            new_schema.append(field)

        if not bg_image_present:
            print("Appending 'bg_image' field definition to metadata...")
            new_schema.append(BG_IMAGE_FIELD)

        new_schema_json = json.dumps(new_schema)
        cursor.execute("UPDATE _collections SET schema=? WHERE id=?", (new_schema_json, cid))
        
        conn.commit()
        print("Database repair and synchronization completed successfully.")

    except Exception as e:
        print(f"Error during repair: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    repair()
