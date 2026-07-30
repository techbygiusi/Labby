FROM node:22-alpine

WORKDIR /opt/labby

RUN apk add --no-cache \
      nginx \
      openssh-client \
      sshpass \
      samba-client \
      util-linux \
      tini

COPY backend/package.json ./backend/package.json
RUN cd backend && npm install --omit=dev

COPY backend/server.js ./backend/server.js
COPY app/ /usr/share/nginx/html/
COPY nginx/default.conf /etc/nginx/http.d/default.conf
COPY docker/start-labby.sh /usr/local/bin/start-labby

RUN chmod +x /usr/local/bin/start-labby \
    && mkdir -p /data /run/nginx \
    && chown -R node:node /data

ENV DATA_DIR=/data \
    NODE_ENV=production

VOLUME ["/data"]
EXPOSE 80

ENTRYPOINT ["/sbin/tini", "-g", "--"]
CMD ["/usr/local/bin/start-labby"]
