# OpenClaw + Remotion — Brand Scraping Autônomo com Geração e Edição Instantânea

> **Identificação:** Post 22  
> **Autores / Origem:** Riley Brown (@rileybrown)  
> **Modelo de Custo:** `100% Gratuito / Open Source`  
> **Prioridade no Darktube:** `ALTA PRIORIDADE — AUTOMATIZAÇÃO DE ASSETS`

---

## 📢 Texto Original da Publicação no X

```text
I spent 5 hours today making OpenClaw even better at Motion Graphics. I created the video below in 2 prompts with no asset uploads. It scraped or generated everything from a text prompt. I've added: better brand scraping, image generation, video generation, music generation and scraping, better transitions on first prompt, basically zero errors, always outputs a link to the editor so I can open it from any device...
```

---

## 🔗 Repositórios & Links de Referência

- **[Riley Brown Post](https://x.com/rileybrown/status/2029031830855532627):** https://x.com/rileybrown/status/2029031830855532627
- **[Freemotion App](https://freemotion.app):** https://freemotion.app

---

## 💡 Veredito Técnico & Arquitetura

O fluxo mais eficiente para criar anúncios de empresas sem pedir nenhum arquivo ao cliente:
1. O agente recebe apenas a URL do site da marca.
2. O Playwright acessa a página, extrai automaticamente o Logo em SVG, a paleta de cores primária e secundária, as fontes tipográficas e screenshots dos produtos.
3. O Remotion compõe o vídeo usando esses elementos originais sem nenhuma arte fictícia.

---

## 🚀 Aplicação Prática no Darktube

Implementar uma ferramenta de `Brand Scraper` no Darktube: o usuário digita a URL do seu produto e o Darktube preenche automaticamente as cores, logo e screenshots na composição do vídeo.

---

## 💻 Código de Referência & Implementação

```tsx
// Brand Scraper com Playwright para Extrair Identidade Visual da Marca
import { chromium } from 'playwright';

export async function scrapeBrandIdentity(url: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  const brand = await page.evaluate(() => {
    const computed = window.getComputedStyle(document.body);
    const primaryColor = computed.getPropertyValue('--primary') || '#EAB308';
    const logoImg = document.querySelector('header img, nav img')?.getAttribute('src');
    const title = document.title;
    return { primaryColor, logoImg, title };
  });

  await browser.close();
  return brand;
}
```
