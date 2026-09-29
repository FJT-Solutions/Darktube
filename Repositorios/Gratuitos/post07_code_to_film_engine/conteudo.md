# Filme Animado em Puro Código — 7.400 Linhas de React/TS + SVG + Áudio Sintetizado

> **Identificação:** Post 7, Post 11 e Post 28  
> **Autores / Origem:** Chubby (@kimmonismus) / minos (@minosdevs)  
> **Modelo de Custo:** `100% Gratuito / Custo de API ~$0.20 por filme completo`  
> **Prioridade no Darktube:** `ALTA PRIORIDADE — PRODUÇÃO AUTÔNOMA`

---

## 📢 Texto Original da Publicação no X

```text
Queria criar rapidamente um vídeo curto com o Opus 5.5 sobre a história da IA, de 'Attention is all you need' a AGI. Sem imagens de estoque, sem geradores de imagens ou vídeos: cada quadro é renderizado a partir de código. Este filme de 3 minutos foi feito 100% em código pelo Claude no Claude Code: ~7.400 linhas de React/TypeScript (Remotion), cada imagem desenhada em SVG e Canvas, uma voz TTS de código aberto e uma trilha sonora sintetizada em Python. Sem imagens de estoque. Sem geradores de imagens. Levou cerca de 1h e 7% de taxas semanais.

Parem de usar o Claude para fazer vídeos para seus SaaS que nunca vão vender: 1. Façam vídeos com temas educativos usando Opus 5.5 + Remotion + Three.js + GPT-image-2 (0,2 $ por vídeo) 2. Encham o YouTube com suas criações 3. Ganhem dinheiro passivo $$$.
```

---

## 🔗 Repositórios & Links de Referência

- **[Kimmonismus Post](https://x.com/kimmonismus/status/2102844654169575547):** https://x.com/kimmonismus/status/2102844654169575547
- **[Minos Devs Post](https://x.com/minosdevs/status/2104959910903464200):** https://x.com/minosdevs/status/2104959910903464200

---

## 💡 Veredito Técnico & Arquitetura

Demonstra a maturidade do paradigma **Code-as-Video**:
* Vídeos explicativos de 3 a 5 minutos podem ser 100% desenhados usando primitivas geométricas, vetores SVG animados e shaders de Canvas.
* Custo quase zero: dispensa assinaturas de Midjourney, Runway, Pika ou Luma para cada cena.
* Resolução infinita: vetores SVG são renderizados nativamente em 4K sem pixelização.

---

## 🚀 Aplicação Prática no Darktube

Permite ao Darktube produzir canais inteiros de documentários, finanças e tecnologia sem gastar nenhum centavo com geração de imagens por IA, utilizando animações vetoriais programáticas geradas pela LLM.

---

## 💻 Código de Referência & Implementação

```tsx
// Diagrama de Transformer em SVG Animado (Padrão Kimmonismus para Remotion)
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const TransformerAttentionBlock = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const blocks = ['Input Embedding', 'Multi-Head Attention', 'Feed Forward', 'Output Probabilities'];

  return (
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ backgroundColor: '#0A0A0B' }}>
      <defs>
        <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>

      {blocks.map((name, i) => {
        const delay = i * 20;
        const progress = spring({ frame: frame - delay, fps, config: { damping: 16 } });
        const y = 1400 - i * 260;
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const width = interpolate(progress, [0, 1], [0, 600]);

        return (
          <g key={name} transform={`translate(${540 - width / 2}, ${y})`} opacity={opacity}>
            <rect width={width} height="120" rx="24" fill="url(#neonGlow)" filter="drop-shadow(0 0 20px rgba(56,189,248,0.3))" />
            <text x={width / 2} y="72" fill="#FFFFFF" textAnchor="middle" fontSize="32" fontWeight="700" fontFamily="sans-serif">
              {name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
```
