# backend/modules/vocoder/logic.py
"""Phase Vocoder propio: time-stretching y pitch-shifting.

Pipeline (por canal):

1. STFT: ventana Hann, ``n_fft`` muestras, hop de análisis ``hop = n_fft / 4``.
   Matriz espectral ``[frames x bins]`` calculada con ``np.fft.rfft``.
2. Frecuencia instantánea: la desviación de fase entre frames consecutivos
   (``Δφ = φ_t - φ_{t-1} - ω_k`` envuelta a ``[-π, π]``) da la frecuencia
   verdadera de cada bin: ``ω_k + Δφ`` con ``ω_k = 2π·k·hop / n_fft``.
3. Estiramiento: se recorre la matriz espectral con un paso fraccionario
   ``rate`` (equivale a un hop de síntesis ``Hs = hop / rate`` sobre un hop de
   análisis fijo). La magnitud se interpola entre los dos frames vecinos y la
   fase de síntesis se acumula: ``φ_s[t] = φ_s[t-1] + (ω_k + Δφ)``.
4. ISTFT: ``np.fft.irfft`` por frame, ventana de síntesis y Overlap-Add
   normalizado por la suma de ventanas².
5. Pitch-shift = time-stretch por ``1/r`` + remuestreo polifásico por ``r``,
   con ``r = 2^(semitonos/12)``.

Complejidad: ``O(F · N log N)`` con ``F`` frames y ``N = n_fft``; la
acumulación de fase es un ``cumsum`` y todo el resto está vectorizado con
NumPy (no hay bucles por bin ni por frame).
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from fractions import Fraction
from typing import Final

import numpy as np
import soundfile as sf
from scipy.signal import get_window, resample_poly

N_FFT: Final[int] = 2048
HOP_LENGTH: Final[int] = N_FFT // 4

MIN_RATE: Final[float] = 0.5
MAX_RATE: Final[float] = 2.0
MIN_SEMITONES: Final[float] = -12.0
MAX_SEMITONES: Final[float] = 12.0

MAX_DURATION_SECONDS: Final[float] = 5 * 60  # límite para no bloquear el servidor
MAX_RESAMPLE_DENOMINATOR: Final[int] = 100  # precisión del factor de tono (~1e-5)


#  Errores de dominio (el router los traduce a códigos HTTP)                  #
class VocoderError(Exception):
    """Error base del módulo vocoder."""


class InvalidParameterError(VocoderError):
    """Un parámetro está fuera de rango."""


class AudioDecodeError(VocoderError):
    """No se pudo leer el archivo como audio."""


class AudioTooLongError(VocoderError):
    """El audio supera la duración máxima admitida."""


#  Modelo                                                                     #
@dataclass(frozen=True)
class AudioData:
    """Audio en float32 con forma ``(muestras, canales)``."""

    samples: np.ndarray
    sample_rate: int

    @property
    def duration(self) -> float:
        return self.samples.shape[0] / self.sample_rate


#  Núcleo: STFT / ISTFT                                                       #
def _hann(n_fft: int) -> np.ndarray:
    return get_window("hann", n_fft, fftbins=True)


def stft(y: np.ndarray, n_fft: int = N_FFT, hop: int = HOP_LENGTH) -> np.ndarray:
    """STFT de una señal mono. Devuelve ``[frames x (n_fft/2 + 1)]`` complejo.

    Se rellena con ``n_fft // 2`` ceros a cada lado para no perder muestras en
    los bordes.
    """
    pad = n_fft // 2
    padded = np.pad(y, (pad, pad))
    n_frames = 1 + (padded.shape[0] - n_fft) // hop
    # Vista (sin copia) de todos los frames solapados, luego ventana + FFT.
    frames = np.lib.stride_tricks.sliding_window_view(padded, n_fft)[::hop][:n_frames]
    return np.fft.rfft(frames * _hann(n_fft), axis=1)


def _overlap_add(frames: np.ndarray, hop: int) -> np.ndarray:
    """OLA vectorizado: una suma de bloques por "carril" (sin bucle por frame)."""
    n_frames, n_fft = frames.shape
    out = np.zeros(hop * (n_frames - 1) + n_fft)
    # Se suma cada "carril" de frames que no se solapan entre sí.
    lanes = -(-n_fft // hop)
    for lane in range(lanes):
        sel = frames[lane::lanes]
        if sel.shape[0] == 0:
            continue
        # Dentro de un carril los frames están separados lanes*hop >= n_fft.
        start = lane * hop
        stride = lanes * hop
        span = (sel.shape[0] - 1) * stride + n_fft
        block = np.zeros(span)
        block_view = np.lib.stride_tricks.sliding_window_view(block, n_fft, writeable=True)[::stride]
        block_view[...] = sel  # no hay solapamiento: asignación directa
        out[start : start + span] += block
    return out


def istft(
    spec: np.ndarray, n_fft: int = N_FFT, hop: int = HOP_LENGTH, length: int | None = None
) -> np.ndarray:
    """ISTFT con Overlap-Add normalizado por la suma de ventanas²."""
    window = _hann(n_fft)
    frames = np.fft.irfft(spec, n=n_fft, axis=1) * window
    n_frames = frames.shape[0]

    full = _overlap_add(frames, hop)
    win_sq = _overlap_add(np.broadcast_to(window**2, (n_frames, n_fft)), hop)

    full = full / np.maximum(win_sq, 1e-8)
    pad = n_fft // 2
    out = full[pad:]
    if length is not None:
        out = out[:length]
        if out.shape[0] < length:
            out = np.pad(out, (0, length - out.shape[0]))
    return out


#  Phase vocoder                                                              #
def phase_vocoder(spec: np.ndarray, rate: float, hop: int = HOP_LENGTH) -> np.ndarray:
    """Estira en el tiempo una matriz espectral ``[frames x bins]`` por ``rate``.

    ``rate > 1`` acelera (menos frames), ``rate < 1`` ralentiza.
    """
    n_frames, n_bins = spec.shape
    n_fft = 2 * (n_bins - 1)
    omega = 2.0 * np.pi * hop * np.arange(n_bins) / n_fft  # fase nominal por hop

    # Posiciones (fraccionarias) de los frames de análisis visitados.
    steps = np.arange(0.0, n_frames, rate)
    idx = steps.astype(int)
    alpha = steps - idx

    padded = np.vstack([spec, np.zeros((2, n_bins), dtype=spec.dtype)])
    cur, nxt = padded[idx], padded[idx + 1]

    # Magnitud interpolada entre los dos frames vecinos.
    mag = (1.0 - alpha)[:, None] * np.abs(cur) + alpha[:, None] * np.abs(nxt)

    # Frecuencia instantánea: desviación de fase envuelta a [-π, π].
    dphi = np.angle(nxt) - np.angle(cur) - omega
    dphi -= 2.0 * np.pi * np.round(dphi / (2.0 * np.pi))
    advance = omega + dphi

    # Fase de síntesis acumulada (único acarreo temporal -> cumsum).
    phase = np.angle(spec[0]) + np.concatenate(
        [np.zeros((1, n_bins)), np.cumsum(advance, axis=0)[:-1]]
    )
    return mag * np.exp(1j * phase)


def _stretch_channel(y: np.ndarray, rate: float) -> np.ndarray:
    target = max(1, int(round(y.shape[0] / rate)))
    return istft(phase_vocoder(stft(y), rate), length=target)


def _per_channel(samples: np.ndarray, fn) -> np.ndarray:
    channels = [fn(np.ascontiguousarray(samples[:, c])) for c in range(samples.shape[1])]
    return np.stack(channels, axis=1).astype(np.float32)


def _prevent_clipping(samples: np.ndarray) -> np.ndarray:
    """Normaliza solo si hay saturación; nunca amplifica."""
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0
    return samples / peak if peak > 1.0 else samples


#  API pública                                                                #
def time_stretch(audio: AudioData, rate: float) -> AudioData:
    """Cambia la velocidad sin alterar el tono. Duración nueva ≈ duración / rate."""
    if not MIN_RATE <= rate <= MAX_RATE:
        raise InvalidParameterError(
            f"La velocidad debe estar entre {MIN_RATE}x y {MAX_RATE}x."
        )
    if rate == 1.0:
        return audio
    out = _per_channel(audio.samples, lambda ch: _stretch_channel(ch, rate))
    return AudioData(_prevent_clipping(out), audio.sample_rate)


def pitch_shift(audio: AudioData, semitones: float) -> AudioData:
    """Cambia el tono sin alterar la duración (stretch por 1/r + remuestreo)."""
    if not MIN_SEMITONES <= semitones <= MAX_SEMITONES:
        raise InvalidParameterError(
            f"El tono debe estar entre {MIN_SEMITONES:+.0f} y {MAX_SEMITONES:+.0f} semitonos."
        )
    if semitones == 0:
        return audio

    ratio = 2.0 ** (semitones / 12.0)
    frac = Fraction(ratio).limit_denominator(MAX_RESAMPLE_DENOMINATOR)
    n_samples = audio.samples.shape[0]

    def shift(ch: np.ndarray) -> np.ndarray:
        stretched = _stretch_channel(ch, 1.0 / ratio)  # duración * ratio
        # Reproducirlo `ratio` veces más rápido restituye la duración original.
        resampled = resample_poly(stretched, frac.denominator, frac.numerator)
        if resampled.shape[0] < n_samples:
            return np.pad(resampled, (0, n_samples - resampled.shape[0]))
        return resampled[:n_samples]

    out = _per_channel(audio.samples, shift)
    return AudioData(_prevent_clipping(out), audio.sample_rate)


#  Entrada / salida                                                           #
def load_audio(path) -> AudioData:
    """Lee un archivo de audio como float32 ``(muestras, canales)``."""
    try:
        try:
            samples, sample_rate = sf.read(path, dtype="float32", always_2d=True)
        except Exception:
            # Formatos que libsndfile no soporta (p. ej. M4A/AAC): vía librosa/ffmpeg.
            import librosa

            data, sample_rate = librosa.load(path, sr=None, mono=False)
            samples = np.atleast_2d(data).T.astype(np.float32)
    except Exception as exc:
        raise AudioDecodeError("No se pudo leer el archivo de audio.") from exc

    if samples.shape[0] < 2:
        raise AudioDecodeError("El audio es demasiado corto o está vacío.")
    if samples.shape[0] / sample_rate > MAX_DURATION_SECONDS:
        raise AudioTooLongError(
            f"El audio supera el máximo de {MAX_DURATION_SECONDS / 60:.0f} minutos."
        )
    return AudioData(np.ascontiguousarray(samples), int(sample_rate))


def encode_wav(audio: AudioData) -> bytes:
    """Serializa a WAV PCM de 16 bits."""
    buffer = io.BytesIO()
    sf.write(buffer, np.clip(audio.samples, -1.0, 1.0), audio.sample_rate,
             format="WAV", subtype="PCM_16")
    return buffer.getvalue()
