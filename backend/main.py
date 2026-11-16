# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from modules.audio.router import router as audio_router
from modules.vocoder.router import router as vocoder_router

app = FastAPI(title="Audio Editor API", version="1.0")

# Permitir peticiones desde el Frontend de React (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Puerto por defecto de Vite/React
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers de los módulos
app.include_router(audio_router, prefix="/api/audio", tags=["Audio"])
app.include_router(vocoder_router, prefix="/api/vocoder", tags=["Vocoder"])


@app.get("/")
def read_root():
    return {"message": "API del Editor de Audio funcionando correctamente"}