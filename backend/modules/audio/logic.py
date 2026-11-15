# backend/modules/audio/logic.py
"""Lógica de negocio del módulo de audio: validación y almacenamiento temporal."""

from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile

ALLOWED_EXTENSIONS: frozenset[str] = frozenset(
    {".mp3", ".m4a", ".wav", ".ogg", ".flac", ".aac"}
)
MAX_FILE_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB
CHUNK_SIZE: int = 1024 * 1024  # 1 MB
FILE_TTL_SECONDS: int = 60 * 60  # los archivos se purgan tras 1 hora

# backend/storage/uploads
UPLOAD_DIR: Path = Path(__file__).resolve().parents[2] / "storage" / "uploads"

_FILE_ID_PATTERN = re.compile(r"^[0-9a-f]{32}$")


#  Errores de dominio (el router los traduce a códigos HTTP)                  #
class AudioError(Exception):
    """Error base del módulo de audio."""


class UnsupportedFormatError(AudioError):
    """El archivo no tiene una extensión de audio soportada."""


class FileTooLargeError(AudioError):
    """El archivo supera el tamaño máximo permitido."""


class EmptyFileError(AudioError):
    """El archivo está vacío."""


class AudioNotFoundError(AudioError):
    """No existe un audio con el identificador indicado."""


#  Modelo                                                                     #
@dataclass(frozen=True)
class StoredAudio:
    file_id: str
    filename: str
    format: str  # extensión sin punto, p. ej. "wav"
    size_bytes: int
    path: Path


#  Utilidades internas                                                        #
def _display_name(filename: str | None) -> str:
    """Nombre original sin rutas (acepta separadores de Windows y Unix)."""
    return re.split(r"[\\/]", filename or "")[-1] or "audio"


def _cleanup_expired() -> None:
    """Elimina archivos con más de FILE_TTL_SECONDS de antigüedad."""
    now = time.time()
    for path in UPLOAD_DIR.iterdir():
        if path.is_file() and now - path.stat().st_mtime > FILE_TTL_SECONDS:
            path.unlink(missing_ok=True)


#  API pública                                                                #
def validate_extension(filename: str | None) -> str:
    """Valida la extensión y la devuelve en minúsculas (con punto)."""
    extension = Path(_display_name(filename)).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(e.lstrip(".").upper() for e in ALLOWED_EXTENSIONS))
        raise UnsupportedFormatError(
            f"Formato no soportado. Formatos permitidos: {allowed}."
        )
    return extension


def save_upload(upload: UploadFile) -> StoredAudio:
    """Valida y guarda el archivo en disco con un identificador único."""
    extension = validate_extension(upload.filename)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    _cleanup_expired()

    file_id = uuid.uuid4().hex
    destination = UPLOAD_DIR / f"{file_id}{extension}"
    size = 0

    try:
        with destination.open("wb") as out:
            while chunk := upload.file.read(CHUNK_SIZE):
                size += len(chunk)
                if size > MAX_FILE_SIZE_BYTES:
                    limit_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
                    raise FileTooLargeError(
                        f"El archivo supera el límite de {limit_mb} MB."
                    )
                out.write(chunk)
        if size == 0:
            raise EmptyFileError("El archivo está vacío.")
    except Exception:
        destination.unlink(missing_ok=True)
        raise

    return StoredAudio(
        file_id=file_id,
        filename=_display_name(upload.filename),
        format=extension.lstrip("."),
        size_bytes=size,
        path=destination,
    )


def get_audio_path(file_id: str) -> Path:
    """Ruta en disco de un audio cargado. Úsala desde los demás módulos."""
    if not _FILE_ID_PATTERN.fullmatch(file_id):
        raise AudioNotFoundError("Identificador de audio inválido.")

    matches = list(UPLOAD_DIR.glob(f"{file_id}.*")) if UPLOAD_DIR.exists() else []
    if not matches:
        raise AudioNotFoundError("El audio no existe o ya expiró. Vuelve a cargarlo.")
    return matches[0]


def delete_audio(file_id: str) -> None:
    """Elimina un audio cargado."""
    get_audio_path(file_id).unlink(missing_ok=True)