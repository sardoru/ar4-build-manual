#!/bin/sh
# Build the deployable site and the artifact variant. Needs only python3.
set -e
cd "$(dirname "$0")"
# public/: the static site Vercel serves. three.js is served from the same origin, so the page loads no third-party script.
python3 tools/build.py vendor/starter.html src data public/index.html --standalone --local-three three-r128.min.js
cp vendor/three-r128.min.js public/three-r128.min.js
cp THIRD_PARTY_NOTICES.md public/THIRD_PARTY_NOTICES.txt
# dist/artifact.html: the page body for a claude.ai artifact (three.js from cdnjs, as the artifact host requires)
python3 tools/build.py vendor/starter.html src data dist/artifact.html
