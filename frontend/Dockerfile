# BUILD STAGE
FROM node:22-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# PRODUCTION STAGE
FROM nginx:stable-alpine as production-stage

# Copy the built React app
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom Nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create startup script to print URL
RUN echo '#!/bin/sh' > /docker-entrypoint.d/99-print-url.sh && \
    echo 'echo ""' >> /docker-entrypoint.d/99-print-url.sh && \
    echo 'echo "✅ Frontend is running at: http://localhost:5173"' >> /docker-entrypoint.d/99-print-url.sh && \
    echo 'echo ""' >> /docker-entrypoint.d/99-print-url.sh && \
    chmod +x /docker-entrypoint.d/99-print-url.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
