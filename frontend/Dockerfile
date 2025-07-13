# filepath: frontend/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Then copy source code
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]