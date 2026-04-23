# syntax=docker/dockerfile:1

# Build arguments for health endpoint metadata
ARG BUILD_SHA=unknown
ARG BUILD_TIME=unknown
ARG BUILD_VERSION=unknown

FROM node:22 AS builder

# Re-declare build args for this stage
ARG BUILD_SHA
ARG BUILD_TIME
ARG BUILD_VERSION

# Set as environment variables for the build process
ENV BUILD_SHA=$BUILD_SHA
ENV BUILD_TIME=$BUILD_TIME
ENV BUILD_VERSION=$BUILD_VERSION

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application (this runs generate-health.js which uses the env vars)
RUN npm run build

FROM nginx:alpine

# nginx:alpine already has nginx user (UID 101, GID 101)
# Use the existing nginx user for the K8s security context

COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx cache and runtime directories with correct ownership
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp \
    /var/run \
    && chown -R nginx:nginx /var/cache/nginx \
    /var/run \
    /usr/share/nginx/html

# SPA routing support with health endpoint
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]