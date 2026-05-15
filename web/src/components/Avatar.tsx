import type { FamilyMember } from '../family';

interface Props {
  member: FamilyMember;
  size?: number;
  ring?: boolean;
  ringColor?: string;
}

export function Avatar({ member, size = 36, ring = false, ringColor = 'var(--fd-bg)' }: Props) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: member.color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.42, letterSpacing: '-0.02em',
      flexShrink: 0, fontFamily: 'var(--fd-font-sans)',
      boxShadow: ring
        ? `0 0 0 3px ${ringColor}, 0 2px 6px rgba(0,0,0,0.12)`
        : '0 2px 6px rgba(0,0,0,0.10)',
    }}>
      {member.initials}
    </div>
  );
}
