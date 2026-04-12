FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN corepack enable

WORKDIR /app

COPY openclaw/package.json openclaw/pnpm-lock.yaml /app/openclaw/
COPY weRunOpenClaw/package.json weRunOpenClaw/pnpm-lock.yaml /app/weRunOpenClaw/

RUN cd /app/openclaw && pnpm install --frozen-lockfile
RUN cd /app/weRunOpenClaw && pnpm install --frozen-lockfile

COPY openclaw /app/openclaw
COPY weRunOpenClaw /app/weRunOpenClaw

ARG VITE_OPENCLAW_GEMINI_BASE_URL
ARG VITE_OPENCLAW_GEMINI_API_KEY
ARG VITE_OPENCLAW_LAST_TOUCHED_AT
ARG VITE_OPENCLAW_LAST_TOUCHED_VERSION

ENV VITE_OPENCLAW_GEMINI_BASE_URL=${VITE_OPENCLAW_GEMINI_BASE_URL}
ENV VITE_OPENCLAW_GEMINI_API_KEY=${VITE_OPENCLAW_GEMINI_API_KEY}
ENV VITE_OPENCLAW_LAST_TOUCHED_AT=${VITE_OPENCLAW_LAST_TOUCHED_AT}
ENV VITE_OPENCLAW_LAST_TOUCHED_VERSION=${VITE_OPENCLAW_LAST_TOUCHED_VERSION}

RUN cd /app/openclaw && pnpm build
RUN cd /app/weRunOpenClaw && pnpm build

FROM nginx:1.27-alpine AS runtime

RUN <<EOF cat > /etc/nginx/conf.d/default.conf
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  add_header Cross-Origin-Opener-Policy "same-origin" always;
  add_header Cross-Origin-Embedder-Policy "credentialless" always;
  add_header Cross-Origin-Resource-Policy "cross-origin" always;

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

COPY --from=builder /app/weRunOpenClaw/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
