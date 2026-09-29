# Video-Production-Skills — Repositório de Habilidades para Automação de Vídeos

> **Identificação:** Post 12  
> **Autores / Origem:** Pluviobyte (@Pluvio9yte)  
> **Modelo de Custo:** `100% Gratuito / Open Source (MIT)`  
> **Prioridade no Darktube:** `ALTA PRIORIDADE — TEMPLATES`

---

## 📢 Texto Original da Publicação no X

```text
Se você não sabe fazer vídeos, não sabe editar, então não precisa aprender por enquanto. Eu abri o código-fonte de um repositório completo de habilidades de produção de vídeo, para recriar vídeos no estilo hyperframes/remotion. Ao mesmo tempo, vem acompanhado de uma série de habilidades de produção de vídeo que são atualizadas continuamente. Atualmente, já há uma habilidade no estilo de digitação com fundo preto e texto branco. Endereço: https://github.com/Pluviobyte/video-production-skills
```

---

## 🔗 Repositórios & Links de Referência

- **[GitHub Oficial](https://github.com/Pluviobyte/video-production-skills):** https://github.com/Pluviobyte/video-production-skills
- **[Post Original](https://x.com/Pluvio9yte/status/2070403040738500667):** https://x.com/Pluvio9yte/status/2070403040738500667

---

## 💡 Veredito Técnico & Arquitetura

Repositor de prompts estruturados e componentes para criar estilos minimalistas de alta retenção no TikTok e YouTube Shorts:
* **Estilo Typewriter:** Texto datilografado com som sutil de máquina em fundo escuro com vinheta.
* **Estilo Monocromático:** Foco 100% na mensagem sem distrações visuais artificiais, ideal para citações estoicas, frases de impacto e reflexões.

---

## 🚀 Aplicação Prática no Darktube

Usar esses templates minimalistas nas produções automáticas rápidas do Darktube, gerando vídeos em menos de 40 segundos com baixíssimo consumo de CPU.

---

## 💻 Código de Referência & Implementação

```tsx
// Efeito Typewriter com Cursor Piscante (Pluviobyte Pattern)
import { AbsoluteFill, useCurrentFrame } from 'remotion';

export const MinimalTypewriter: React.FC<{ fullText: string; charsPerSecond?: number }> = ({ fullText, charsPerSecond = 24 }) => {
  const frame = useCurrentFrame();
  const charsToShow = Math.floor((frame / 30) * charsPerSecond);
  const displayedText = fullText.slice(0, charsToShow);
  const showCursor = Math.floor(frame / 12) % 2 === 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <p style={{ fontFamily: 'Courier New, monospace', fontSize: 52, color: '#FAFAFA', lineHeight: 1.5, textAlign: 'left', width: '100%' }}>
        {displayedText}
        <span style={{ color: '#EAB308', opacity: showCursor ? 1 : 0 }}>▌</span>
      </p>
    </AbsoluteFill>
  );
};
```
