FROM node:0.12

ADD package.json /usr/local/daheim/package.json
WORKDIR /usr/local/daheim
RUN npm install npm -g \
  && npm install grunt-cli -g \
  && npm install \
  && rm -rf ~/.npm

EXPOSE 3000

ADD . /usr/local/daheim
WORKDIR /usr/local/daheim
RUN grunt

CMD node /usr/local/daheim/app.js
