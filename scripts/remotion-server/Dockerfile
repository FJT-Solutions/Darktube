FROM node:20-slim

# Instalar dependências do Chromium e FFmpeg para o Remotion headless
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copiar package.json do projeto
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copiar arquivos do projeto e composições Remotion
COPY . .

EXPOSE 3001

CMD ["node", "scripts/remotion-server/server.js"]
