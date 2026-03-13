'use client';

import { useMemo, useState } from 'react';

interface TickerLogoProps {
  ticker: string;
  size?: number;
  className?: string;
  fillContainer?: boolean;
}

function getLogoTone(ticker: string): string {
  const tones = [
    'from-blue-500 to-cyan-400',
    'from-violet-500 to-fuchsia-400',
    'from-emerald-500 to-teal-400',
    'from-amber-500 to-orange-400',
    'from-rose-500 to-pink-400',
  ];
  const code = ticker.charCodeAt(0) || 0;
  return tones[code % tones.length];
}

function getLogoCandidates(ticker: string): string[] {
  const symbol = ticker.trim().toUpperCase();
  return [
    `https://assets.parqet.com/logos/symbol/${symbol}?format=png`,
    `https://financialmodelingprep.com/image-stock/${symbol}.png`,
    `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${symbol}.png`,
  ];
}

export default function TickerLogo({
  ticker,
  size = 28,
  className = '',
  fillContainer = false,
}: TickerLogoProps) {
  const [index, setIndex] = useState(0);
  const [fallback, setFallback] = useState(false);
  const logoUrls = useMemo(() => getLogoCandidates(ticker), [ticker]);

  if (fallback) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${getLogoTone(ticker)} text-[11px] font-bold text-white ${className}`}
        style={fillContainer ? undefined : { width: size, height: size }}
        aria-label={`${ticker} logo fallback`}
      >
        {ticker.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      src={logoUrls[index]}
      alt={`${ticker} logo`}
      width={size}
      height={size}
      className={`rounded-full border border-[#2b3b54] bg-[#0a111b] object-cover ${className}`}
      loading="lazy"
      onError={() => {
        if (index < logoUrls.length - 1) {
          setIndex((prev) => prev + 1);
          return;
        }
        setFallback(true);
      }}
    />
  );
}
