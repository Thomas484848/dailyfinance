FROM node:20-alpine

WORKDIR /app

# (optionnel mais utile si Prisma casse sur Alpine)
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]

