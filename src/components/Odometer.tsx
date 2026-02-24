'use client';

import { useEffect, useRef, useState } from 'react';

interface OdometerProps {
  value: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}

const sizeMap = {
  sm: { fontSize: '18px', height: '24px' },
  md: { fontSize: '24px', height: '32px' },
  lg: { fontSize: '32px', height: '42px' },
  xl: { fontSize: '48px', height: '62px' },
};

function OdometerDigit({ digit, size, index = 0 }: { digit: string; size: 'sm' | 'md' | 'lg' | 'xl'; index?: number }) {
  const { fontSize, height } = sizeMap[size];

  if (digit === '.' || digit === ',' || digit === '₹' || digit === '-') {
    return (
      <span style={{ fontSize, lineHeight: height, color: 'inherit', display: 'inline-block' }}>
        {digit}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-block',
        overflow: 'hidden',
        height,
        verticalAlign: 'bottom',
      }}
    >
      <span
        className="odometer-digit"
        style={{
          display: 'block',
          fontSize,
          lineHeight: height,
          animationDelay: `${index * 20}ms`,
        }}
      >
        {digit}
      </span>
    </span>
  );
}

export default function Odometer({
  value,
  currency = '₹',
  size = 'xl',
  color = '#E6EDF3',
}: OdometerProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    prevValue.current = displayValue;
    setDisplayValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(displayValue));

  const isNegative = displayValue < 0;
  const display = `${currency}${formatted}`;
  const chars = display.split('');

  return (
    <span
      style={{
        color,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: '700',
        fontFeatureSettings: '"tnum" 1',
        display: 'inline-flex',
        alignItems: 'flex-end',
      }}
    >
      {isNegative && (
        <OdometerDigit key="minus" digit="-" size={size} />
      )}
      {chars.map((ch, i) => (
        <OdometerDigit key={`${i}-${ch}`} digit={ch} size={size} index={i} />
      ))}
    </span>
  );
}
