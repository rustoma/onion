# Use the official Node.js 16 image as the base image
FROM node:19 AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

COPY libs/db/src/prisma/schema.prisma libs/db/src/prisma/schema.prisma

# Install project dependencies
RUN npm install

# Copy the rest of the application source code to the container
COPY . .

RUN npm run build onion-scraper

FROM node:19 AS production

# Install necessary dependencies for running Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] https://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Set NODE_ENV
ENV NODE_ENV production

RUN mkdir -p ./screenshots && chmod -R 777 ./screenshots

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

