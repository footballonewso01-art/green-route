import sqlite3
import json
import os

DB_PATH = "pocketbase/pb_data/data.db"

# Official Field ID Mapping
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
        # 1. Fetch current links metadata
        cursor.execute("SELECT id, schema FROM _collections WHERE name='links'")
        row = cursor.fetchone()
        if not row:
            print("Links collection not found.")
            return

        cid, schema_json = row
        schema = json.loads(schema_json)
        
        new_schema = []
        for field in schema:
            name = field.get('name')
            ftype = field.get('type')
            
            # Start fresh with a clean field structure
            new_f = {
                "system": field.get('system', False),
                "id": OFFICIAL_IDS.get(name, field.get('id')),
                "name": name,
                "type": ftype,
                "required": field.get('required', False),
                "presentable": field.get('presentable', False),
                "unique": field.get('unique', False),
                "options": field.get('options', {})
            }

            # Move root-level options to the options object (PocketBase v0.22 requirement)
            if ftype == 'file':
                # Preserve existing or defaults
                opts = new_f['options']
                for key in ['maxSelect', 'maxSize', 'mimeTypes', 'thumbs', 'protected']:
                    if key in field:
                        opts[key] = field[key]
                if name == 'bg_image':
                    opts['maxSelect'] = 1
                    opts['maxSize'] = 5242880
                    opts['mimeTypes'] = ["image/jpeg","image/png","image/svg+xml","image/gif","image/webp"]
            
            elif ftype == 'select':
                opts = new_f['options']
                for key in ['values', 'maxSelect']:
                    if key in field:
                        opts[key] = field[key]
            
            elif ftype == 'number':
                opts = new_f['options']
                for key in ['min', 'max', 'onlyInt']:
                    if key in field:
                        opts[key] = field[key]

            elif ftype == 'relation':
                opts = new_f['options']
                for key in ['collectionId', 'cascadeDelete', 'minSelect', 'maxSelect', 'displayFields']:
                    if key in field:
                        opts[key] = field[key]

            elif ftype == 'json':
                opts = new_f['options']
                if 'maxSize' in field:
                    opts['maxSize'] = field['maxSize']
            
            # Fix order field type to number if it was something else
            if name == 'order':
                new_f['type'] = 'number'

            new_schema.append(new_f)

        # Check if bg_image is missing in metadata (though physical column exists)
        if not any(f['name'] == 'bg_image' for f in new_schema):
            print("Adding 'bg_image' to link metadata...")
            new_schema.append({
                "system": False,
                "id": "l_bgimg",
                "name": "bg_image",
                "type": "file",
                "required": False,
                "presentable": False,
                "unique": False,
                "options": {
                    "maxSelect": 1,
                    "maxSize": 5242880,
                    "mimeTypes": ["image/jpeg","image/png","image/svg+xml","image/gif","image/webp"],
                    "thumbs": [],
                    "protected": False
                }
            })

        new_schema_json = json.dumps(new_schema)
        cursor.execute("UPDATE _collections SET schema=? WHERE id=?", (new_schema_json, cid))
        conn.commit()
        print("Schema successfully updated for PocketBase v0.22 structure.")

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    repair()
