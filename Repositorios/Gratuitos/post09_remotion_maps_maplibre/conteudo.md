# Remotion Maps + MapLibre — Animações de Mapas Cinematográficos 3D sem API Token

> **Identificação:** Post 9 e Post 29  
> **Autores / Origem:** Jonny Burger (@JNYBGR) / Tequila Funk (@tequilafunks) / Mouzou (@mouzourasg)  
> **Modelo de Custo:** `100% Gratuito / Open Source (BSD-3)`  
> **Prioridade no Darktube:** `ALTA PRIORIDADE — RECURSO VISUAL PODEROSO`

---

## 📢 Texto Original da Publicação no X

```text
Remotion Maps skill got updated and now powered by @maplibre. No API token required anymore! Just install the skills and generate cinematic map animations: flight paths, camera tracking, zooms, animated routes.
Prompt: use remotion best practices. create a cinematic travel map animation in a new composition. start tightly focused on Tokyo with subtle map tilt and atmospheric motion, then smoothly zoom out to reveal Asia and the Pacific.

This used to be a 40-minute After Effects job. Athens → Nicosia. Pin. Arc. Label. Done. I built a Remotion skill in ChatGPT that turns a route into a map video. Editors still drawing the path by hand are wasting the cut.
```

---

## 🔗 Repositórios & Links de Referência

- **[Remotion Maps Skill](https://remotion.dev/docs/maps):** https://remotion.dev/docs/maps
- **[MapLibre GL](https://maplibre.org/):** https://maplibre.org/
- **[Tequila Funk Post](https://x.com/tequilafunks/status/2052330674619625966):** https://x.com/tequilafunks/status/2052330674619625966

---

## 💡 Veredito Técnico & Arquitetura

Animações de mapas (estilo Vox, Johnny Harris e documentários geopolíticos) antes exigiam After Effects com plugins pesados ou tokens caros do Mapbox. Com a migração para **MapLibre GL** nativo no Remotion:
* Não requer chave de API nem cartão de crédito.
* Anima arcos de voo curvos com latitude/longitude reais.
* Efeitos de câmera suave: tilt 3D, rotação de bússola e zooms contínuos.

---

## 🚀 Aplicação Prática no Darktube

Integrar cenas de mapas geográficos em vídeos de curiosidades, viagens, história e geopolítica no Darktube via componente dedicado `<CinematicMapRoute>`.

---

## 💻 Código de Referência & Implementação

```tsx
// Rota de Voo Cinematográfica com Remotion Maps (MapLibre Pattern)
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

// Estrutura conceitual integrada no Darktube
export const FlightPathMap: React.FC<{ from: [number, number]; to: [number, number]; label: string }> = ({ from, to, label }) => {
  const frame = useCurrentFrame();

  // Interpolação suave de progresso de voo 0 -> 100%
  const progress = interpolate(frame, [15, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const currentLng = interpolate(progress, [0, 1], [from[0], to[0]]);
  const currentLat = interpolate(progress, [0, 1], [from[1], to[1]]);
  const zoom = interpolate(progress, [0, 0.5, 1], [6, 4.5, 6]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#090D16' }}>
      {/* O MapLibre renderiza os tiles vetoriais gratuitos */}
      <div style={{ position: 'absolute', top: 80, left: 60, zIndex: 10, color: '#fff', fontFamily: 'sans-serif' }}>
        <h2 style={{ fontSize: 48, fontWeight: 800 }}>{label}</h2>
        <p style={{ opacity: 0.7 }}>Coord: {currentLat.toFixed(2)}, {currentLng.toFixed(2)} | Zoom: {zoom.toFixed(1)}x</p>
      </div>
    </AbsoluteFill>
  );
};
```
