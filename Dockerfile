FROM node:22-alpine

WORKDIR /app

COPY package*.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN chmod +x start.sh

EXPOSE 4000

CMD ["./start.sh"]