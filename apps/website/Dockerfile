# Production stage - using nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy all static website files
COPY index.html /usr/share/nginx/html/
COPY features.html /usr/share/nginx/html/
COPY pricing.html /usr/share/nginx/html/
COPY about.html /usr/share/nginx/html/

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
