// src/layouts/MainLayout.tsx
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import type { TabId } from "./tabs";

interface MainLayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  /** Vista activa (Dashboard o módulo) a renderizar. */
  children: ReactNode;
}

export default function MainLayout({
  activeTab,
  onTabChange,
  children,
}: MainLayoutProps) {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleNavigate = useCallback(
    (tab: TabId) => {
      onTabChange(tab);
      setMenuOpen(false);
    },
    [onTabChange],
  );

  // Cierra el drawer con la tecla Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 antialiased">
      <Sidebar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        open={menuOpen}
        onClose={closeMenu}
      />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Navbar activeTab={activeTab} onMenuClick={() => setMenuOpen(true)} />

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* `key` remonta el panel y dispara la transición de entrada */}
            <div
              key={activeTab}
              id={`panel-${activeTab}`}
              role="region"
              aria-label={activeTab}
              className="transition-all duration-300 ease-out starting:translate-y-2 starting:opacity-0"
            >
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}