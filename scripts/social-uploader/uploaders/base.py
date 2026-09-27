"""
uploaders/base.py - Classe base abstrata para todos os uploaders de redes sociais.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any, Optional
import time

class BaseUploader(ABC):
    def __init__(self, name: str):
        self.name = name

    def validate_file(self, video_path: str) -> Path:
        """Valida se o arquivo de vídeo existe e possui tamanho mínimo."""
        path = Path(video_path).resolve()
        if not path.exists():
            raise FileNotFoundError(f"Arquivo de vídeo não encontrado: {path}")
        if path.stat().st_size < 1000:
            raise ValueError(f"Arquivo de vídeo muito pequeno ou corrompido ({path.stat().st_size} bytes): {path}")
        return path

    @abstractmethod
    def upload(
        self, 
        video_path: str, 
        caption: str, 
        title: Optional[str] = None, 
        link: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Executa o upload do vídeo na plataforma.
        Deve retornar um dicionário com:
        {
            "success": bool,
            "platform": str,
            "post_url": Optional[str],
            "error": Optional[str]
        }
        """
        pass
