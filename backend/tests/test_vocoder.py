# backend/tests/test_vocoder.py
import io
import sys
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from modules.vocoder import logic  # noqa: E402

SR = 22050


def sine(freq: float, seconds: float = 2.0, channels: int = 1) -> logic.AudioData:
    t = np.arange(int(SR * seconds)) / SR
    y = (0.5 * np.sin(2 * np.pi * freq * t)).astype(np.float32)
    return logic.AudioData(np.tile(y[:, None], (1, channels)), SR)


def dominant_freq(audio: logic.AudioData) -> float:
    y = audio.samples[:, 0]
    y = y[SR // 4 : -SR // 4]  # ignora bordes
    spectrum = np.abs(np.fft.rfft(y * np.hanning(len(y)), n=len(y) * 8))
    return float(np.argmax(spectrum) * SR / (len(y) * 8))


@pytest.mark.parametrize("rate", [0.5, 0.75, 1.5, 2.0])
def test_time_stretch_changes_duration_not_pitch(rate):
    src = sine(440)
    out = logic.time_stretch(src, rate)
    assert out.duration == pytest.approx(src.duration / rate, abs=0.01)
    assert dominant_freq(out) == pytest.approx(440, rel=0.01)


@pytest.mark.parametrize("semitones,expected", [(12, 880), (-12, 220), (7, 659.26)])
def test_pitch_shift_changes_pitch_not_duration(semitones, expected):
    src = sine(440)
    out = logic.pitch_shift(src, semitones)
    assert out.samples.shape == src.samples.shape
    assert dominant_freq(out) == pytest.approx(expected, rel=0.01)


def test_identity_parameters_return_input():
    src = sine(440)
    np.testing.assert_array_equal(logic.time_stretch(src, 1.0).samples, src.samples)
    np.testing.assert_array_equal(logic.pitch_shift(src, 0).samples, src.samples)


def test_stft_istft_roundtrip_is_near_perfect():
    y = sine(300).samples[:, 0]
    rebuilt = logic.istft(logic.stft(y), length=len(y))
    np.testing.assert_allclose(rebuilt, y, atol=1e-4)


def test_stereo_is_processed_per_channel():
    out = logic.time_stretch(sine(440, channels=2), 2.0)
    assert out.samples.shape[1] == 2
    np.testing.assert_allclose(out.samples[:, 0], out.samples[:, 1], atol=1e-6)


def test_output_never_clips():
    loud = logic.AudioData((0.99 * sine(440).samples), SR)
    assert np.max(np.abs(logic.pitch_shift(loud, 5).samples)) <= 1.0


@pytest.mark.parametrize("rate", [0.4, 2.1])
def test_rate_out_of_range_rejected(rate):
    with pytest.raises(logic.InvalidParameterError):
        logic.time_stretch(sine(440), rate)


@pytest.mark.parametrize("semitones", [-13, 12.5])
def test_semitones_out_of_range_rejected(semitones):
    with pytest.raises(logic.InvalidParameterError):
        logic.pitch_shift(sine(440), semitones)


def test_wav_encoding_roundtrip():
    data, sr = sf.read(io.BytesIO(logic.encode_wav(sine(440))))
    assert sr == SR and len(data) == SR * 2


# --- Endpoints ---------------------------------------------------------------
@pytest.fixture
def client(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from main import app
    from modules.audio import logic as audio_logic

    monkeypatch.setattr(audio_logic, "UPLOAD_DIR", tmp_path)
    return TestClient(app)


def upload(client) -> str:
    wav = logic.encode_wav(sine(440, seconds=1))
    res = client.post("/api/audio/upload", files={"file": ("a.wav", wav, "audio/wav")})
    return res.json()["file_id"]


def test_endpoints(client):
    file_id = upload(client)
    res = client.post("/api/vocoder/time-stretch", json={"file_id": file_id, "rate": 2.0})
    assert res.status_code == 200 and res.headers["content-type"] == "audio/wav"
    assert len(sf.read(io.BytesIO(res.content))[0]) == pytest.approx(SR / 2, abs=200)

    res = client.post("/api/vocoder/pitch-shift", json={"file_id": file_id, "semitones": 12})
    assert res.status_code == 200


def test_endpoint_errors(client):
    file_id = upload(client)
    assert client.post("/api/vocoder/time-stretch", json={"file_id": file_id, "rate": 5}).status_code == 422
    assert client.post("/api/vocoder/pitch-shift", json={"file_id": "0" * 32, "semitones": 1}).status_code == 404
