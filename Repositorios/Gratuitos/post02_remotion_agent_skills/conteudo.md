# Remotion Agent Skills 2.0 — Criação Autônoma com Claude Code e APIs Simplificadas

> **Identificação:** Post 2, Post 3 e Post 8  
> **Autores / Origem:** Jonny Burger (@JNYBGR / @Remotion)  
> **Modelo de Custo:** `100% Gratuito / Open Source (MIT)`  
> **Prioridade no Darktube:** `MÁXIMA PRIORIDADE — OFICIAL`

---

## 📢 Texto Original da Publicação no X

```text
Remotion agora tem Habilidades de Agente - crie vídeos apenas com Claude Code! $ npx skills add remotion-dev/skills Esta animação foi criada apenas com um prompt.

Aqui está como criamos o vídeo acima! Histórico completo do prompt: https://gist.github.com/JonnyBurger/5b801182176f1b76447901fbeb5a84ac

Melhores habilidades para vídeos melhores! Habilidades Remotion 2.0: • Sub-habilidades • Interativo • Neutro em termos de gosto.
Primeiro de tudo, é verdade - a marcação do Remotion não era intuitiva. Iteramos nossas APIs principais e as simplificamos bastante, para humanos e para agentes.
As habilidades agora geram código que você pode editar interativamente em nosso Studio. Ajuste manualmente antes de continuar iterando com um agente.
/remotion-best-practices agora é apenas um roteador para outras habilidades: /remotion-create, /remotion-render, /remotion-markup, /remotion-maps.
```

---

## 🔗 Repositórios & Links de Referência

- **[Remotion Agent Skills](https://github.com/remotion-dev/skills):** https://github.com/remotion-dev/skills
- **[Prompt History Gist](https://gist.github.com/JonnyBurger/5b801182176f1b76447901fbeb5a84ac):** https://gist.github.com/JonnyBurger/5b801182176f1b76447901fbeb5a84ac
- **[Documentação Oficial](https://remotion.dev/skills):** https://remotion.dev/skills

---

## 💡 Veredito Técnico & Arquitetura

O ecossistema oficial do Remotion lançou um conjunto de Agent Skills que padroniza como IAs (Claude, GPT, Gemini) devem programar vídeo:
1. **Sub-habilidades Modulares:** Em vez de carregar toda a documentação, carrega apenas o roteador (`remotion-best-practices`) e skills específicas (`remotion-markup`, `remotion-render`).
2. **APIs Inline Declarativas:** Evita strings complexas de `transform`; incentiva `scale`, `translate`, `rotate` direto nos estilos CSS.
3. **Compatibilidade com Remotion Studio:** Os componentes gerados são `Interactive`, permitindo ajuste fino visual no navegador.

---

## 🚀 Aplicação Prática no Darktube

O Darktube já possui essas skills mapeadas na pasta `.agents/skills/`. O ganho aqui é aplicar as convenções do Remotion 2.0 (como `linearTiming`, `interpolate` inline e `TransitionSeries`) em todas as nossas composições de `scripts/remotion-server/remotion`.

---

## 💻 Código de Referência & Implementação

```tsx
// Padrão Remotion 2.0 para Agentes (Inline Interpolation & Easing)
import { interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

export const ViralBadge = ({ text }: { text: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        scale: interpolate(frame, [0, 20], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.spring({ damping: 15, mass: 0.8, stiffness: 150 }),
          output: 'perceptual-scale',
        }),
        opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }),
        backgroundColor: '#EAB308',
        color: '#000000',
        padding: '12px 28px',
        borderRadius: '999px',
        fontWeight: 800,
        fontSize: 28,
        boxShadow: '0 10px 25px rgba(234, 179, 8, 0.4)',
      }}
    >
      {text}
    </div>
  );
};
```
