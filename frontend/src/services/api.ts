// frontend/src/services/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8000",
});

/*  Tipos                                                                     */

/** Respuesta de `POST /api/audio/upload` (mismos nombres que el backend). */
export interface AudioUploadResponse {
  success: boolean;
  file_id: string;
  filename: string;
  /** Extensión sin punto, p. ej. "wav". */
  format: string;
  size_bytes: number;
}

/*  Errores                                                                   */

/** Extrae un mensaje legible de cualquier error lanzado por Axios. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.";
    }
    const detail = (error.response.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") return detail;
    return `Error del servidor (${error.response.status}).`;
  }
  return error instanceof Error ? error.message : "Error inesperado.";
}

/*  Servicio de audio                                                         */

export const audioService = {
  async uploadAudio(file: File): Promise<AudioUploadResponse> {
    const form = new FormData();
    form.append("file", file);

    const { data } = await api.post<AudioUploadResponse>("/api/audio/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async deleteAudio(fileId: string): Promise<void> {
    await api.delete(`/api/audio/${fileId}`);
  },
};