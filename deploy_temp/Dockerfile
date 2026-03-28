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
COPY ./pb_hooks /pb/hooks_image

# Expose the default port
EXPOSE 8080

# Run PocketBase directly. 
# PocketBase will load hooks from /pb/hooks_image
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data", "--hooksDir=/pb/hooks_image"]
