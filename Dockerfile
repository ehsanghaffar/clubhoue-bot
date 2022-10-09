FROM node:16.16.0-alpine3.16
WORKDIR /
COPY package.json .
RUN npm install
COPY . .