export interface AiStreamerConfigInput {
  personaName?: string;
  niche?: string;
  personalityPromptPtBr?: string;
  voiceName?: string;
  obsSceneName?: string;
  triggerOnGifts?: boolean;
  triggerOnComments?: boolean;
  llmModel?: string;
  cooldownSec?: number;
}

export interface AiStreamerBundle {
  configJson: string;
  pythonBotScript: string;
  obsOverlayHtml: string;
  setupGuideMd: string;
}

/**
 * Gera um kit completo 24/7 ($0) para Live Interativa no TikTok/YouTube/Kick usando
 * TikFinity WebSocket local -> LLM (Gemini/Groq/Ollama) -> Edge TTS (pt-BR) -> Overlay OBS.
 */
export function buildAiStreamerBundle(input: AiStreamerConfigInput = {}): AiStreamerBundle {
  const personaName = String(input.personaName || 'Luna IA').trim().slice(0, 60);
  const niche = String(input.niche || 'Curiosidades, Mistérios e Tecnologia').trim().slice(0, 100);
  const voiceName = String(input.voiceName || 'pt-BR-FranciscaNeural').trim();
  const obsSceneName = String(input.obsSceneName || 'Cena_Live_24_7').trim();
  const llmModel = String(input.llmModel || 'gemini-2.5-flash').trim();
  const cooldownSec = Math.max(2, Math.min(60, Number(input.cooldownSec) || 6));
  const triggerOnGifts = input.triggerOnGifts !== false;
  const triggerOnComments = input.triggerOnComments !== false;
  const personality =
    String(
      input.personalityPromptPtBr ||
        `Você é ${personaName}, apresentadora carismática especialista em ${niche}. Responda em no máximo 2 frases curtas em Português do Brasil, sem usar emojis ou símbolos estranhos para facilitar a fala natural.`
    ).trim();

  const configObj = {
    personaName,
    niche,
    voiceName,
    obsSceneName,
    llmModel,
    cooldownSec,
    triggers: {
      comments: triggerOnComments,
      gifts: triggerOnGifts,
    },
    tikfinityWsUrl: 'ws://localhost:21213/',
    overlayWsPort: 8765,
    systemPrompt: personality,
  };

  const configJson = JSON.stringify(configObj, null, 2);

  const pythonBotScript = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DarkTube V5 — Kit Streamer IA 24/7 ($0)
Conecta ao TikFinity (WebSocket local :21213), responde comentários e presentes com LLM + Edge TTS
e envia legendas/estado de boca em tempo real para o Overlay OBS (:8765).

Dependências (instalar 1 vez):
  pip install websockets edge-tts openai playsound==1.2.2
Variáveis de ambiente opcionais:
  LLM_API_KEY=... (ou OPENAI_API_KEY / GROQ_API_KEY / GEMINI_API_KEY)
  LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/ (ou Groq/Ollama local)
"""
import asyncio
import json
import os
import tempfile
import time
import edge_tts
import websockets
from openai import OpenAI

with open("streamer_config.json", "r", encoding="utf-8") as f:
    CFG = json.load(f)

client = OpenAI(
    api_key=os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY") or "ollama",
    base_url=os.getenv("LLM_BASE_URL") or "https://api.openai.com/v1",
)

OVERLAY_CLIENTS = set()
LAST_REPLY_AT = 0.0
EVENT_QUEUE = asyncio.Queue(maxsize=25)

async def broadcast_overlay(payload: dict):
    msg = json.dumps(payload, ensure_ascii=False)
    dead = []
    for ws in list(OVERLAY_CLIENTS):
        try:
            await ws.send(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        OVERLAY_CLIENTS.discard(ws)

async def overlay_ws_handler(ws):
    OVERLAY_CLIENTS.add(ws)
    await ws.send(json.dumps({"type": "hello", "persona": CFG["personaName"]}))
    try:
        async for _ in ws:
            pass
    finally:
        OVERLAY_CLIENTS.discard(ws)

def ask_llm(author: str, text: str, kind: str) -> str:
    prompt_user = (
        f"[{kind}] Telespectador {author} enviou: {text}. Responda direto em PT-BR curto (1 a 2 frases)."
    )
    resp = client.chat.completions.create(
        model=CFG.get("llmModel", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": CFG["systemPrompt"]},
            {"role": "user", "content": prompt_user},
        ],
        max_tokens=110,
        temperature=0.75,
    )
    return (resp.choices[0].message.content or "").strip()

async def speak_edge_tts(text: str):
    tmp_mp3 = os.path.join(tempfile.gettempdir(), f"dt_live_{int(time.time()*1000)}.mp3")
    comm = edge_tts.Communicate(text, CFG.get("voiceName", "pt-BR-FranciscaNeural"))
    await comm.save(tmp_mp3)
    await broadcast_overlay({"type": "speaking", "speaking": True, "reply": text})
    try:
        from playsound import playsound
        await asyncio.to_thread(playsound, tmp_mp3)
    except Exception as e:
        print("[Áudio fallback]", e)
        await asyncio.sleep(max(1.5, len(text) * 0.065))
    finally:
        await broadcast_overlay({"type": "speaking", "speaking": False, "reply": ""})
        try:
            os.remove(tmp_mp3)
        except OSError:
            pass

async def worker_loop():
    global LAST_REPLY_AT
    while True:
        author, text, kind = await EVENT_QUEUE.get()
        now = time.time()
        wait = CFG.get("cooldownSec", 6) - (now - LAST_REPLY_AT)
        if wait > 0:
            await asyncio.sleep(wait)
        try:
            reply = await asyncio.to_thread(ask_llm, author, text, kind)
            if reply:
                print(f"[{kind}] {author}: {text} -> {CFG['personaName']}: {reply}")
                await broadcast_overlay({"type": "bubble", "author": author, "question": text, "reply": reply})
                await speak_edge_tts(reply)
                LAST_REPLY_AT = time.time()
        except Exception as e:
            print("[Erro Worker]", e)

async def tikfinity_listener():
    url = CFG.get("tikfinityWsUrl", "ws://localhost:21213/")
    while True:
        try:
            async with websockets.connect(url) as ws:
                print("[TikFinity] Conectado em", url)
                async for raw in ws:
                    pkt = json.loads(raw)
                    ev = pkt.get("event")
                    data = pkt.get("data") or {}
                    author = data.get("nickname") or data.get("uniqueId") or "Viewer"
                    if ev == "chat" and CFG["triggers"].get("comments", True):
                        msg = str(data.get("comment") or "").strip()
                        if len(msg) >= 3 and not EVENT_QUEUE.full():
                            await EVENT_QUEUE.put((author, msg, "COMENTÁRIO"))
                    elif ev == "gift" and CFG["triggers"].get("gifts", True):
                        gift_name = data.get("giftName") or "Presente"
                        if not EVENT_QUEUE.full():
                            await EVENT_QUEUE.put((author, f"enviou um presente {gift_name}!", "PRESENTE"))
        except Exception as e:
            print("[TikFinity reconectando em 4s...]", e)
            await asyncio.sleep(4)

async def main():
    port = int(CFG.get("overlayWsPort", 8765))
    await websockets.serve(overlay_ws_handler, "127.0.0.1", port)
    print(f"[Overlay OBS] WebSocket rodando em ws://127.0.0.1:{port} (cena {CFG['obsSceneName']})")
    await asyncio.gather(worker_loop(), tikfinity_listener())

if __name__ == "__main__":
    asyncio.run(main())
`;

  const obsOverlayHtml = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Overlay Streamer IA — ${personaName}</title>
<style>
  html, body {
    margin: 0; padding: 0; width: 1080px; height: 1920px; overflow: hidden;
    background: transparent; font-family: Inter, system-ui, sans-serif; color: #F8FAFC;
  }
  .hud {
    position: absolute; left: 64px; right: 64px; bottom: 130px;
    background: rgba(9, 13, 24, 0.88); border: 2px solid rgba(56, 189, 248, 0.65);
    border-radius: 26px; padding: 28px 32px; box-shadow: 0 24px 60px rgba(0,0,0,0.55);
  }
  .row { display: flex; align-items: center; gap: 22px; margin-bottom: 16px; }
  .avatar {
    width: 82px; height: 82px; border-radius: 50%; background: linear-gradient(135deg, #38BDF8, #A855F7);
    display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 900;
    transition: transform 0.14s ease, box-shadow 0.14s ease;
  }
  .avatar.speaking { transform: scale(1.1); box-shadow: 0 0 28px rgba(56, 189, 248, 0.85); }
  .name { font-size: 28px; font-weight: 900; color: #38BDF8; }
  .niche { font-size: 19px; color: #CBD5E1; }
  .q { font-size: 22px; color: #FACC15; font-weight: 700; margin-bottom: 10px; }
  .r { font-size: 30px; font-weight: 800; line-height: 1.32; color: #FFFFFF; min-height: 76px; }
</style>
</head>
<body>
<div class="hud">
  <div class="row">
    <div id="av" class="avatar">IA</div>
    <div>
      <div class="name">${personaName}</div>
      <div class="niche">Ao Vivo 24/7 • ${niche}</div>
    </div>
  </div>
  <div id="q" class="q">Aguardando comentários ou presentes no chat...</div>
  <div id="r" class="r"></div>
</div>
<script>
(function connect() {
  const ws = new WebSocket("ws://127.0.0.1:8765");
  ws.onmessage = function(ev) {
    try {
      const msg = JSON.parse(ev.data);
      const av = document.getElementById("av");
      if (msg.type === "bubble") {
        document.getElementById("q").textContent = msg.author + ": " + msg.question;
        document.getElementById("r").textContent = msg.reply;
      }
      if (msg.type === "speaking" && av) {
        av.className = "avatar" + (msg.speaking ? " speaking" : "");
      }
    } catch {}
  };
  ws.onclose = function() { setTimeout(connect, 2500); };
})();
</script>
</body>
</html>`;

  const setupGuideMd = `# Guia Rápido — Kit Streamer IA 24/7 (${personaName})

1. **TikFinity Desktop (Grátis)**: abra o TikFinity no Windows, conecte sua conta TikTok e ative o **WebSocket Server** na porta \`21213\`.
2. **Arquivos locais**: salve \`streamer_config.json\`, \`streamer_bot.py\` e \`obs_overlay.html\` na mesma pasta.
3. **OBS Studio**: na cena **${obsSceneName}** (1080x1920), adicione uma fonte **Browser** apontando para \`obs_overlay.html\`.
4. **Rodar Bot 24/7**:
   \`pip install websockets edge-tts openai playsound==1.2.2\`
   \`python streamer_bot.py\`
5. Todos os comentários${triggerOnGifts ? ' e presentes' : ''} entrarão na fila com cooldown de **${cooldownSec}s** sem pagar créditos externos!`;

  return { configJson, pythonBotScript, obsOverlayHtml, setupGuideMd };
}
