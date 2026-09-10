FROM node:22-bookworm-slim

ENV PYTHONUNBUFFERED=1 PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium PATH=/opt/venv/bin:$PATH
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates chromium curl ffmpeg fonts-dejavu-core python3 python3-venv xz-utils \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --global @marp-team/marp-cli@4.2.3 @mermaid-js/mermaid-cli@11.12.0
ARG TARGETARCH
RUN case "$TARGETARCH" in \
      amd64) target=x86_64-unknown-linux-musl ;; \
      arm64) target=aarch64-unknown-linux-musl ;; \
      *) echo "Unsupported architecture: $TARGETARCH" && exit 1 ;; \
    esac \
    && curl -fsSL "https://github.com/typst/typst/releases/download/v0.13.1/typst-${target}.tar.xz" -o /tmp/typst.tar.xz \
    && mkdir /tmp/typst && tar -xJf /tmp/typst.tar.xz -C /tmp/typst --strip-components=1 \
    && mv /tmp/typst/typst /usr/local/bin/typst && rm -rf /tmp/typst /tmp/typst.tar.xz

COPY backend/requirements.txt ./requirements.txt
RUN python3 -m venv /opt/venv && pip install --no-cache-dir -r requirements.txt
COPY backend ./
RUN mkdir -p /app/outputs && chown -R node:node /app
USER node
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
