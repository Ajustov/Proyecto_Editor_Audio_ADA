// src/layouts/TabsNav.tsx
import { cn } from "../components/UI";
import { TAB_CONFIG, MODULE_IDS, type TabId } from "./tabs";

interface TabsNavProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

export default function TabsNav({ activeTab, onChange }: TabsNavProps) {
  return (
    <div
      role="tablist"
      aria-label="Módulos del editor de audio"
      className="grid grid-cols-1 gap-2 rounded-xl border border-gray-800 bg-gray-900 p-2 sm:grid-cols-2 lg:grid-cols-4"
    >
      {MODULE_IDS.map((id) => {
        const { label, icon: Icon } = TAB_CONFIG[id];
        const isActive = id === activeTab;

        return (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${id}`}
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center justify-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
              isActive
                ? "border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-950/50"
                : "border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700 hover:bg-gray-800 hover:text-gray-200",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}