# Use the official Node.js LTS image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs && \
    adduser -S teleprompter -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R teleprompter:nodejs /app
USER teleprompter

# Expose the port the app runs on
EXPOSE 8080

# Set environment variables with defaults
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + process.env.PORT + '/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]
