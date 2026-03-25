#!/bin/sh
# Docker build script — runs inside a Linux container on the Windows host.
# Called by the docker-publish workflow via:
#   docker run ... docker:24-cli sh /workspace/.github/scripts/docker-build.sh
#
# Required env vars: GHCR_TOKEN, GHCR_USER, IMAGE, PLATFORMS, TAGS (newline-separated)
set -eu

echo "::group::Login to GHCR"
echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin
echo "::endgroup::"

echo "::group::Setup buildx"
BUILDER="ars-multiplatform"
docker buildx create --name "${BUILDER}" --driver docker-container --use 2>/dev/null \
  || docker buildx use "${BUILDER}"
docker buildx inspect --bootstrap
echo "::endgroup::"

# Build tag arguments
TAG_ARGS=""
echo "${TAGS}" | while IFS= read -r tag; do
  [ -z "${tag}" ] && continue
  TAG_ARGS="${TAG_ARGS} -t ${tag}"
done

# Fallback: also build via positional expansion for shells that lose
# subshell variables (the while-pipe issue)
set --
IFS='
'
for tag in ${TAGS}; do
  [ -z "${tag}" ] && continue
  set -- "$@" -t "${tag}"
done

echo "::group::Build and push"
echo "Platforms: ${PLATFORMS}"
echo "Tags: $*"
docker buildx build \
  --platform "${PLATFORMS}" \
  --push \
  "$@" \
  --provenance=true \
  --sbom=true \
  /workspace
echo "::endgroup::"
