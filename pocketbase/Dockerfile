FROM alpine@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b

RUN apk add --no-cache ca-certificates unzip wget sqlite python3

ARG PB_VERSION=0.24.4
WORKDIR /pb

# Download Pocketbase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x /pb/pocketbase \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip

# Copy hooks and repair script
ARG CACHEBUST=202607141535
COPY ./pb_hooks /pb/pb_hooks
COPY ./pb_migrations /pb/pb_migrations
# Compatibility phase only: publish new public DTO endpoints before the
# frontend switches away from raw records. The final/default image locks them.
ARG PUBLIC_READ_LOCKDOWN=1
RUN case "$PUBLIC_READ_LOCKDOWN" in \
      1) ;; \
      0) rm /pb/pb_migrations/1787830000_harden_link_records_and_image_uploads.js ;; \
      *) echo "PUBLIC_READ_LOCKDOWN must be 0 or 1" >&2; exit 1 ;; \
    esac
COPY ./repair_db.py /pb/repair_db.py
COPY ./backfill_analytics_rollup.py /pb/backfill_analytics_rollup.py
COPY ./backfill_billing_periods.py /pb/backfill_billing_periods.py
COPY ./entrypoint.sh /pb/entrypoint.sh
RUN chmod +x /pb/entrypoint.sh

# Expose the default port
EXPOSE 8080

# Database repairs are an explicit maintenance operation. Running repair_db.py
# on every container start is unsafe because the legacy script may prune the
# auxiliary request-log database when it crosses its size threshold.
ENTRYPOINT ["/pb/entrypoint.sh"]
