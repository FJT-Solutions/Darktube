#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Darktube Audio Beat & Peak Extractor (Movez 12-Step Course Pattern)
Analisa arquivos de áudio (MP3, WAV) e gera um grid rítmico JSON para o Remotion:
- bpm: Batidas por minuto
- beats: Timestamps exatos de cada batida (para transições no tempo)
- downbeats: Início de cada compasso de 4 tempos (para grandes trocas de cena)
- hits: Picos dinâmicos de energia (para posicionamento automático de SFX)
"""

import sys
import json
import os

try:
    import numpy as np
    import librosa
except ImportError:
    print(json.dumps({
        "error": "Bibliotecas librosa e numpy necessárias. Instale com: pip install numpy librosa soundfile"
    }))
    sys.exit(1)

def analyze_track(audio_path):
    if not os.path.exists(audio_path):
        return {"error": f"Arquivo não encontrado: {audio_path}"}

    y, sr = librosa.load(audio_path, sr=None, mono=True)
    tempo, frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
    beats = librosa.frames_to_time(frames, sr=sr).round(3).tolist()
    onset = librosa.onset.onset_strength(y=y, sr=sr)
    peaks = librosa.util.peak_pick(
        onset, pre_max=3, post_max=3, pre_avg=3, post_avg=5, delta=0.5, wait=10
    )

    bpm_val = float(np.atleast_1d(tempo)[0]) if hasattr(tempo, "__len__") else float(tempo)

    return {
        "bpm": round(bpm_val, 1),
        "beats": beats,
        "downbeats": beats[::4],
        "hits": librosa.frames_to_time(peaks, sr=sr).round(3).tolist(),
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python beats.py <caminho_do_audio.wav|mp3>")
        sys.exit(1)
    
    result = analyze_track(sys.argv[1])
    print(json.dumps(result, indent=2))
