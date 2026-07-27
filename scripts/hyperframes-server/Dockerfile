# ─── Base: Node.js 22 (requisito mínimo do Hyperframes) ───
FROM node:22-slim

# ─── Dependências do sistema ───
# Chromium headless para o Hyperframes + FFmpeg para mixagem de áudio
RUN apt-get update && apt-get install -y \
    chromium \
    unzip \
    ffmpeg \
    fonts-liberation \
    fonts-noto \
    fonts-noto-color-emoji \
    libnss3 \
    libatk-bridge2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    ca-certificates \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# ─── Variáveis de ambiente do Chromium ───
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium

# ─── Diretório de trabalho ───
WORKDIR /app

# ─── Copiar manifesto e instalar dependências ───
COPY package*.json ./

RUN npm install --omit=dev && npx hyperframes browser ensure || true

# ─── Copiar código do servidor ───
COPY server.js ./
COPY template-generator.js ./

# ─── Criar diretório de output ───
RUN mkdir -p /app/output

# ─── Porta ───
EXPOSE 3002

# ─── Iniciar servidor ───
CMD ["node", "server.js"]
