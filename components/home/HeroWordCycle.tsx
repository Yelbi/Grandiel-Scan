'use client';

import { useState, useEffect } from 'react';

const WORDS = ['manhwas', 'mangas', 'manhuas'] as const;
const INTERVAL_MS   = 3000;
const GLITCH_OUT_MS = 450;
const GLITCH_IN_MS  = 450;

type Phase = 'idle' | 'out' | 'in';

export default function HeroWordCycle() {
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    const pending: ReturnType<typeof setTimeout>[] = [];

    const timer = setInterval(() => {
      setPhase('out');
      const t1 = setTimeout(() => {
        setWordIndex((i) => (i + 1) % WORDS.length);
        setPhase('in');
        const t2 = setTimeout(() => setPhase('idle'), GLITCH_IN_MS);
        pending.push(t2);
      }, GLITCH_OUT_MS);
      pending.push(t1);
    }, INTERVAL_MS);

    return () => {
      clearInterval(timer);
      pending.forEach(clearTimeout);
    };
  }, []);

  const accentClass = [
    'hero__accent',
    'hero__accent--cycle',
    phase === 'out' ? 'hero__accent--glitch-out' : '',
    phase === 'in'  ? 'hero__accent--glitch-in'  : '',
  ].filter(Boolean).join(' ');

  return (
    <span
      className={accentClass}
      aria-live="off"
      suppressHydrationWarning
    >
      {WORDS[wordIndex]}
    </span>
  );
}
