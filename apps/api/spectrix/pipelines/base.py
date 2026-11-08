from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict, Any

class BasePipeline(ABC):
    @property
    @abstractmethod
    def pipeline_id(self) -> str:
        """Unique identifier of the pipeline."""
        pass

    @property
    @abstractmethod
    def modality(self) -> str:
        """Modality: image, video, audio."""
        pass

    @abstractmethod
    def run(self, file_path: Path, evidence_id: str, case_id: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Executes analysis on the input file and returns a list of raw finding dictionaries
        matching the ForensicFinding schema.
        """
        pass

