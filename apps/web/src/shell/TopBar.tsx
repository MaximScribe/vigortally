import { useMe } from '../auth/AuthGate';
import { Avatar } from './Avatar';

interface TopBarProps {
  onOpenMenu: () => void;
  menuOpen: boolean;
}

/** Slim bar above every page. The profile picture on the right opens the side menu. */
export function TopBar({ onOpenMenu, menuOpen }: TopBarProps) {
  const me = useMe();
  return (
    <header className="vt-topbar">
      <button
        type="button"
        className="vt-avatar-button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
      >
        <Avatar name={me.user.name} />
      </button>
    </header>
  );
}
