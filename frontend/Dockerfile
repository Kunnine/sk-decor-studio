# Stage 1: Build React SPA
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies cleanly
RUN npm ci

# Copy frontend source code
COPY . .

# Build production bundle with TypeScript check
RUN npm run build

# Stage 2: Lightweight static server (Nginx Alpine)
FROM nginx:alpine

# Copy built assets to web root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for SPA routing
RUN { \
        echo 'server {'; \
        echo '    listen 80;'; \
        echo '    server_name localhost;'; \
        echo '    root /usr/share/nginx/html;'; \
        echo '    index index.html;'; \
        echo '    location / {'; \
        echo '        try_files $uri $uri/ /index.html;'; \
        echo '    }'; \
        echo '    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {'; \
        echo '        expires 1y;'; \
        echo '        add_header Cache-Control "public, immutable";'; \
        echo '    }'; \
        echo '}'; \
    } > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
