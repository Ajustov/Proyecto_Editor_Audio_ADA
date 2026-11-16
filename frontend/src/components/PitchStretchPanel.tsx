// src/components/PitchStretchPanel.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioLines, Download, FileAudio, RotateCcw, Wand2 } from "lucide-react";

import { Badge, Card, EmptyState, ModuleTemplate, PrimaryButton, SecondaryButton } from "./UI";
import { useActiveAudio } from "../context/ActiveAudioContext";
import { audioService, getApiErrorMessage, vocoderService } from "../services/api";

/** Deben coincidir con los límites del backend (`modules/vocoder/logic.py`). */
const RATE = { min: 0.5, max: 2.0, step: 0.05, default: 1.0 } as const;
const SEMITONES = { min: -12, max: 12, step: 0.5, default: 0 } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  return `${m}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

interface SliderFieldProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  format: (value: number) => string;
  onChange: (value: number) => void;
}

/** Slider + input numérico sincronizados. */
function SliderField({ label, unit, value, min, max, step, disabled, format, onChange }: SliderFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-gray-200">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            aria-label={`${label} (valor numérico)`}
            className="w-20 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-right text-sm text-gray-100 disabled:opacity-50"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const parsed = e.target.valueAsNumber;
              if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max));
            }}
          />
          <span className="w-8 text-xs text-gray-500">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        aria-label={label}
        className="w-full accent-indigo-500 disabled:opacity-50"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="text-xs text-gray-500">Actual: {format(value)}</p>
    </div>
  );
}

export default function PitchStretchPanel() {
  const { activeAudio } = useActiveAudio();

  const [rate, setRate] = useState<number>(RATE.default);
  const [semitones, setSemitones] = useState<number>(SEMITONES.default);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [originalDuration, setOriginalDuration] = useState<number | null>(null);
  const [resultDuration, setResultDuration] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // URL del audio original (se libera al cambiar de audio o desmontar).
  const sourceFile = activeAudio?.file ?? null;
  useEffect(() => {
    if (!sourceFile) {
      setOriginalUrl(null);
      return;
    }
    const url = URL.createObjectURL(sourceFile);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

  // El resultado pertenece al audio activo: se descarta si este cambia.
  const activeId = activeAudio?.file_id ?? null;
  useEffect(() => {
    setResultUrl(null);
    setResultDuration(null);
    setError(null);
  }, [activeId]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const reset = () => {
    setRate(RATE.default);
    setSemitones(SEMITONES.default);
  };

  const process = useCallback(async () => {
    if (!activeAudio) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setProcessing(true);
    setError(null);

    let intermediateId: string | null = null;
    try {
      let blob: Blob = activeAudio.file;
      let currentId = activeAudio.file_id;

      if (rate !== RATE.default) {
        blob = await vocoderService.timeStretch(currentId, rate, controller.signal);
      }
      if (semitones !== SEMITONES.default) {
        if (blob !== activeAudio.file) {
          // Encadenar: el resultado de la velocidad se sube como audio temporal.
          const temp = await audioService.uploadAudio(new File([blob], "temp.wav", { type: "audio/wav" }));
          intermediateId = temp.file_id;
          currentId = temp.file_id;
        }
        blob = await vocoderService.pitchShift(currentId, semitones, controller.signal);
      }

      setResultUrl(URL.createObjectURL(blob));
      setResultDuration(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      let message = getApiErrorMessage(err);
      // Con responseType "blob" el detalle del error llega dentro de un Blob.
      const data = (err as { response?: { data?: unknown } }).response?.data;
      if (data instanceof Blob) {
        try {
          const detail = (JSON.parse(await data.text()) as { detail?: unknown }).detail;
          if (typeof detail === "string") message = detail;
        } catch {
          /* se mantiene el mensaje genérico */
        }
      }
      setError(message);
    } finally {
      if (intermediateId) void audioService.deleteAudio(intermediateId).catch(() => undefined);
      if (abortRef.current === controller) abortRef.current = null;
      setProcessing(false);
    }
  }, [activeAudio, rate, semitones]);

  const unchanged = rate === RATE.default && semitones === SEMITONES.default;
  const downloadName = activeAudio
    ? `${activeAudio.filename.replace(/\.[^.]+$/, "")}_procesado.wav`
    : "procesado.wav";

  return (
    <ModuleTemplate
      icon={AudioLines}
      title="Velocidad y Tono"
      subtitle="Phase Vocoder: cambia la velocidad sin alterar el tono, o el tono sin alterar la duración"
    >
      {!activeAudio ? (
        <Card>
          <EmptyState
            icon={FileAudio}
            title="Aún no hay audio cargado"
            description="Carga un audio desde el Inicio para ajustar su velocidad o tono."
          />
        </Card>
      ) : (
        <>
          <Card
            title="Parámetros"
            subtitle={activeAudio.filename}
            actions={
              <SecondaryButton icon={RotateCcw} onClick={reset} disabled={processing || unchanged}>
                Restablecer
              </SecondaryButton>
            }
          >
            <div className="grid gap-8 md:grid-cols-2">
              <SliderField
                label="Velocidad"
                unit="x"
                value={rate}
                {...RATE}
                disabled={processing}
                format={(v) => `${v.toFixed(2)}x`}
                onChange={setRate}
              />
              <SliderField
                label="Tono"
                unit="st"
                value={semitones}
                {...SEMITONES}
                disabled={processing}
                format={(v) => `${v > 0 ? "+" : ""}${v} semitonos`}
                onChange={setSemitones}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PrimaryButton icon={Wand2} loading={processing} disabled={unchanged} onClick={() => void process()}>
                {processing ? "Procesando…" : "Procesar y Previsualizar"}
              </PrimaryButton>
              {unchanged && <span className="text-xs text-gray-500">Modifica la velocidad o el tono para procesar.</span>}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}
          </Card>

          <Card title="Previsualización" subtitle="Compara el original con el resultado">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">Original</span>
                  <Badge>{formatDuration(originalDuration)}</Badge>
                </div>
                {originalUrl && (
                  <audio
                    controls
                    className="w-full"
                    src={originalUrl}
                    onLoadedMetadata={(e) => setOriginalDuration(e.currentTarget.duration)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">Procesado</span>
                  <Badge tone="info">{formatDuration(resultDuration)}</Badge>
                </div>
                {resultUrl ? (
                  <>
                    <audio
                      controls
                      className="w-full"
                      src={resultUrl}
                      onLoadedMetadata={(e) => setResultDuration(e.currentTarget.duration)}
                    />
                    <a href={resultUrl} download={downloadName} className="inline-block">
                      <SecondaryButton icon={Download} tabIndex={-1}>
                        Descargar WAV
                      </SecondaryButton>
                    </a>
                  </>
                ) : (
                  <p className="rounded-lg border border-dashed border-gray-800 px-4 py-6 text-center text-sm text-gray-500">
                    Aún no hay resultado.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </ModuleTemplate>
  );
}
