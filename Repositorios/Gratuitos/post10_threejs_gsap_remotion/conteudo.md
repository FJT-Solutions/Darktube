# Three.js + GSAP + Remotion — A Tríade que Substitui o After Effects

> **Identificação:** Post 10  
> **Autores / Origem:** deadrabbbbit (@deadrabbbbit)  
> **Modelo de Custo:** `100% Gratuito / Open Source (MIT)`  
> **Prioridade no Darktube:** `ALTA PRIORIDADE — 3D GENERATIVO`

---

## 📢 Texto Original da Publicação no X

```text
Threejs + Gsap + Remotion = After Effect
what does Remotion do that GSAP can't?
Remotion can render animations into videos.
Remotion is gold! It's been so useful doing 3D work. We used it once to pre-generate thousands of images of generative artwork made in there fiber, I love it.
```

---

## 🔗 Repositórios & Links de Referência

- **[Three.js](https://threejs.org/):** https://threejs.org/
- **[React Three Fiber](https://r3f.docs.pmnd.rs/):** https://r3f.docs.pmnd.rs/
- **[Post Original](https://x.com/deadrabbbbit/status/1829415091478938084):** https://x.com/deadrabbbbit/status/1829415091478938084

---

## 💡 Veredito Técnico & Arquitetura

O After Effects renderiza camadas 2D/3D proprietárias com scripts lentos em ExtendScript. A combinação de:
1. **Three.js / React Three Fiber:** Cria malhas 3D, iluminação volumétrica, materiais metálicos e partículas espaciais com WebGL.
2. **GSAP:** Orquestra transições com precisão matemática em linha do tempo.
3. **Remotion:** Captura cada quadro WebGL sincronizado com o clock do vídeo e codifica em MP4 de alta taxa de bits.

---

## 🚀 Aplicação Prática no Darktube

Permite ao Darktube incluir fundos 3D dinâmicos (buracos negros, moedas girando, partículas de dados, esferas de energia) sem precisar de renderizadores externos como Blender ou Cinema4D.

---

## 💻 Código de Referência & Implementação

```tsx
// Cena 3D Generativa em Remotion com Three.js / Canvas
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React, { useRef, useEffect } from 'react';

export const ThreeJSSpherePortal = () => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Renderização generativa matemática 3D projetada em 2D
    ctx.clearRect(0, 0, 1080, 1920);
    const particles = 80;
    const radius = 300 + Math.sin(frame * 0.05) * 40;

    for (let i = 0; i < particles; i++) {
      const angle = (i / particles) * Math.PI * 2 + frame * 0.02;
      const x = 540 + Math.cos(angle) * radius;
      const y = 960 + Math.sin(angle) * (radius * 0.6);

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#38BDF8' : '#EAB308';
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fill();
    }
  }, [frame]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05070E' }}>
      <canvas ref={canvasRef} width={1080} height={1920} style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  );
};
```
