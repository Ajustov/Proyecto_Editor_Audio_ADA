// src/layouts/Sidebar.tsx
import { AudioWaveform, X } from "lucide-react";

import { Badge, cn } from "../components/UI";
import { MODULE_IDS, TAB_CONFIG, type TabId } from "./tabs";

interface SidebarProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
  /** Estado del drawer en pantallas menores a `lg`. */
  open: boolean;
  onClose: () => void;
}

interface NavItemProps {
  id: TabId;
  active: boolean;
  onNavigate: (tab: TabId) => void;
}

function NavItem({ id, active, onNavigate }: NavItemProps) {
  const { label, icon: Icon } = TAB_CONFIG[id];

  return (
    <li>
      <button
        type="button"
        onClick={() => onNavigate(id)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
          active
            ? "border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-950/50"
            : "border-transparent text-gray-400 hover:border-gray-800 hover:bg-gray-800/60 hover:text-gray-100",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            active ? "text-white" : "text-gray-500 group-hover:text-indigo-400",
          )}
          aria-hidden="true"
        />
        <span>{label}</span>
      </button>
    </li>
  );
}

export default function Sidebar({
  activeTab,
  onNavigate,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Fondo oscuro del drawer (solo móvil / tablet) */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        aria-label="Navegación principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-800 bg-gray-900 transition-transform duration-300 ease-out",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo y título */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-800 px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-950/60">
              <AudioWaveform className="size-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-base font-semibold tracking-tight text-gray-100">
              AudioEditor <span className="text-indigo-400">ADA</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-200 focus-visible:outline-2 focus-visible:outline-indigo-500 lg:hidden"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Navegación vertical */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <ul className="space-y-1">
            <NavItem id="home" active={activeTab === "home"} onNavigate={onNavigate} />
          </ul>

          <div>
            <p className="mb-2 px-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Módulos
            </p>
            <ul className="space-y-1">
              {MODULE_IDS.map((id) => (
                <NavItem
                  key={id}
                  id={id}
                  active={activeTab === id}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        </nav>

        {/* Información del proyecto */}
        <div className="shrink-0 border-t border-gray-800 p-4">
          <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-950 p-3">
            <Badge tone="success" dot pulse>
              En desarrollo
            </Badge>
            <p className="text-xs leading-relaxed text-gray-500">
              Proyecto universitario · Análisis y Diseño de Algoritmos (ADA)
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}