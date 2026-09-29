# Remotion × HyperFrames — Arquitetura de Meta-Prompt e Roteamento Híbrido

> **Identificação:** Post 4 e Post 5  
> **Autores / Origem:** Taiga (@taiga_aii)  
> **Modelo de Custo:** `100% Gratuito / Open Source (MIT / Apache)`  
> **Prioridade no Darktube:** `ALTA PRIORIDADE — ARQUITETURA MULTI-ENGINE`

---

## 📢 Texto Original da Publicação no X

```text
Editor de vídeo é coisa do passado, kkkwww Comparei o Remotion e o HyperFrames, os AIs mais recentes para edição de vídeo, mas ambos têm desempenho alto demais. Além disso, o preço é grátis, dá pra fazer um vídeo em 10 a 15 minutos por peça. Vou deixar o prompt aqui também: Mapa de rotas tridimensional, Relatório de Vendas, Produto comercial, Estilo interruptor de Pitágoras.

# 汎用メタプロンプト：Remotion × HyperFrames 動画比較制作
以下の入力欄を埋め、このメタプロンプト全体を動画制作エージェントへ渡してください。お題固有の演出を先に決めすぎず、共通の事実・目的・素材だけを両実装へ渡し、それぞれの得意な表現を引き出します。
```

---

## 🔗 Repositórios & Links de Referência

- **[HyperFrames GitHub](https://github.com/heygen-com/hyperframes):** https://github.com/heygen-com/hyperframes
- **[Meta-Prompt Post](https://x.com/taiga_aii/status/2084224730211758176):** https://x.com/taiga_aii/status/2084224730211758176

---

## 💡 Veredito Técnico & Arquitetura

Remotion e HyperFrames não são concorrentes excludentes, mas sim complementares:
* **Quando usar Remotion:** Vídeos verticais virais (Reels/TikTok), legendas sincronizadas palavra a palavra (karaoke com spring physics), cutouts 2.5D com remoção de fundo e layouts de alta densidade visual.
* **Quando usar HyperFrames:** Vídeos baseados em GSAP puro e HTML, gráficos de barras/linhas que se desenham em tempo real, transições com aberrações de luz (light leak) e relatórios corporativos.
* **Meta-Prompt do Taiga:** Padroniza a entrada de dados (fatos, objetivo, materiais) e deixa o AI Engine Selector escolher a engine ideal para cada cena.

---

## 🚀 Aplicação Prática no Darktube

Já implementamos o switch inteligente no n8n (`Route to Engine`), onde o `AI Agent — Engine Selector` avalia o roteiro e despacha para a porta `3001` (Remotion) ou `3002` (HyperFrames). O meta-prompt do Taiga foi incorporado na íntegra no prompt de sistema desse nó.

---

## 💻 Código de Referência & Implementação

```tsx
// Meta-Prompt Schema do Taiga adaptado para o Darktube JSON Payload
{
  "project": "Darktube Video Production",
  "topic": "Psicologia da Atenção",
  "enginePreference": "auto", // 'remotion' | 'hyperframes' | 'auto'
  "scenes": [
    {
      "index": 0,
      "caption": "Você está perdendo o controle do seu foco.",
      "emotion": "urgency",
      "visualIntent": "glitch-shock",
      "recommendedEngine": "remotion" // Karaokê explosivo
    },
    {
      "index": 1,
      "caption": "Em 2000 o foco médio era de 12 segundos. Hoje são 8.",
      "emotion": "analytical",
      "visualIntent": "bar-chart-infographic",
      "recommendedEngine": "hyperframes" // Gráfico vetorial GSAP
    }
  ]
}
```
