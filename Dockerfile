FROM node:18-alpine

WORKDIR /app

COPY package*.json package-lock.json ./

RUN npm install

COPY . .

RUN chmod +x start.sh

EXPOSE 4000

CMD ["./start.sh"]