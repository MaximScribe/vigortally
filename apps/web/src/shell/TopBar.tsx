import { User } from 'lucide-react';

interface TopBarProps {
  onOpenMenu: () => void;
  menuOpen: boolean;
}

/** Slim bar above every page. The profile picture on the right opens the side menu. */
export function TopBar({ onOpenMenu, menuOpen }: TopBarProps) {
  return (
    <header className="vt-topbar">
      <button
        type="button"
        className="vt-avatar"
        onClick={onOpenMenu}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
      >
        <User aria-hidden="true" size={20} />
      </button>
    </header>
  );
}
