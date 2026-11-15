// src/layouts/tabs.ts
import {
  Eraser,
  LayoutDashboard,
  Network,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type TabId = "home" | "onset" | "vocoder" | "noise" | "cluster";
export type ModuleId = Exclude<TabId, "home">;

export interface TabConfig {
  id: TabId;
  label: string;
  icon: LucideIcon;
  /** Resumen corto usado en el Dashboard. */
  description: string;
  /** Etiquetas técnicas mostradas en las tarjetas del Dashboard. */
  tags: readonly string[];
}

export const TAB_CONFIG: Record<TabId, TabConfig> = {
  home: {
    id: "home",
    label: "Inicio / Dashboard",
    icon: LayoutDashboard,
    description: "Resumen general del proyecto y carga de audio.",
    tags: [],
  },
  onset: {
    id: "onset",
    label: "Detección de Transitorios",
    icon: Zap,
    description:
      "Localiza los puntos de ataque (onsets) de la señal para segmentar notas, golpes o eventos sonoros.",
    tags: ["Onset detection", "Segmentación"],
  },
  vocoder: {
    id: "vocoder",
    label: "Phase Vocoder",
    icon: Waves,
    description:
      "Modifica la duración o el tono del audio en el dominio de la frecuencia sin alterar el otro parámetro.",
    tags: ["STFT", "Time-stretch", "Pitch-shift"],
  },
  noise: {
    id: "noise",
    label: "Supresión de Ruido",
    icon: Eraser,
    description:
      "Reduce el ruido de fondo estimando su perfil espectral para obtener una señal más limpia.",
    tags: ["Filtrado espectral", "Denoising"],
  },
  cluster: {
    id: "cluster",
    label: "Audio Clustering",
    icon: Network,
    description:
      "Agrupa fragmentos de audio por similitud usando descriptores acústicos y algoritmos de agrupamiento.",
    tags: ["Features", "Clustering"],
  },
};

/** Orden de aparición en la barra lateral. */
export const NAV_ORDER: readonly TabId[] = [
  "home",
  "onset",
  "vocoder",
  "noise",
  "cluster",
];

/** Solo los módulos de procesamiento (sin el Dashboard). */
export const MODULE_IDS: readonly ModuleId[] = [
  "onset",
  "vocoder",
  "noise",
  "cluster",
];