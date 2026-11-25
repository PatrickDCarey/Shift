#!/bin/bash
# bash batch.sh clip1 clip2 ...   (sequential; each clip is written and encoded before the next starts)
cd "$(dirname "$0")"
for c in "$@"; do timeout 1200 node shots.mjs "$c" 2>&1 | tail -n 3; done
