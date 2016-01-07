FROM node:0.12

EXPOSE 3000
CMD node /usr/local/daheim/app.js

ADD package.json /usr/local/daheim/package.json
RUN cd /usr/local/daheim \
  && npm install npm -g \
  && npm install grunt-cli -g \
  && npm install \
  && rm -rf ~/.npm

ADD . /usr/local/daheim
RUN cd /usr/local/daheim && grunt
