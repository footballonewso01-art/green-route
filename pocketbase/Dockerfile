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
COPY ./repair_db.py /pb/repair_db.py
COPY ./backfill_analytics_rollup.py /pb/backfill_analytics_rollup.py
COPY ./backfill_billing_periods.py /pb/backfill_billing_periods.py

# Expose the default port
EXPOSE 8080

# Database repairs are an explicit maintenance operation. Running repair_db.py
# on every container start is unsafe because the legacy script may prune the
# auxiliary request-log database when it crosses its size threshold.
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data", "--hooksDir=/pb/pb_hooks"]
