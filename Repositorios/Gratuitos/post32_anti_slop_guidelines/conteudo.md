# Anti-Slop Motion Design Rules — Como Eliminar o Padrão Genérico de Vídeos de IA

> **Identificação:** Post 32  
> **Autores / Origem:** Kenny1st (@0xKenny1st) / Movez (@0xMovez)  
> **Modelo de Custo:** `100% Gratuito / Regras de Engenharia de Prompt`  
> **Prioridade no Darktube:** `MÁXIMA PRIORIDADE — PADRÃO DE QUALIDADE`

---

## 📢 Texto Original da Publicação no X

```text
a maioria dos gráficos em movimento do Opus 5.5 parece um template: texto centralizado, gradiente, fade in, logo no final. Isto é o que acontece quando você realmente dá a ele uma referência e um estilo em vez disso.

Banned defaults: centered title on gradient, everything fading in, corner labels and frame borders, glow on UI chrome, generic particle bursts. One display face, one UI face. One accent color unless the brief says otherwise. Every 2 to 4 seconds something new must happen on screen.
```

---

## 🔗 Repositórios & Links de Referência

- **[Kenny1st Post](https://x.com/0xKenny1st/status/2104655797623906497):** https://x.com/0xKenny1st/status/2104655797623906497

---

## 💡 Veredito Técnico & Arquitetura

Define o padrão profissional que separa vídeos amadores feitos por IA de vídeos que parecem produzidos por um estúdio de design humano:
* Proíbe terminantemente: textos centralizados flutuando sobre degradê azul/roxo genérico.
* Exige: hierarquia tipográfica clara, contraste de pesos, movimentos de câmera fundamentados em física e novidade visual a cada 2 a 4 segundos.

---

## 🚀 Aplicação Prática no Darktube

Fixar essas restrições como regras invioláveis no prompt do `AI Agent — Director Remotion` do Darktube.

---

## 💻 Código de Referência & Implementação

```tsx
// Prompt de Bloqueio de Slop Visual para Agentes Darktube
export const ANTI_SLOP_INSTRUCTIONS = `
REGRAS ANTI-SLOP (OBRIGATÓRIO SEGUIR):
1. PROIBIDO: Título centralizado com degradê no fundo e fade-in simples.
2. PROIBIDO: Bordas decorativas de moldura nos cantos e etiquetas genéricas.
3. PROIBIDO: Explosões genéricas de partículas e brilho (glow) excessivo.
4. OBRIGATÓRIO: A cada 2 a 4 segundos, algo NOVO deve acontecer (corte, zoom, entrada de dado).
5. OBRIGATÓRIO: Use apenas 1 cor de destaque (accent color). O resto deve ser neutro elegante.
`;
```
