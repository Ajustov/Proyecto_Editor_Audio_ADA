// frontend/src/context/ActiveAudioContext.ts
import { createContext, useContext } from "react";

import type { AudioUploadResponse } from "../services/api";

/** Audio activo: respuesta del servidor + el `File` original (útil para reproducirlo en el navegador). */
export type ActiveAudio = AudioUploadResponse & { file: File };

export interface ActiveAudioContextValue {
  activeAudio: ActiveAudio | null;
  uploading: boolean;
  error: string | null;
  uploadAudio: (file: File) => Promise<void>;
  clearAudio: () => void;
}

export const ActiveAudioContext = createContext<ActiveAudioContextValue | null>(null);

export function useActiveAudio(): ActiveAudioContextValue {
  const context = useContext(ActiveAudioContext);
  if (!context) {
    throw new Error("useActiveAudio debe usarse dentro de <ActiveAudioProvider>.");
  }
  return context;
}