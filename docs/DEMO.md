# Evaluation demo

The acceptance tests cover login, all eight workspace sections, a synthetic PDF becoming three outputs, ZIP export, persistent review decisions, refinement resetting approval, source inspection, analytics, settings, deletion and logout. LinkedIn is tested as an optional publishing output.

```bash
npx playwright install chromium
npm run test:e2e
```

For a paced presentation recording and a five-page PDF deck, run `node scripts/record-demo.mjs`; it starts an isolated demo server, creates `docs/demo.webm` and `docs/evaluation-deck.pdf`, and stops the server.

Acceptance recordings are saved below `test-results/`. The paced recorder shows login, Dashboard, a PDF becoming Advisory, Infographic and Executive Summary, ZIP export and History. It also refreshes `docs/login.png`, `docs/dashboard.png`, `docs/demo.webm` and the five-slide `docs/evaluation-deck.pdf`. Keep the clip under two minutes. It uses demo mode without external credentials and demonstrates workflow, not live-model quality.

The test uses an original synthetic fixture under `e2e/fixtures`; it does not redistribute the supplied audit PDF or sensitive operator material. Open `docs/evaluation-deck.html` to present five slides, or use browser Print → Save as PDF (landscape). The architecture document is structured as two pages; paginate at its page boundary if exporting.

For a live demo, configure the relevant provider keys, use approved source material, and check the audio/PPTX services beforehand. Review output accuracy and subtitle alignment before sharing.
