FROM node:20-alpine

# Install system dependencies for scraping tools
RUN apk update && apk add --no-cache \
    chromium \
    chromium-chromedriver \
    firefox \
    python3 \
    py3-pip \
    go \
    git \
    curl \
    wget \
    nmap \
    masscan \
    zmap \
    bash \
    && rm -rf /var/cache/apk/*

# Install Go-based tools
RUN go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest && \
    go install -v github.com/projectdiscovery/katana/cmd/katana@latest && \
    go install -v github.com/hakluke/hakrawler@latest && \
    go install -v github.com/tomnomnom/waybackurls@latest && \
    go install -v github.com/lc/gau/v2/cmd/gau@latest && \
    go install -v github.com/gocolly/colly/cmd/colly@latest && \
    go install -v github.com/MontFerret/ferret/cmd/ferret@latest

# Install Python/Scrapy
RUN pip3 install --no-cache-dir \
    scrapy \
    scrapy-user-agents \
    scrapy-proxy-middleware \
    selenium \
    selenium-stealth \
    undetected-chromedriver

# Set up environment variables for browsers
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# Install Node.js dependencies
COPY package*.json ./
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium firefox webkit && \
    npx playwright install-deps

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create directories for scraping output
RUN mkdir -p /app/data/scraping/{scrapy,playwright,puppeteer,recon}

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S solarflow -u 1001

# Set permissions
RUN chown -R solarflow:nodejs /app
USER solarflow

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

CMD ["npm", "start"]