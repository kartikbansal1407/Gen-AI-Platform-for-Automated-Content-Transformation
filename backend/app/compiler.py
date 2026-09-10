"""Safe compilation bridges for generated source artifacts."""

import asyncio
import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import edge_tts

from app.config import get_settings
from app.outputs import OutputType


@dataclass(frozen=True)
class CompiledArtifact:
    path: Path
    media_type: str


def _run(command: list[str], cwd: Path) -> None:
    process = subprocess.run(
        command,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=get_settings().compiler_timeout_seconds,
        check=False,
    )
    if process.returncode:
        detail = (process.stderr or process.stdout).strip()[-800:]
        raise RuntimeError(detail or f"Compiler exited with {process.returncode}.")


def _require(binary: str) -> str:
    resolved = shutil.which(binary)
    if not resolved:
        raise RuntimeError(f"Required compiler '{binary}' is not installed.")
    return resolved


def _compile_presentation(source: str, directory: Path) -> CompiledArtifact:
    source_path, target = directory / "presentation.md", directory / "presentation.pptx"
    source_path.write_text(source, encoding="utf-8")
    _run(
        [_require("marp"), str(source_path), "--pptx", "--output", str(target)],
        directory,
    )
    return CompiledArtifact(
        target,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )


def _compile_advisory(source: str, directory: Path) -> CompiledArtifact:
    source_path, target = directory / "advisory.typ", directory / "advisory.pdf"
    source_path.write_text(source, encoding="utf-8")
    _run([_require("typst"), "compile", str(source_path), str(target)], directory)
    return CompiledArtifact(target, "application/pdf")


def _compile_infographic(source: str, directory: Path) -> CompiledArtifact:
    source_path, target = directory / "infographic.mmd", directory / "infographic.svg"
    source_path.write_text(source, encoding="utf-8")
    _run(
        [
            _require("mmdc"),
            "-i",
            str(source_path),
            "-o",
            str(target),
            "-b",
            "transparent",
        ],
        directory,
    )
    return CompiledArtifact(target, "image/svg+xml")


async def _compile_video(source: str, directory: Path) -> CompiledArtifact:
    package = json.loads(source)
    narration = str(package["narration"]).strip()
    title = str(package.get("title") or "OmniForm AI").strip()[:100]
    if not narration:
        raise RuntimeError("Video agent returned no narration.")
    audio, target = directory / "narration.mp3", directory / "video.mp4"
    await edge_tts.Communicate(narration, get_settings().edge_tts_voice).save(
        str(audio)
    )
    (directory / "title.txt").write_text(title, encoding="utf-8")
    _run(
        [
            _require("ffmpeg"),
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=0x173f4f:s=1280x720:r=30",
            "-i",
            str(audio),
            "-vf",
            "drawtext=textfile=title.txt:fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            str(target),
        ],
        directory,
    )
    return CompiledArtifact(target, "video/mp4")


async def compile_output(
    output: OutputType, source: str, directory: Path
) -> CompiledArtifact:
    directory.mkdir(parents=True, exist_ok=True)
    if output == OutputType.VIDEO:
        return await _compile_video(source, directory)
    if output == OutputType.TWITTER:
        target = directory / "twitter.txt"
        target.write_text(source, encoding="utf-8")
        return CompiledArtifact(target, "text/plain")
    functions = {
        OutputType.PRESENTATION: _compile_presentation,
        OutputType.ADVISORY: _compile_advisory,
        OutputType.INFOGRAPHIC: _compile_infographic,
    }
    return await asyncio.to_thread(functions[output], source, directory)
