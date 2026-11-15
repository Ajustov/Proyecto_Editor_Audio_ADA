// src/layouts/Navbar.tsx
import { Menu } from "lucide-react";

import { Badge } from "../components/UI";
import { TAB_CONFIG, type TabId } from "./tabs";

interface NavbarProps {
  activeTab: TabId;
  /** Abre el drawer de la barra lateral en pantallas menores a `lg`. */
  onMenuClick: () => void;
}

export default function Navbar({ activeTab, onMenuClick }: NavbarProps) {
  const { label, icon: Icon } = TAB_CONFIG[activeTab];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-gray-800 bg-gray-950/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100 focus-visible:outline-2 focus-visible:outline-indigo-500 lg:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <Icon className="size-5 shrink-0 text-indigo-400" aria-hidden="true" />
        <h1 className="truncate text-sm font-semibold tracking-wide text-gray-100">
          {label}
        </h1>
      </div>

      {/* Controles globales: agregar aquí acciones compartidas (exportar, ajustes...) */}
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <Badge tone="info">v0.1.0</Badge>
      </div>
    </header>
  );
}