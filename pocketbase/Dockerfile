FROM alpine:latest

RUN apk add --no-cache ca-certificates unzip wget sqlite python3

ARG PB_VERSION=0.24.4
WORKDIR /pb

# Download Pocketbase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x /pb/pocketbase \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip

# Copy hooks and repair script
ARG CACHEBUST=202606251549
COPY ./pb_hooks /pb/pb_hooks
COPY ./pb_migrations /pb/pb_migrations
COPY ./repair_db.py /pb/repair_db.py

# Expose the default port
EXPOSE 8080

# Run sleep so we can debug manually
CMD ["sleep", "3600"]
