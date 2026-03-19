# =============================================================================
# Ars - 統合Webサーバー Dockerfile
#
# Stage 1: Frontend build (React + Vite)
# Stage 2: Backend build (Rust + Axum)
# Stage 3: Runtime
# =============================================================================

# --- Stage 1: Frontend Build ---
FROM node:20-slim AS frontend-builder
WORKDIR /app

COPY ars-editor/package.json ars-editor/package-lock.json* ./
RUN npm ci --ignore-scripts 2>/dev/null || npm install

COPY ars-editor/ .
RUN npm run build

# --- Stage 2: Backend Build ---
FROM rust:1-bookworm AS backend-builder
WORKDIR /app

# Copy all Cargo files for dependency resolution
COPY ars-editor/src-tauri/Cargo.toml ars-editor/src-tauri/Cargo.toml
COPY resource-depot/src-tauri/Cargo.toml resource-depot/src-tauri/Cargo.toml
COPY data-organizer/Cargo.toml data-organizer/Cargo.toml

# Copy source code
COPY ars-editor/src-tauri/src/ ars-editor/src-tauri/src/
COPY resource-depot/src-tauri/src/ resource-depot/src-tauri/src/
COPY resource-depot/src-tauri/build.rs resource-depot/src-tauri/build.rs
COPY data-organizer/src/ data-organizer/src/

# Install system dependencies for git2/openssl
RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev libgit2-dev cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/ars-editor/src-tauri
RUN cargo build --features web-server --no-default-features --bin ars-web-server --release

# --- Stage 3: Runtime ---
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y \
    ca-certificates libssl3 libgit2-1.5 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m ars
USER ars
WORKDIR /app

COPY --from=backend-builder /app/ars-editor/src-tauri/target/release/ars-web-server ./ars-web-server
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 5173
CMD ["./ars-web-server", "./dist"]
