# Apple-Style Promo & Product Motion — Anúncios Minimalistas de Alta Classe

> **Identificação:** Post 21 e Post 27  
> **Autores / Origem:** Sac (@Saccc_c) / KazzySax (@saxxyweb3)  
> **Modelo de Custo:** `100% Gratuito / Código Puro`  
> **Prioridade no Darktube:** `ALTA PRIORIDADE — ESTÉTICA PREMIUM`

---

## 📢 Texto Original da Publicação no X

```text
Codex + HyperFrame / Remotion está devorando editores de vídeo. Fazer vários vídeos do zero com código puro, caramba, é bom demais. Abaixo está o vídeo promocional da Apple que eu fiz: curto ranking de bilheteria, o agente baixa clipes e o Remotion cuida da conexão de animações e arranjo.

Aqui, Opus 5.5 and Remotion skills for animated motion designs on product. Motion designers are cooked.
```

---

## 🔗 Repositórios & Links de Referência

- **[Sac Post Original](https://x.com/Saccc_c/status/2051145377865204222):** https://x.com/Saccc_c/status/2051145377865204222
- **[KazzySax Post](https://x.com/saxxyweb3/status/2104961677963690124):** https://x.com/saxxyweb3/status/2104961677963690124

---

## 💡 Veredito Técnico & Arquitetura

A estética 'Apple Keynote':
* Fundo limpo, iluminação suave, foco em um produto ou número por vez.
* Animações de mola com overshoot sutil (física realista).
* Eliminação de elementos espalhafatosos (sem partículas brilhantes, sem degradês cafonas).

---

## 🚀 Aplicação Prática no Darktube

Criar um modo de template oficial no Darktube chamado `Apple Minimalist`, voltado para produtos de alta renda e lançamentos B2B.

---

## 💻 Código de Referência & Implementação

```tsx
// Estilo Apple Keynote (Tipografia em Alta Fidelidade no Remotion)
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const AppleKeynoteMetric: React.FC<{ numberText: string; caption: string }> = ({ numberText, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 24, mass: 1.5, stiffness: 100 } });
  const opacity = interpolate(frame, [0, 15], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
      <h1
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          fontSize: 160,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #A1A1AA 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          transform: `scale(${scale})`,
          opacity,
          margin: 0,
        }}
      >
        {numberText}
      </h1>
      <p style={{ fontFamily: 'sans-serif', fontSize: 36, color: '#71717A', marginTop: 24, fontWeight: 500 }}>
        {caption}
      </p>
    </AbsoluteFill>
  );
};
```
