# Infinite Zoom Portal Loop — As 4 Regras do Zoom Logarítmico Contínuo sem Cortes

> **Identificação:** Post 31  
> **Autores / Origem:** oVictor (@ovictor)  
> **Modelo de Custo:** `100% Gratuito / Matemática e CSS Puro`  
> **Prioridade no Darktube:** `ALTA PRIORIDADE — VIRALIDADE EXTREMA`

---

## 📢 Texto Original da Publicação no X

```text
Dei zoom num celular até o núcleo do átomo. Sem nenhum corte. Mesa → tela → pixel → transistor → silício → átomo. E o núcleo devolve a mesa. Fiz em código, com Claude + Remotion. O truque cabe em 4 regras:
1. cada cena tem um "portal" no centro
2. a próxima cena mora dentro dele
3. a câmera só dá zoom, em escala logarítmica, nunca corta
4. a última cena contém a primeira, e vira loop
```

---

## 🔗 Repositórios & Links de Referência

- **[oVictor Post Original](https://x.com/ovictor/status/2104886910078402667):** https://x.com/ovictor/status/2104886910078402667

---

## 💡 Veredito Técnico & Arquitetura

Uma das técnicas mais hipnóticas de retenção visual nas redes sociais:
* Elimina a fadiga de cortes convencionais.
* Usa a fórmula matemática `scale = Math.pow(zoomBase, progress)` para manter a velocidade perceptiva constante ao longo de ordens de magnitude diferentes (do macroscópico ao atômico).
* Transforma o final no início, criando um loop infinito natural no TikTok/Reels.

---

## 🚀 Aplicação Prática no Darktube

Criar uma composição especializada no Darktube chamada `<InfiniteZoomLoop>`, perfeita para canais de ciência, curiosidades, história e filosofia.

---

## 💻 Código de Referência & Implementação

```tsx
// As 4 Regras do Zoom Logarítmico Infinito em Remotion
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const InfiniteZoomScene = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Escala Logarítmica: de 1x até 100x de zoom contínuo
  const progress = frame / durationInFrames;
  const zoomScale = Math.pow(10, progress * 2); // 1x -> 100x

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      {/* Camada 1: Cena Macro */}
      <div style={{ transform: `scale(${zoomScale})`, position: 'absolute' }}>
        <div style={{ width: 600, height: 600, border: '4px solid #38BDF8', borderRadius: 32 }}>
          {/* Portal Central para a Próxima Cena */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 60, height: 60, backgroundColor: '#EAB308' }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
```
