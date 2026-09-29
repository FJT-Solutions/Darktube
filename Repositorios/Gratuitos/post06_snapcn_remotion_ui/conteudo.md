# Snapcn & Remotion UI — O shadcn/ui do Motion Design para Remotion

> **Identificação:** Post 6, Post 15 e Post 24  
> **Autores / Origem:** Snapcn (@snapcndev) / Nett0 (@nett0eth) / Riazul Islam (@riaz_exorous)  
> **Modelo de Custo:** `100% Gratuito / Open Source (MIT)`  
> **Prioridade no Darktube:** `ALTA PRIORIDADE — DESIGN SYSTEM`

---

## 📢 Texto Original da Publicação no X

```text
esse repositório aqui está em outro nível e é tudo de graça: 20 componentes de Remotion, prontos pra copiar e colar no teu projeto: título animado, logo sting e mockup de tela. roda com um comando CLI sem conta, sem chave, sem plano pago link no 1º comentário | salva: https://snapcn.dev

Encontrei o shadcn/ui para Remotion. O vídeo promocional já parece bom com a combinação deste.
Building https://remotionui.com for Remotion users.
```

---

## 🔗 Repositórios & Links de Referência

- **[Snapcn Dev](https://snapcn.dev):** https://snapcn.dev
- **[RemotionUI](https://remotionui.com):** https://remotionui.com
- **[GitHub Oficial](https://github.com/snapcndev/snapcn):** https://github.com/snapcndev/snapcn

---

## 💡 Veredito Técnico & Arquitetura

Assim como o `shadcn/ui` revolucionou o desenvolvimento web tradicional (código aberto que você copia e cola diretamente no seu projeto sem pacotes engessados), o **Snapcn** e o **RemotionUI** criaram a mesma filosofia para Motion Design:
* Componentes de títulos com tipografia cinética refinada.
* Logo Stings profissionais com explosão de luz e reflexos.
* Mockups realistas de iPhone, iPad e Telas de MacBook animadas com rotação 3D e scroll fluido.
* 100% personalizáveis via props em Tailwind CSS e CSS Vanilla.

---

## 🚀 Aplicação Prática no Darktube

Adicionar os 20 componentes do Snapcn na pasta `scripts/remotion-server/remotion/components/ui/`, permitindo que o nosso gerador monte cenas comerciais e de produtos em segundos apenas referenciando `<DeviceMockup>`, `<KineticTitle>` e `<LogoSting>`.

---

## 💻 Código de Referência & Implementação

```tsx
// Mockup de iPhone Animado (Snapcn Pattern para Darktube)
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const PhoneMockupScene: React.FC<{ screenshotUrl: string; title: string }> = ({ screenshotUrl, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 18, mass: 1.2, stiffness: 120 } });
  const y = interpolate(entrance, [0, 1], [300, 0]);
  const rotY = interpolate(frame, [0, 120], [-12, 12], { extrapolateRight: 'clamp' });
  const rotX = interpolate(frame, [0, 120], [8, -4], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ perspective: 1400, justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          width: 420,
          height: 860,
          backgroundColor: '#0F172A',
          borderRadius: 56,
          border: '12px solid #334155',
          boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8), 0 0 40px rgba(56,189,248,0.2)',
          transform: `translateY(${y}px) rotateY(${rotY}deg) rotateX(${rotX}deg)`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Ilha Dinâmica */}
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', width: 120, height: 32, backgroundColor: '#000', borderRadius: 20, zIndex: 10 }} />
        <img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="screen" />
      </div>
    </AbsoluteFill>
  );
};
```
