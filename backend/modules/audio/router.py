# backend/modules/audio/router.py
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from . import logic

router = APIRouter()


class AudioUploadResponse(BaseModel):
    success: bool
    file_id: str
    filename: str
    format: str
    size_bytes: int


_STATUS_BY_ERROR: dict[type[logic.AudioError], int] = {
    logic.UnsupportedFormatError: 415,
    logic.FileTooLargeError: 413,
    logic.EmptyFileError: 400,
    logic.AudioNotFoundError: 404,
}


def _to_http_error(exc: logic.AudioError) -> HTTPException:
    return HTTPException(
        status_code=_STATUS_BY_ERROR.get(type(exc), 400),
        detail=str(exc),
    )


# Endpoints síncronos (`def`): FastAPI los ejecuta en un threadpool,
# así la escritura en disco no bloquea el event loop.
@router.post(
    "/upload",
    response_model=AudioUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_audio(file: UploadFile = File(...)) -> AudioUploadResponse:
    try:
        stored = logic.save_upload(file)
    except logic.AudioError as exc:
        raise _to_http_error(exc) from exc

    return AudioUploadResponse(
        success=True,
        file_id=stored.file_id,
        filename=stored.filename,
        format=stored.format,
        size_bytes=stored.size_bytes,
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_audio(file_id: str) -> None:
    try:
        logic.delete_audio(file_id)
    except logic.AudioError as exc:
        raise _to_http_error(exc) from exc