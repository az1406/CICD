FROM grafana/k6:latest

WORKDIR /app

COPY *.js ./
COPY package.json ./

CMD ["run", "--env", "BASE_URL=http://staging-app:8080", "performance-tests.js"]