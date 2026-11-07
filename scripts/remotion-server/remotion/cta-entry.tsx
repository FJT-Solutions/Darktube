import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { CtaBanner } from './compositions/CtaBanner';

// Bundle enxuto so com a faixa de CTA (render rapido, com fundo transparente).
const Root: React.FC = () => (
  <Composition
    id="CtaBanner"
    component={CtaBanner as any}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ title: 'CTA', subtitle: '', accent: '#FFC800', position: 'bottom' }}
  />
);
registerRoot(Root);
