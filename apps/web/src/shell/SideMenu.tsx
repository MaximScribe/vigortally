import { sideMenuWidth } from '@vigortally/ui';
import { ChevronRight, User, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';
import { menuItems } from './menuItems';
import { ThemeSwitch } from './ThemeSwitch';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Menu that slides in from the right when the profile picture is tapped.
 * Full screen on an upright phone; on a sideways phone it keeps its upright width
 * (see `sideMenuWidth` in packages/ui).
 */
export function SideMenu({ open, onClose }: SideMenuProps) {
  const size = useWindowSize();
  const width = sideMenuWidth(size);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <div className="vt-menu" data-open={open} hidden={!open}>
      <div className="vt-menu__backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="vt-menu__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        style={{ width }}
      >
        <div className="vt-menu__header">
          <div className="vt-menu__profile">
            <span className="vt-avatar vt-avatar--large" aria-hidden="true">
              <User size={24} />
            </span>
            <div>
              <p className="vt-title">Not signed in</p>
              <p className="vt-muted vt-menu__hint">Accounts arrive with the next update</p>
            </div>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="vt-icon-button"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </div>

        <section className="vt-menu__section">
          <h2 className="vt-label">Theme</h2>
          <ThemeSwitch />
        </section>

        <ul className="vt-menu__list">
          {menuItems.map(({ id, label, description, icon: Icon }) => (
            <li key={id}>
              <button type="button" className="vt-menu__item" disabled title="Coming soon">
                <Icon className="vt-menu__icon" aria-hidden="true" size={20} />
                <span className="vt-menu__text">
                  <span>{label}</span>
                  <span className="vt-menu__description">{description}</span>
                </span>
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
