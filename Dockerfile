# Use the official Node.js 16 image as the base image
FROM node:19-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

COPY libs/db/src/prisma/schema.prisma libs/db/src/prisma/schema.prisma

# Install project dependencies
RUN npm install

# Copy the rest of the application source code to the container
COPY . .

# Copy the .env file into the container
COPY .env .env

RUN npm run build onion-scraper

FROM node:19-alpine as production

# Set NODE_ENV
ENV NODE_ENV production

# Use non-root user
# Use --chown on COPY commands to set file permissions
USER node

COPY --chown=node:node --from=builder /app/libs/db/src/prisma ./libs/db/src/prisma
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/.env ./env

EXPOSE 3000

CMD [ "npm", "run", "start:migrate:prod" ]

