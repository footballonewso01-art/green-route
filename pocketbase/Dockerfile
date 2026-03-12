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

# Clean up any old hooks from persistent volume, then start
# --hooksDir is REQUIRED because pb_data is on a mounted volume and PB won't auto-discover hooks
CMD ["sh", "-c", "rm -rf /pb/pb_data/pb_hooks 2>/dev/null; exec /pb/pocketbase serve --http=0.0.0.0:8080 --hooksDir=/pb/pb_hooks"]
