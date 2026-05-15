export const FAMILY_MEMBERS = [
  { id: 'noam',  he: 'נועם',  en: 'Noam',  role: 'אבא',  initials: 'נ',  color: '#c25a3d', soft: '#f4d4c5' },
  { id: 'chen',  he: 'חן',    en: 'Chen',  role: 'אמא',  initials: 'ח',  color: '#6f8a5b', soft: '#dde6cf' },
  { id: 'aviv',  he: 'אביב',  en: 'Aviv',  role: 'בן 9', initials: 'א',  color: '#b88a4a', soft: '#f0e1c4' },
  { id: 'eitan', he: 'איתן',  en: 'Eitan', role: 'בן 4', initials: 'אי', color: '#3d6e57', soft: '#cfe1d6' },
] as const;

export type FamilyMember = typeof FAMILY_MEMBERS[number];

export function memberOf(raw: string): FamilyMember | null {
  const id = raw.replace(/^uid_/, '');
  return (FAMILY_MEMBERS.find(m => m.id === id) ?? null) as FamilyMember | null;
}
