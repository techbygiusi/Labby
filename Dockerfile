FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY website/ /usr/share/nginx/html/website/
COPY app/ /usr/share/nginx/html/demo/
COPY app/ /usr/share/nginx/html/app/
EXPOSE 80
