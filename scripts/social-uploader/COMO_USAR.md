# 🚀 Esteira de Upload Social 100% Open-Source (Zero Aprovação)

Esta esteira substitui completamente o **Blotato** e outros SaaS pagos, publicando seus vídeos gerados no **DarkTube** nas principais plataformas sem pagar assinaturas e **sem precisar passar por auditorias de desenvolvedor da Meta ou do TikTok**.

---

## 📋 Plataformas Suportadas (7 em 1)

1. **TikTok** (Via Playwright e cookies de sessão)
2. **Instagram Reels** (Via instagrapi / API móvel)
3. **Facebook Reels** (Cross-posting automático integrado ao Instagram)
4. **YouTube Shorts** (Via Google API v3 em Modo Teste - zero aprovação)
5. **Pinterest Video Pins** (Com link de destino externo clicável)
6. **Kwai** (Via Playwright no painel do criador)
7. **Threads** (Via API oficial direta ou Playwright)
8. **Telegram** (Canal VIP via Bot API gratuita)

---

## 🔑 Passo 1: Como Conectar suas Contas (Apenas 1 vez)

Para que o robô possa postar em segundo plano sem pedir aprovação das plataformas, você faz o login normal no seu navegador uma única vez para salvar os cookies:

### TikTok
```bash
python scripts/social-uploader/auth_manager.py --network tiktok
```
> Uma janela do navegador será aberta. Faça seu login com QR Code ou senha. Quando visualizar o painel, volte ao terminal e pressione ENTER. Os cookies serão salvos em `sessions/tiktok_cookies.json`.

### Instagram & Facebook
```bash
python scripts/social-uploader/auth_manager.py --network instagram
```
> Faça login na sua conta do Instagram (que já deve estar vinculada à sua página/perfil do Facebook na Central de Contas). O script salvará a sessão em `sessions/instagram_session.json`.

### Pinterest
```bash
python scripts/social-uploader/auth_manager.py --network pinterest
```

### Kwai
```bash
python scripts/social-uploader/auth_manager.py --network kwai
```

### Threads
```bash
python scripts/social-uploader/auth_manager.py --network threads
```

### YouTube Shorts
```bash
python scripts/social-uploader/auth_manager.py --network youtube
```
> Basta colocar o arquivo `client_secrets.json` baixado do seu Google Cloud Console (com o app em modo "Testing") dentro da pasta `sessions/` e rodar o comando.

### Telegram
Adicione as variáveis no seu `.env`:
```env
TELEGRAM_BOT_TOKEN="seu_token_do_botfather"
TELEGRAM_CHAT_ID="@seu_canal_ou_id"
```

---

## 🔍 Passo 2: Verificando o Status das Contas

A qualquer momento, veja quais redes já estão conectadas:
```bash
python scripts/social-uploader/test_pipeline.py
```

---

## 📤 Passo 3: Como Fazer Upload

### Via Linha de Comando (CLI):
```bash
python scripts/social-uploader/dispatcher.py \
  --video "storage/meu_video.mp4" \
  --caption "Curiosidade imperdível! #shorts #viral" \
  --title "Título Incrível" \
  --link "https://fjt-solutions.com" \
  --platforms "tiktok,instagram,facebook,youtube,pinterest"
```

* **`--platforms all`**: Posta em todas as redes configuradas.
* **`--link`**: No Pinterest, este link se torna o **Link Clicável do Pin** que leva tráfego para sua página.
* **`--delay`**: Segundos de intervalo humano entre uma rede e outra (padrão: 30 segundos).

---

## ⚡ Passo 4: Integração Automática no DarkTube (`server.js`)

Para disparar o upload automaticamente assim que o Remotion terminar de renderizar o vídeo:

No arquivo `scripts/remotion-server/server.js`, adicione este trecho logo após a linha onde o vídeo é gerado:

```javascript
const { spawn } = require('child_process');
const path = require('path');

// Dispara o despachante em segundo plano sem travar a resposta da requisição
const uploaderScript = path.resolve(__dirname, '../social-uploader/dispatcher.py');

const dispatcherProcess = spawn('python', [
  uploaderScript,
  '--video', outputFilePath,
  '--caption', inputProps.title || 'Novo clipe DarkTube #shorts #viral',
  '--title', inputProps.title || 'DarkTube Clip',
  '--link', 'https://fjt-solutions.com',
  '--video-url', videoUrl,
  '--platforms', 'all' // Ou selecione as redes desejadas: 'tiktok,instagram,youtube'
], {
  detached: true,
  stdio: 'ignore'
});

dispatcherProcess.unref();
console.log(`[Social Uploader] 🚀 Despachante multicanal iniciado em background para: ${outputFileName}`);
```

Pronto! Seu pipeline de ponta a ponta está configurado:
**Remotion renderiza ➔ MP4 gerado ➔ Publicação simultânea em todas as redes ➔ Custo R$ 0,00!**
