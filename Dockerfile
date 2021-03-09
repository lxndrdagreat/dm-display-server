FROM node:current-alpine

RUN set -x \
    && apk update \
    && apk add git \
    && git --version && node -v && npm -v

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

USER node

# Copy files
COPY --chown=node:node . .

# Install dependencies
RUN npm install --production

CMD [ "node", "./lib/server.js" ]
