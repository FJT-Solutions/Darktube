# Slidev + Remotion — Apresentações em Markdown Transformadas em Motion Graphics

> **Identificação:** Post 25  
> **Autores / Origem:** Fade (@Fade_networker) / MadeWithVueJS (@MadeWithVueJS)  
> **Modelo de Custo:** `100% Gratuito / Open Source (MIT)`  
> **Prioridade no Darktube:** `MÉDIA PRIORIDADE — ROTEIRIZAÇÃO EM MARKDOWN`

---

## 📢 Texto Original da Publicação no X

```text
The web-based slides maker & presenter @Slidevjs is built with Vue by @antfu7! Author presentations in markdown and add Vue components to include interactive demos.
I use this with remotion to actually build motion graphic for my project.
```

---

## 🔗 Repositórios & Links de Referência

- **[Slidev](https://sli.dev/):** https://sli.dev/
- **[Post Original](https://x.com/Fade_networker/status/2104971857816436753):** https://x.com/Fade_networker/status/2104971857816436753

---

## 💡 Veredito Técnico & Arquitetura

O formato Markdown permite escrever apresentações com diagramas e blocos de código com facilidade. Integrar esse conceito com o Remotion permite converter slides estáticos em apresentações dinâmicas animadas em 60 fps.

---

## 🚀 Aplicação Prática no Darktube

Permitir que usuários do Darktube colem um texto em Markdown puro e o sistema converta cada `---` em uma cena animada com tipografia cinematográfica.

---

## 💻 Código de Referência & Implementação

```tsx
// Parser de Markdown para Cenas do Remotion
export function parseMarkdownToScenes(mdText: string) {
  const rawSlides = mdText.split(/^---$/m);
  return rawSlides.map((slide, idx) => ({
    index: idx,
    content: slide.trim(),
    durationSeconds: 5,
  }));
}
```
