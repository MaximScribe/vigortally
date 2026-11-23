import { Outlet, useRouterState } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';
import { SideMenu } from './SideMenu';
import { TabBar } from './TabBar';
import { TopBar } from './TopBar';
import './shell.css';

/**
 * Frame around every page: top bar with the profile picture, the page itself, the tab
 * navigation (bottom bar on phones, sidebar on wide screens; switched in CSS) and the
 * side menu.
 */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  // Focused screens (the workout logger) take over the whole window.
  const fullScreen = useRouterState({ select: (s) => s.location.pathname.startsWith('/workout') });

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    // Give focus back to the profile button that opened the menu.
    shellRef.current?.querySelector<HTMLButtonElement>('.vt-topbar .vt-avatar-button')?.focus();
  }, []);

  if (fullScreen) return <Outlet />;

  return (
    <div className="vt-shell" ref={shellRef}>
      <TabBar variant="side" />
      <div className="vt-shell__main" inert={menuOpen}>
        <TopBar menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />
        <main className="vt-shell__content">
          <Outlet />
        </main>
      </div>
      <TabBar variant="bottom" />
      <SideMenu open={menuOpen} onClose={closeMenu} />
    </div>
  );
}
