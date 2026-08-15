// wallet-counter-roll —— App wallet: balance odometer digits roll and lock in (mobile / data)
// Phone fades in → 4 odometer digits inside the wallet balance card spin at high speed → each digit decelerates, overshoots, then locks in
// (digit i staggered by 6f) → the transaction list below staggers into view → the whole phone breathes on hold. Inherits the web odometer algorithm,
// scaled down to the wallet card size. Vector mockup, deterministic rendering.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { Phone } from '../../_fixtures/PhoneFixtures';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const WALLET_COUNTER_ROLL_DURATION = 180; // 6s @ 30fps

// Timeline (180f)
const PHONE_IN = 4;
const SPIN = 14;       // rolling starts
const DIGITS = [8, 4, 9, 2]; // target digits (balance 8,492)
const ROW = 64;        // digit strip row height
const SPIN_SPEED = 0.85;
const SETTLE = 84;     // all digits locked in
const LIST_IN = 74;    // transaction list stagger starts
const HOLD = 148;      // settled → breathing

// Digit i's strip offset (inherits the web odometer posAt, scaled to wallet size)
const posAt = (f: number, i: number): number => {
  const d = DIGITS[i];
  const s = SPIN + i * 7;
  const p0 = SPIN_SPEED * s;
  const T = Math.ceil((p0 + 6 - d) / 10) * 10 + d;
  if (f < s) return SPIN_SPEED * Math.max(f, 0);
  if (f < s + 16) return interpolate(f, [s, s + 16], [p0, T + 0.5], CL);
  if (f < s + 22) return interpolate(f, [s + 16, s + 22], [T + 0.5, T], { easing: Easing.out(Easing.cubic), ...CL });
  return T;
};

export const WalletCounterRoll: React.FC = () => {
  const f = useCurrentFrame();
  const phoneIn = interpolate(f, [PHONE_IN, PHONE_IN + 16], [0.85, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });
  const phoneY = (1 - phoneIn) * 20;

  // List staggers in
  const listIn = (i: number) => interpolate(f, [LIST_IN + i * 6, LIST_IN + i * 6 + 12], [0, 1], {
    easing: Easing.out(Easing.cubic), ...CL,
  });

  const breathe = f < HOLD ? 1 : 1 + 0.008 * Math.sin(((f - HOLD) / 48) * Math.PI * 2);

  const rows = [
    { label: 'Incoming transfer', amount: '+ $2,400.00', w: 64 },
    { label: 'Coffee — Daily Grind', amount: '- $5.20', w: 48 },
    { label: 'Salary deposit', amount: '+ $4,200.00', w: 56 },
  ];

  return (
    <AbsoluteFill style={{ background: '#e8e6e1', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translateY(${phoneY}px) scale(${breathe})`, opacity: phoneIn }}>
        <Phone width={350}>
          <div style={{ position: 'absolute', inset: 0, background: '#f4f4f2', color: '#18181b' }}>
            {/* Wallet card */}
            <div style={{ margin: '80px 20px 0' }}>
              <div style={{ background: '#26262b', color: '#fff', borderRadius: 20, padding: '20px' }}>
                <div style={{ fontSize: 12, color: '#9a9aa4' }}>Available balance</div>
                {/* odometer digits */}
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, marginRight: 6 }}>$</div>
                  <div style={{ display: 'flex', overflow: 'hidden', height: ROW }}>
                    {DIGITS.map((d, i) => (
                      <div key={i} style={{ overflow: 'hidden', height: ROW, width: 46 }}>
                        <div style={{ transform: `translateY(${-(posAt(f, i) % 10) * ROW}px)` }}>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <div key={n} style={{ height: ROW, fontSize: 44, fontWeight: 800, lineHeight: `${ROW}px`, fontVariantNumeric: 'tabular-nums', color: '#fff' }}>{n}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginLeft: 4 }}>.00</div>
                </div>
              </div>
            </div>

            {/* Transaction list */}
            <div style={{ margin: '24px 20px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3f3f46', marginBottom: 10 }}>Recent activity</div>
              {rows.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 12, padding: '12px', marginBottom: 8, boxShadow: '0 3px 10px rgba(0,0,0,0.04)', opacity: listIn(i), transform: `translateY(${(1 - listIn(i)) * 12}px)` }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: i % 2 ? '#d9d9de' : '#cfcfd4', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: r.amount.startsWith('+') ? '#0f7e5a' : '#18181b' }}>{r.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </Phone>
      </div>
    </AbsoluteFill>
  );
};
