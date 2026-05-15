interface GlyphProps { size?: number; color?: string; accent?: string }

function GlyphSun({ size = 36, color = '#c25a3d' }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="8" fill={color} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 20 + Math.cos(rad) * 13, y1 = 20 + Math.sin(rad) * 13;
        const x2 = 20 + Math.cos(rad) * 17, y2 = 20 + Math.sin(rad) * 17;
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2.5" strokeLinecap="round" />;
      })}
    </svg>
  );
}

function GlyphCloud({ size = 36, color = 'var(--fd-muted)', accent = '#c25a3d' }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 40" fill="none">
      <circle cx="14" cy="18" r="7" fill={accent} opacity="0.85" />
      <path d="M12 28 Q6 28 6 22 Q6 16 14 16 Q16 10 24 10 Q33 10 34 18 Q42 18 42 24 Q42 30 35 30 L12 30 Z" fill={color} />
    </svg>
  );
}

function GlyphRain({ size = 36, color = 'var(--fd-muted)' }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M10 22 Q5 22 5 17 Q5 12 12 12 Q14 7 20 7 Q28 7 29 14 Q35 14 35 20 Q35 24 30 24 L10 24 Z" fill={color} />
      <line x1="13" y1="28" x2="11" y2="34" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="20" y1="28" x2="18" y2="34" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="27" y1="28" x2="25" y2="34" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function GlyphPartly({ size = 36, color = 'var(--fd-muted)', accent = '#c25a3d' }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 40" fill="none">
      <circle cx="30" cy="14" r="6" fill={accent} />
      <path d="M12 28 Q6 28 6 22 Q6 16 14 16 Q16 10 24 10 Q33 10 34 18 Q42 18 42 24 Q42 30 35 30 L12 30 Z" fill={color} />
    </svg>
  );
}

type WeatherKind = 'sun' | 'partly' | 'cloud' | 'rain';

interface WeatherGlyphProps extends GlyphProps { kind: WeatherKind }

export function WeatherGlyph({ kind, ...rest }: WeatherGlyphProps) {
  if (kind === 'sun')    return <GlyphSun    {...rest} />;
  if (kind === 'rain')   return <GlyphRain   {...rest} />;
  if (kind === 'partly') return <GlyphPartly {...rest} />;
  return <GlyphCloud {...rest} />;
}

export function weatherKind(code: number): WeatherKind {
  if (code === 0)  return 'sun';
  if (code <= 2)   return 'partly';
  if (code === 3)  return 'cloud';
  if (code <= 67)  return 'rain';
  if (code <= 77)  return 'cloud';
  if (code <= 82)  return 'rain';
  return 'rain';
}

export function weatherLabel(code: number): string {
  if (code === 0)  return 'בהיר';
  if (code <= 2)   return 'מעונן חלקית';
  if (code === 3)  return 'מעונן';
  if (code <= 49)  return 'ערפל';
  if (code <= 55)  return 'טפטוף';
  if (code <= 65)  return 'גשם';
  if (code <= 77)  return 'שלג';
  if (code <= 82)  return 'ממטרים';
  return 'סופת רעמים';
}
