/** Round avatar with the user's initials (profile pictures come later). */
export function Avatar({ name, size = 'normal' }: { name: string; size?: 'normal' | 'large' }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
  return (
    <span className={`vt-avatar ${size === 'large' ? 'vt-avatar--large' : ''}`} aria-hidden="true">
      {initials}
    </span>
  );
}
