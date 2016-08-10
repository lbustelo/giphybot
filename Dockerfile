FROM node:6

COPY package.json /
ENV NPM_CONFIG_LOGLEVEL error
RUN npm install

WORKDIR /giphybot
VOLUME /giphybot

CMD npm run start
