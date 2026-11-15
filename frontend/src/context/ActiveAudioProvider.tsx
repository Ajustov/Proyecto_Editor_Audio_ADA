// frontend/src/context/ActiveAudioProvider.tsx
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { audioService, getApiErrorMessage } from "../services/api";
import {
  ActiveAudioContext,
  type ActiveAudio,
  type ActiveAudioContextValue,
} from "./ActiveAudioContext";

/** Borra el archivo del servidor sin bloquear la UI (si falla, el backend lo purga por antigüedad). */
function discardRemote(fileId: string): void {
  audioService.deleteAudio(fileId).catch(() => undefined);
}

export function ActiveAudioProvider({ children }: { children: ReactNode }) {
  const [activeAudio, setActiveAudio] = useState<ActiveAudio | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef<ActiveAudio | null>(null);
  const latestRequest = useRef<number>(0);

  /** Reemplaza el audio activo y elimina del servidor el anterior. */
  const commit = useCallback((next: ActiveAudio | null) => {
    const previous = activeRef.current;
    if (previous && previous.file_id !== next?.file_id) {
      discardRemote(previous.file_id);
    }
    activeRef.current = next;
    setActiveAudio(next);
  }, []);

  const uploadAudio = useCallback(
    async (file: File) => {
      const requestId = ++latestRequest.current;
      setUploading(true);
      setError(null);

      try {
        const stored = await audioService.uploadAudio(file);

        // Si el usuario subió otro archivo o pulsó "Quitar" mientras tanto, se descarta este.
        if (requestId !== latestRequest.current) {
          discardRemote(stored.file_id);
          return;
        }
        commit({ ...stored, file });
      } catch (err) {
        if (requestId === latestRequest.current) setError(getApiErrorMessage(err));
      } finally {
        if (requestId === latestRequest.current) setUploading(false);
      }
    },
    [commit],
  );

  const clearAudio = useCallback(() => {
    latestRequest.current += 1; // invalida cualquier subida en curso
    setUploading(false);
    setError(null);
    commit(null);
  }, [commit]);

  const value = useMemo<ActiveAudioContextValue>(
    () => ({ activeAudio, uploading, error, uploadAudio, clearAudio }),
    [activeAudio, uploading, error, uploadAudio, clearAudio],
  );

  return (
    <ActiveAudioContext.Provider value={value}>
      {children}
    </ActiveAudioContext.Provider>
  );
}