FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm rebuild

COPY . .

EXPOSE 8099

CMD ["npx", "expo", "start", "--port", "8099", "--host", "lan"]
