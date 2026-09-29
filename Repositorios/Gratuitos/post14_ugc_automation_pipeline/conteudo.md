# Pipeline de UGC Automatizado — Hooks JSON + Remotion Render Variations

> **Identificação:** Post 14  
> **Autores / Origem:** André Felipe Souza (@AndrFelipe45548)  
> **Modelo de Custo:** `100% Gratuito / Arquitetura Open Source`  
> **Prioridade no Darktube:** `MÁXIMA PRIORIDADE — DARK CLIPS & ANÚNCIOS`

---

## 📢 Texto Original da Publicação no X

```text
Acabei de automatizar meu sistema de criacao de UGC, e foi mais facil do que parece… (o video ai é um dos resultados) Coloquei entradas, como a demo do app ja editada pelo proprio claude com remotion, e tbm videos de UGC e os hooks em um json… dai mostrei pra ele como queria o resultado final, a gente fez alguns de teste, ajustamos o render do remotion pra ficar no jeito, entao… ele criou um alias que eu rodo no terminal que gera o render com o video que tiver na entrada + todos os hooks (3 hooks = 3 videos) + demo app. Voila, agr basta eu ficar alimentando com novos hooks e ugcs!
```

---

## 🔗 Repositórios & Links de Referência

- **[Post Original](https://x.com/AndrFelipe45548/status/2103162218430759163):** https://x.com/AndrFelipe45548/status/2103162218430759163

---

## 💡 Veredito Técnico & Arquitetura

O modelo industrial de produção de anúncios e criativos para TikTok/Meta Ads:
* Em vez de renderizar um vídeo por vez, o sistema recebe 1 vídeo base (demonstração de produto ou take falado) e uma lista de 5 a 10 hooks de abertura em JSON.
* O Remotion concatena dinamicamente cada hook com a demonstração e renderiza todas as variantes automaticamente em lote.

---

## 🚀 Aplicação Prática no Darktube

Integrar diretamente na funcionalidade **Dark Clips** do Darktube. O usuário fornece um corte e o Darktube gera 5 variações com ganchos diferentes para testar qual tem maior retenção nas redes sociais.

---

## 💻 Código de Referência & Implementação

```tsx
// Variação de Hooks UGC em Lote (Remotion Dynamic Composition)
import { Composition } from 'remotion';
import { UGCContainer } from './UGCContainer';

export const UGCMultiHookRoot = ({ hooks, baseVideoUrl }: { hooks: string[]; baseVideoUrl: string }) => {
  return (
    <>
      {hooks.map((hookText, index) => (
        <Composition
          key={index}
          id={`UGC_Variant_${index + 1}`}
          component={UGCContainer}
          durationInFrames={30 * 45} // 45s
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{ hookText, baseVideoUrl }}
        />
      ))}
    </>
  );
};
```
