#!/bin/bash
# Script to clone the production PocketBase database volume to staging for realistic testing

echo "Fetching latest snapshot from Production data..."
PROD_SNAPSHOT=$(fly volumes snapshots list pb_data_restored --app greenroute-pb | grep -v 'Snapshots' | grep -v 'ID' | grep -v 'Total' | head -n 1 | awk '{print $1}')

if [ -z "$PROD_SNAPSHOT" ]; then
    echo "Error: No snapshot found!"
    exit 1
fi

echo "Found snapshot: $PROD_SNAPSHOT"

echo "Finding current staging data volume..."
STAGING_VOL=$(fly volumes list --app greenroute-pb-staging | grep 'pb_data_staging' | awk '{print $1}')

if [ ! -z "$STAGING_VOL" ]; then
    echo "Destroying current staging volume: $STAGING_VOL"
    fly volumes destroy $STAGING_VOL --app greenroute-pb-staging --yes
fi

echo "Creating new staging volume from production snapshot..."
fly volumes create pb_data_staging --snapshot-id $PROD_SNAPSHOT --region ams --size 1 --app greenroute-pb-staging --yes

echo "Redeploying staging backend to mount the new volume..."
fly deploy -c fly.staging.toml --app greenroute-pb-staging

echo "Staging database has been synchronized with Production!"
