#!/bin/sh

set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"

corepack enable
pnpm install --frozen-lockfile
pnpm run build:web
pnpm exec cap sync ios
