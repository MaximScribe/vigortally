import { Link } from '@tanstack/react-router';
import { tabs } from './tabs';

interface TabBarProps {
  /** `bottom` on phones, `side` on wide screens. */
  variant: 'bottom' | 'side';
}

export function TabBar({ variant }: TabBarProps) {
  return (
    <nav className={`vt-tabbar vt-tabbar--${variant}`} aria-label="Main">
      {variant === 'side' && <div className="vt-tabbar__brand">VigorTally</div>}
      <ul className="vt-tabbar__list">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="vt-tabbar__item" activeProps={{ 'aria-current': 'page' }}>
              <Icon className="vt-tabbar__icon" aria-hidden="true" strokeWidth={2} />
              <span className="vt-tabbar__label">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
