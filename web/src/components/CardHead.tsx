import type { ReactNode } from 'react';

interface Props {
  he: string;
  en: string;
  right?: ReactNode;
}

export function CardHead({ he, en, right }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <div className="card-title">{he}</div>
        <div className="card-subtitle">{en}</div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}
