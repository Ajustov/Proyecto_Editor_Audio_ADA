# backend/modules/vocoder/router.py
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from modules.audio import logic as audio_logic
from modules.audio.router import _to_http_error as _audio_http_error

from . import logic

router = APIRouter()

_STATUS_BY_ERROR: dict[type[logic.VocoderError], int] = {
    logic.InvalidParameterError: 422,
    logic.AudioDecodeError: 400,
    logic.AudioTooLongError: 413,
}


class TimeStretchRequest(BaseModel):
    file_id: str
    rate: float = Field(
        default=1.0,
        ge=logic.MIN_RATE,
        le=logic.MAX_RATE,
        description="Velocidad: >1 más rápido, <1 más lento.",
    )


class PitchShiftRequest(BaseModel):
    file_id: str
    semitones: float = Field(
        default=0.0,
        ge=logic.MIN_SEMITONES,
        le=logic.MAX_SEMITONES,
        description="Desplazamiento de tono en semitonos.",
    )


def _process(file_id: str, operation) -> Response:
    try:
        path = audio_logic.get_audio_path(file_id)
        result = operation(logic.load_audio(path))
        wav = logic.encode_wav(result)
    except audio_logic.AudioError as exc:
        raise _audio_http_error(exc) from exc
    except logic.VocoderError as exc:
        raise HTTPException(_STATUS_BY_ERROR.get(type(exc), 400), str(exc)) from exc
    return Response(content=wav, media_type="audio/wav")


# Endpoints síncronos (`def`): FastAPI los ejecuta en un threadpool, así el
# procesamiento pesado no bloquea el event loop.
@router.post("/time-stretch", response_class=Response)
def time_stretch(body: TimeStretchRequest) -> Response:
    return _process(body.file_id, lambda audio: logic.time_stretch(audio, body.rate))


@router.post("/pitch-shift", response_class=Response)
def pitch_shift(body: PitchShiftRequest) -> Response:
    return _process(body.file_id, lambda audio: logic.pitch_shift(audio, body.semitones))
