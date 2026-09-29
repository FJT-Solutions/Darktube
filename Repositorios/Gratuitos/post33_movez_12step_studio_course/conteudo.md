# Movez 12-Step Motion Design Studio — O Curso Completo de Engenharia de Vídeo Autônoma

> **Identificação:** Post 33  
> **Autores / Origem:** Movez (@0xMovez)  
> **Modelo de Custo:** `100% Gratuito / Open Source`  
> **Prioridade no Darktube:** `MÁXIMA PRIORIDADE — O MANUAL DEFINITIVO`

---

## 📢 Texto Original da Publicação no X

```text
How to build motion design studio with Opus 5.5 (Full-course).
Most people who try motion design with Opus end up with the same video: centered text on a gradient, everything fading in, a logo at the end. They don't give it a reference, don't give it a render engine, don't ask it to look at its own frames.
This is the 12-step course that turns that mess into a repeatable studio pipeline. The prompt is 10% of the video. The other 90% is the harness.
1. Pixels: model writes a program, not a video (seek(t) determinism).
2. Setup: Node 22+, ffmpeg, python, playwright.
3. House rules: CLAUDE.md render contract.
4. Closed-form springs: track(t, keys) to keep motion continuous.
5. Sound: synthesize cues or measure beats with librosa.
6. Critique loop: render contact sheet, score 1-10, fix worst 3 problems.
```

---

## 🔗 Repositórios & Links de Referência

- **[PDoomVideo GitHub](https://github.com/JohnHeibel/PDoomVideo):** https://github.com/JohnHeibel/PDoomVideo
- **[ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase):** https://github.com/JohnHeibel/ClaudeAnimationBase
- **[claude-animation-skill](https://github.com/buildwithhanif/claude-animation-skill):** https://github.com/buildwithhanif/claude-animation-skill
- **[Battle-of-Austerlitz-Film](https://github.com/WinterArc21/Battle-of-Austerlitz-Film):** https://github.com/WinterArc21/Battle-of-Austerlitz-Film
- **[Artigo Completo Substack](https://movez.substack.com/):** https://movez.substack.com/

---

## 💡 Veredito Técnico & Arquitetura

O documento mais técnico e aprofundado já escrito sobre produção de vídeo por agentes de IA:
1. **Contrato de Renderização Determinística:** A função `seek(t)` deve produzir o exato mesmo pixel para o instante `t`, sem timers ou variáveis aleatórias (`Math.random` banido; usar semente mulberry32).
2. **Molas Fechadas Contínuas:** Em vez de reiniciar animações quando o destino muda, soma-se uma mola por mudança com a função `track()`.
3. **Sound Design Puro:** Síntese de áudio procedural em Node/Python (`sfx.mjs`).
4. **Critique Loop com Folhas de Contato:** A IA analisa as imagens que renderizou e só entrega se todas as notas forem 8+.

---

## 🚀 Aplicação Prática no Darktube

Este curso é o manual arquitetural mestre para o servidor de renderização do Darktube. Implementamos a matemática das molas contínuas e o gerador de SFX procedural direto em nosso ecossistema.

---

## 💻 Código de Referência & Implementação

```tsx
// Matemática de Molas Amortecidas Fechadas e Função track() do Curso Movez
export function spring(t: number, k = 170, d = 26): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k);
  const z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// track(): permite que um elemento mude de alvo várias vezes sem solavancos
export function track(t: number, keys: [number, number][], k = 170, d = 26): number {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], k, d);
  }
  return v;
}
```
