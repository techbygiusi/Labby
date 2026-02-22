FROM nginx:1.27-alpine

COPY app/ /usr/share/nginx/html/

EXPOSE 80
