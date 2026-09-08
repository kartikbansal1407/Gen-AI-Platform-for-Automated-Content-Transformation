# Content Forge

Content Forge is a Gen AI–powered content transformation platform built for the **Smart India Hackathon**, addressing Problem Statement **26154** ("Gen AI Platform for Automated Content Transformation") for the **National Technical Research Organisation (NTRO)** under the Smart Automation theme.

It takes operator-submitted source content — text, documents, articles, reports, images, videos, links, or free-form prompts — and transforms it into operator-selected output formats: **Video Package, LinkedIn Post, Twitter/X Post, Advisory, Infographic, Executive Summary, or Presentation**. The operator controls target audience, tone, language, level of detail, communication objective, and content style for each transformation.

This MVP is built as a Python service, structured across multiple modules rather than a single monolithic script.

## What Works

- Ingestion pipeline for text, documents, articles, reports, images, and video inputs.
- Link handling: fetches a submitted URL, reads its contents, and analyzes any embedded images before transformation.
- Operator controls for audience, tone, language, detail level, objective, and style.
- Output generators for LinkedIn Post, Twitter/X Post, Advisory, Executive Summary, and Infographic.
- Video package generation with narration audio via ElevenLabs.
- Presentation generation via a self-hosted Presenton instance (backend API only, no Presenton frontend).
- Modular Python codebase split by concern (ingestion, transformation, output generation).

## Architecture

- `src/ingestion/` — handles source content intake: text, document parsing, link fetching, and image analysis.
- `src/transform/` — core Gen AI transformation logic; maps source content + operator controls to a target output type.
- `src/outputs/` — one module per output type (video, linkedin, twitter, advisory, infographic, summary, presentation).
- `src/outputs/video.py` — assembles video packages and calls ElevenLabs for narration audio.
- `src/outputs/presentation.py` — calls a self-hosted Presenton backend API to generate presentation output.
- `src/api/` — application entry points / routes exposing the transformation pipeline.

*(Adjust the above paths to match your actual repo layout — update this section once the codebase structure is finalized.)*

## Local Development

```bash
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in the required keys below before running the service.

```bash
python src/main.py
```

## Environment Variables

Copy `.env.example` to `.env` for local development. Do not commit `.env`.

- `AI_PROVIDER`: Gen AI provider used for content transformation (e.g. `gemini` or `openai`).
- `GEMINI_API_KEY` / `OPENAI_API_KEY`: API key for the selected Gen AI provider.
- `ELEVENLABS_API_KEY`: separate API key for video narration audio generation.
- `PRESENTON_API_URL`: base URL of the self-hosted Presenton backend used for Presentation output.
- `PRESENTON_API_KEY`: credential for the Presenton backend API, if configured.

## Input Handling

Content Forge must accept and correctly process:

- News articles, reports, advisories, threat intelligence, policy documents, research papers, announcements, and incident reports.
- Free-form prompts describing what the operator wants generated.
- URLs — the system fetches the page, reads its text content, and analyzes any embedded images as part of the source material.

## Output Types

| Output | Description |
|---|---|
| Video Package | Short video with narration audio (ElevenLabs) |
| LinkedIn Post | Platform-formatted professional post |
| Twitter/X Post | Platform-formatted short post |
| Advisory | Structured advisory document |
| Infographic | Visual summary of key points |
| Executive Summary | Condensed written summary |
| Presentation | Slide deck via self-hosted Presenton |

## Testing

```bash
pytest
```

## Security Notes

- Never commit secrets; all `.env*` files should be Git-ignored.
- Validate all operator inputs, including fetched links and uploaded files, before processing.
- Content Forge must not automate scraping abuse, CAPTCHA bypasses, or deceptive platform behavior when fetching linked content.

## SIH Evaluation Deliverables

- Source code repository link.
- This README, with setup instructions.
- Architecture document (max 2 pages).
- Demo video (max 2 minutes).
- Technical presentation (max 5 slides).

## Known Limitations

- Presentation output depends on a running, self-hosted Presenton instance.
- Video narration depends on a valid ElevenLabs API key.
- Live Gen AI generation needs `GEMINI_API_KEY` or `OPENAI_API_KEY` configured.

## Roadmap

1. Finalize ingestion pipeline for all required source content types.
2. Complete output generators for all seven output types.
3. Wire up Presenton backend integration end-to-end.
4. Add automated tests covering ingestion, transformation, and each output type.
5. Prepare architecture document, demo video, and technical presentation for evaluation.
