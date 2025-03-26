# Build stage
FROM node:18-alpine as builder

# Cài đặt curl cho healthcheck
RUN apk add --no-cache curl

# Tạo thư mục app và set working directory
WORKDIR /app

# Copy package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start application in development mode
CMD ["npm", "run", "dev"]