// typing-code-block — Code Block Reveal (motion-lab final ported to native Remotion)
// Two reveal styles side by side for the same syntax-highlighted code: the left fades in line by line rising upward (per-line stagger),
// the right types character by character while keeping token colors, with the current character sitting on a square block that acts as a cursor.
// Design coordinates 480×270 (DesignStage scaled proportionally); parameter values are calibrated in this coordinate system.
import React from 'react';
import { DesignStage, E, seg, useT } from '../../_fixtures/Motion';

export const TYPING_CODE_BLOCK_DURATION = 138; // 4600ms @30fps

// Token colors: keyword/identifier/function/string/punctuation/comment
const K = '#c792ea';
const ID = '#e8eaf0';
const FN = '#82aaff';
const ST = '#c3e88d';
const PU = '#89ddff';
const CM = '#546e7a';
// Each line is a sequence of [text, color] tokens
const LINES: [string, string][][] = [
  [['const ', K], ['app', ID], [' = ', PU], ['createApp', FN], ['();', ID]],
  [['app', ID], ['.', PU], ['use', FN], ['(', ID], ['router', ID], [');', ID]],
  [['app', ID], ['.', PU], ['mount', FN], ['(', ID], ["'#root'", ST], [');', ID]],
  [['// ready', CM]],
];
// Flat per-character sequence for the right-side typing (keeps token color + row number)
const FLAT: { ch: string; color: string; row: number }[] = [];
LINES.forEach((line, row) => {
  for (const [txt, color] of line) for (const ch of txt) FLAT.push({ ch, color, row });
});

// Code panel container: shared frame for the left/right blocks + small top label
const Panel: React.FC<{ x: number; label: string; children: React.ReactNode }> = ({
  x,
  label,
  children,
}) => (
  <div
    style={{
      position: 'absolute',
      left: `${x}%`,
      top: '14%',
      width: '45%',
      height: '72%',
      background: '#10121a',
      border: '1px solid #1c2030',
      borderRadius: 8,
      padding: '10px 12px',
      boxSizing: 'border-box',
      fontFamily: '"SF Mono",Menlo,monospace',
      fontSize: 12,
      lineHeight: 1.9,
    }}
  >
    <div style={{ fontSize: 8, letterSpacing: 2, color: '#4a5270', marginBottom: 6 }}>{label}</div>
    {children}
  </div>
);

export const TypingCodeBlock: React.FC = () => {
  const t = useT();
  // Right-side typing progress: t∈[0.08,0.9] advances linearly to all characters
  const typed = Math.floor(seg(t, 0.08, 0.9) * FLAT.length);
  return (
    <DesignStage bg="#0a0b10">
      {/* Left: line-by-line fade-in and rise (per-line stagger) */}
      <Panel x={3.5} label="LINE FADE-IN">
        {LINES.map((line, i) => {
          const k = seg(t, 0.08 + i * 0.14, 0.08 + i * 0.14 + 0.3, E.outCubic);
          return (
            <div key={i} style={{ opacity: k, transform: `translateY(${(1 - k) * 8}px)` }}>
              {line.map(([txt, color], j) => (
                <span key={j} style={{ color }}>
                  {txt}
                </span>
              ))}
            </div>
          );
        })}
      </Panel>
      {/* Right: character-by-character typing (colors preserved), current character sits on a square cursor block */}
      <Panel x={51.5} label="CHAR TYPING">
        {LINES.map((_, row) => (
          <div key={row} style={{ minHeight: '1.9em' }}>
            {FLAT.map((c, i) =>
              c.row === row ? (
                <span
                  key={i}
                  style={{
                    color: c.color,
                    // Cursor-position character is indicated by a background block (kept visible)
                    opacity: i < typed || i === typed ? 1 : 0,
                    background: i === typed && typed < FLAT.length ? '#3a4468' : 'transparent',
                  }}
                >
                  {c.ch}
                </span>
              ) : null,
            )}
          </div>
        ))}
      </Panel>
    </DesignStage>
  );
};
