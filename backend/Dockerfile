FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssh-client sshpass samba-client util-linux

COPY package.json ./
RUN npm install --production

COPY server.js ./

ENV DATA_DIR=/data
VOLUME ["/data"]

EXPOSE 3001

CMD ["node", "server.js"]
