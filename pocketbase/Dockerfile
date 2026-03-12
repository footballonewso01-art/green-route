FROM alpine:latest

RUN apk add --no-cache ca-certificates unzip wget sqlite

ARG PB_VERSION=0.24.4
WORKDIR /pb

# Download Pocketbase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x /pb/pocketbase \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip

# Copy hooks
COPY ./pb_hooks /pb/pb_hooks

EXPOSE 8080

# Copy hooks into pb_data at startup (where PB expects them), then start with debug info
CMD ["sh", "-c", "cp -rf /pb/pb_hooks /pb/pb_data/pb_hooks && exec /pb/pocketbase serve --http=0.0.0.0:8080 --dev"]
