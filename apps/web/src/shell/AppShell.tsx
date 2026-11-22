import { Outlet } from '@tanstack/react-router';
import { useState } from 'react';
import { TabBar } from './TabBar';
import { TopBar } from './TopBar';
import './shell.css';

/**
 * Frame around every page: top bar with the profile picture, the page itself, and the
 * tab navigation (bottom bar on phones, sidebar on wide screens; switched in CSS).
 */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="vt-shell">
      <TabBar variant="side" />
      <div className="vt-shell__main">
        <TopBar menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />
        <main className="vt-shell__content">
          <Outlet />
        </main>
      </div>
      <TabBar variant="bottom" />
    </div>
  );
}
