# backend/modules/audio/__init__.py
"""Módulo central de audio: subida, validación y almacenamiento temporal."""

from .logic import get_audio_path

__all__ = ["get_audio_path"]