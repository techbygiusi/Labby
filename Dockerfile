FROM nginx:1.27-alpine

# Routing configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Landing page (website/index.html = new landing page)
COPY website/ /usr/share/nginx/html/website/

# Demo app (localStorage-only) at /demo/
COPY app/ /usr/share/nginx/html/demo/

# Full app (server-side storage via backend) at /app/
COPY app/ /usr/share/nginx/html/app/

EXPOSE 80
