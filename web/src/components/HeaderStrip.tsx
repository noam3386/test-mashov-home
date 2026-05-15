import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { FAMILY_MEMBERS } from '../family';
import { Avatar } from './Avatar';

function greeting(now: Date): string {
  const h = now.getHours();
  const day = now.getDay();
  if (day === 6 || (day === 5 && h >= 17)) return 'שבת שלום, משפחה';
  if (h >= 5 && h < 12)  return 'בוקר טוב, משפחה';
  if (h >= 12 && h < 17) return 'צהריים טובים, משפחה';
  if (h >= 17 && h < 21) return 'ערב טוב, משפחה';
  return 'לילה טוב, משפחה';
}

export function HeaderStrip() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dayName = format(now, 'EEEE', { locale: he });
  const dateStr = `${now.getDate()} ב${format(now, 'MMMM yyyy', { locale: he })}`;
  const hhmm    = format(now, 'HH:mm');
  const ss      = format(now, 'ss');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '4px 0', flexShrink: 0,
    }}>
      {/* Left: avatars + greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex' }}>
          {FAMILY_MEMBERS.map((m, i) => (
            <div key={m.id} style={{ marginInlineStart: i === 0 ? 0 : -10 }}>
              <Avatar member={m} size={42} ring ringColor="var(--fd-bg)" />
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fd-ink)', letterSpacing: '-0.01em' }}>
            {greeting(now)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fd-muted)', marginTop: 2, fontWeight: 500 }}>
            נועם · חן · אביב · איתן
            <span style={{ color: 'var(--fd-faint)', margin: '0 8px' }}>·</span>
            Noam · Chen · Aviv · Eitan
          </div>
        </div>
      </div>

      {/* Right: location + date + clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ textAlign: 'end' }}>
          <div style={{ fontSize: 11, color: 'var(--fd-faint)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500 }}>
            HOD HASHARON
          </div>
          <div style={{ fontSize: 13, color: 'var(--fd-muted)', fontWeight: 600, marginTop: 2 }}>
            {dayName} · {dateStr}
          </div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--fd-divider)' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{
            fontSize: 36, fontWeight: 500, color: 'var(--fd-ink)',
            fontFamily: 'var(--fd-font-mono)', letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {hhmm}
          </span>
          <span style={{ fontSize: 14, color: 'var(--fd-faint)', fontFamily: 'var(--fd-font-mono)' }}>
            :{ss}
          </span>
        </div>
      </div>
    </div>
  );
}
