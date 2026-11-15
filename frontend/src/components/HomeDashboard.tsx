// frontend/src/components/HomeDashboard.tsx
import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import {
  ArrowRight,
  FileAudio,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

import { Badge, Card, SecondaryButton, cn } from "./UI";
import { useActiveAudio } from "../context/ActiveAudioContext";
import { MODULE_IDS, TAB_CONFIG, type TabId } from "../layouts/tabs";

interface HomeDashboardProps {
  onNavigate: (tab: TabId) => void;
}

/*  Utilidades                                                                */

/** Debe coincidir con `ALLOWED_EXTENSIONS` del backend. */
const ACCEPTED_EXTENSIONS = [".mp3", ".m4a", ".wav", ".ogg", ".flac", ".aac"] as const;
const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");
const FORMATS_LABEL = ACCEPTED_EXTENSIONS.map((e) => e.slice(1).toUpperCase()).join(", ");

/** Debe coincidir con `MAX_FILE_SIZE_BYTES` del backend. */
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

function isSupportedAudio(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Alturas fijas (%) para el motivo decorativo de forma de onda. */
const HERO_BARS: readonly number[] = Array.from({ length: 48 }, (_, i) =>
  Math.max(10, Math.round(Math.abs(Math.sin(i * 0.4) * Math.cos(i * 0.13)) * 100)),
);

/*  Carga global de audio                                                     */

function AudioDropzone() {
  const { activeAudio, uploading, error, uploadAudio, clearAudio } = useActiveAudio();

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFile = (candidate: File | undefined) => {
    if (!candidate || uploading) return;

    if (!isSupportedAudio(candidate)) {
      setValidationError(`Formato no soportado. Usa ${FORMATS_LABEL}.`);
      return;
    }
    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(
        `El archivo supera el límite de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
      );
      return;
    }

    setValidationError(null);
    void uploadAudio(candidate);
  };

  const openPicker = () => {
    if (!uploading) inputRef.current?.click();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  const handleClear = () => {
    setValidationError(null);
    clearAudio();
  };

  const visibleError = validationError ?? error;

  return (
    <Card
      title="Audio de trabajo"
      subtitle="Cárgalo una sola vez: quedará disponible en todos los módulos."
      actions={
        activeAudio && (
          <SecondaryButton icon={X} onClick={handleClear}>
            Quitar
          </SecondaryButton>
        )
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={handleChange}
      />

      <div
        role="button"
        tabIndex={0}
        aria-busy={uploading}
        aria-disabled={uploading}
        aria-label="Seleccionar o arrastrar un archivo de audio"
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
          uploading ? "cursor-wait" : "cursor-pointer",
          dragging
            ? "border-indigo-500 bg-indigo-600/10"
            : "border-gray-700 bg-gray-950",
          !uploading && !dragging && "hover:border-indigo-500/60 hover:bg-gray-950/60",
        )}
      >
        {uploading ? (
          <>
            <div className="flex size-12 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-600/15">
              <Loader2
                className="size-6 animate-spin text-indigo-400"
                aria-hidden="true"
              />
            </div>
            <p className="text-sm font-medium text-gray-200">Subiendo audio...</p>
            <p className="text-xs text-gray-500">Enviando el archivo al servidor</p>
          </>
        ) : activeAudio ? (
          <>
            <div className="flex size-12 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-600/15">
              <FileAudio className="size-6 text-indigo-400" aria-hidden="true" />
            </div>
            <p className="max-w-full truncate text-sm font-medium text-gray-100">
              {activeAudio.filename}
            </p>
            <p className="font-mono text-xs text-gray-500">
              {formatSize(activeAudio.size_bytes)} · {activeAudio.format.toUpperCase()}
            </p>
            <Badge tone="success" dot>
              Listo para usar en los módulos
            </Badge>
            <p className="text-xs text-gray-500">
              Haz clic o arrastra otro archivo para reemplazarlo
            </p>
          </>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full border border-gray-800 bg-gray-900">
              <UploadCloud className="size-6 text-indigo-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-200">
              Arrastra tu audio aquí o haz clic para seleccionarlo
            </p>
            <p className="text-xs text-gray-500">
              Formatos soportados: {FORMATS_LABEL}
            </p>
          </>
        )}
      </div>

      {visibleError && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {visibleError}
        </p>
      )}
    </Card>
  );
}

/*  Dashboard                                                                 */

export default function HomeDashboard({ onNavigate }: HomeDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Presentación */}
      <section className="relative overflow-hidden rounded-2xl border border-gray-800 bg-linear-to-br from-indigo-600/20 via-gray-900 to-gray-900 p-8 shadow-lg shadow-black/30 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-24 items-end gap-1 px-6 opacity-20"
        >
          {HERO_BARS.map((height, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-full bg-indigo-400"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        <div className="relative max-w-3xl space-y-4">
          <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">
            Procesamiento Digital de Audio
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-gray-50 sm:text-4xl">
            Bienvenido a AudioEditor ADA
          </h2>
          <p className="text-base leading-relaxed text-gray-400">
            Estación de trabajo de audio digital desarrollada para el curso de
            Análisis y Diseño de Algoritmos. Reúne cuatro herramientas de
            procesamiento de señales: detección de transitorios, modificación
            de tono y duración con phase vocoder, supresión de ruido y
            agrupamiento de audio por similitud, todas conectadas a un backend
            en FastAPI.
          </p>
        </div>
      </section>

      {/* Carga global */}
      <AudioDropzone />

      {/* Resumen de módulos */}
      <section aria-labelledby="modules-heading" className="space-y-4">
        <h3
          id="modules-heading"
          className="text-sm font-semibold tracking-wide text-gray-300 uppercase"
        >
          Funciones principales
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {MODULE_IDS.map((id) => {
            const { label, icon: Icon, description, tags } = TAB_CONFIG[id];

            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={cn(
                  "group flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-900 p-5 text-left shadow-lg shadow-black/30 transition-colors",
                  "hover:border-indigo-500/60 hover:bg-gray-900/80",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-600/15">
                    <Icon className="size-5 text-indigo-400" aria-hidden="true" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-100">
                    {label}
                  </h4>
                </div>

                <p className="text-sm leading-relaxed text-gray-400">
                  {description}
                </p>

                <div className="mt-auto flex items-center justify-between gap-3">
                  <ul className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-md border border-gray-800 bg-gray-950 px-2 py-0.5 text-xs text-gray-400"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-400 transition-transform group-hover:translate-x-0.5">
                    Abrir
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}