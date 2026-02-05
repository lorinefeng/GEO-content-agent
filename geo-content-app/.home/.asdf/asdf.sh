#!/usr/bin/env bash
set -euo pipefail

export ASDF_DIR="/opt/buildhome/.asdf"

if [ -f "${ASDF_DIR}/asdf.sh" ]; then
  . "${ASDF_DIR}/asdf.sh"
else
  echo "ASDF bootstrap failed: ${ASDF_DIR}/asdf.sh not found" >&2
  exit 1
fi
