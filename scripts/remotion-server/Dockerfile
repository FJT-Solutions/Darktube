FROM node:20-slim
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN echo "precedence ::ffff:0:0/96  100" >> /etc/gai.conf
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
    make \
    g++ \
    python3 \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copiar arquivos do projeto
COPY . .

# Se construído a partir da raiz do repositório, mover scripts/remotion-server para a raiz de /app
RUN if [ -f scripts/remotion-server/server.js ]; then cp -rf scripts/remotion-server/* .; fi

# Instalar dependências do Node.js
RUN npm install --omit=dev

EXPOSE 3001

CMD ["node", "server.js"]
