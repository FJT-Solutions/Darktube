# Video-Shotcraft — O Framework Definitivo de Takes Cinematográficos para Remotion

> **Identificação:** Post 1 e Post 19  
> **Autores / Origem:** Vincentwei1021 (@VincentWei93) / nini (@nini_incrypto_)  
> **Modelo de Custo:** `100% Gratuito / Open Source (MIT)`  
> **Prioridade no Darktube:** `MÁXIMA PRIORIDADE — FUNDACIONAL`

---

## 📢 Texto Original da Publicação no X

```text
Recentemente, pesquisei uma skill que pode gerar vídeos de animação com qualidade semelhante a trailers de lançamento de produtos. Há algum tempo, estive experimentando o plugin Remotion + código Claude, mas os efeitos de vídeo estavam basicamente no nível de animações de PPT. Sem movimento de câmera, sem transições, sem efeitos sonoros, sem efeitos de animação suficientemente ricos. Por isso, abri o código desta skill video-shotcraft: https://github.com/Vincentwei1021/video-shotcraft

video-shotcraft, uma skill que deixa o agente te ajudar a criar vídeos de produto com sensação de cinema, fornecendo 106 cartas de fórmulas de takes, 162 estilos, 161 clipes de amostra dinâmicos e templates de vídeos finalizados já aprovados. Claude Code / Codex podem ser usados. Entregue seu produto pra ele, e ele vai usar Remotion pra completar o storyboarding, animação e design de som, produzindo um vídeo promocional / de marketing / de lançamento / de demonstração de funcionalidades com vibe de cinema — incluindo capturas de tela reais de páginas, movimentos de câmera 2.5D, cortes no ritmo e SFX de nível cinematográfico tudo incluso.
```

---

## 🔗 Repositórios & Links de Referência

- **[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft):** https://github.com/Vincentwei1021/video-shotcraft

---

## 💡 Veredito Técnico & Arquitetura

O maior problema das gerações comuns de Remotion por LLMs é o visual 'estático de PowerPoint' (título entra, fade in, troca de imagem estática). O **video-shotcraft** resolve isso fornecendo uma taxonomia profissional de direção cinematográfica:
1. **106 Cartas de Fórmulas de Takes:** Combinações prontas de enquadramento, ângulo de câmera e velocidade.
2. **162 Estilos de Animação:** Transições dinâmicas, kinetic typography, 3D tilts e camadas 2.5D.
3. **Sound Design Integrado:** Cues precisos de SFX (impact, whoosh, click, riser) ancorados na linha do tempo do Remotion.

---

## 🚀 Aplicação Prática no Darktube

Integrar as diretrizes do video-shotcraft diretamente no prompt dos nossos agentes diretores no n8n (`AI Agent — Director Remotion`). Isso garante que os roteiros gerados pelo Gemini/OpenAI especifiquem takes cinematográficos com física de molas (`spring()`), câmeras 2.5D e efeitos sonoros sincronizados em cada cena.

---

## 💻 Código de Referência & Implementação

```tsx
// Exemplo de Take Cinematográfico 2.5D (Video-Shotcraft Pattern em Remotion)
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const ShotcraftHeroShot: React.FC<{ imageUrl: string; headline: string }> = ({ imageUrl, headline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Movimento de câmera com mola amortecida de alta inércia
  const cameraZoom = spring({ frame, fps, config: { damping: 200, mass: 2, stiffness: 80 } });
  const scale = interpolate(cameraZoom, [0, 1], [1.15, 1.0]);
  const rotateX = interpolate(frame, [0, 90], [8, 0], { extrapolateRight: 'clamp' });
  const translateY = interpolate(cameraZoom, [0, 1], [40, 0]);

  // Texto com revelação em máscara de corte (Clip Wipe)
  const textProgress = interpolate(frame, [15, 45], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ perspective: 1200, backgroundColor: '#070B19', overflow: 'hidden' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${scale}) rotateX(${rotateX}deg) translateY(${translateY}px)`,
          transformOrigin: 'center center',
          filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.8))',
        }}
      >
        <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="hero" />
      </div>

      <div style={{ position: 'absolute', bottom: 180, left: 60, right: 60 }}>
        <h1
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 72,
            fontWeight: 900,
            color: '#FFFFFF',
            clipPath: `polygon(0 0, ${textProgress}% 0, ${textProgress}% 100%, 0 100%)`,
            textShadow: '0 4px 20px rgba(0,0,0,0.9)',
          }}
        >
          {headline}
        </h1>
      </div>
    </AbsoluteFill>
  );
};
```
