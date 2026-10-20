#!/bin/sh
# Cloudflare Workers Builds "Build command": sh cf-build.sh
# Production branch (main) keeps the committed root files: sample listings only, no unapproved prices.
# Any other branch build (preview) swaps in .preview/products.js: samples + configurable rings badged
# "Preview: price awaiting Tom's approval". Mode is chosen by the build env, never by code on main.
set -eu
BRANCH="${WORKERS_CI_BRANCH:-${CF_PAGES_BRANCH:-main}}"
if [ "$BRANCH" != "main" ] && [ -f .preview/products.js ]; then
  cp .preview/products.js products.js
  echo "cf-build: PREVIEW mode for branch $BRANCH"
else
  echo "cf-build: production branch ($BRANCH): committed root files, no preview data"
fi
rm -rf .preview
