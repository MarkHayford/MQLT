#!/usr/bin/env bash
# Compile uni-app x on the build host, optionally upload with miniprogram-ci.
set -euo pipefail

ROOT=/data/mqlt
PROJECT="$ROOT/miniprogram"
CI="$ROOT/ci"
HB="${HB_HOME:-/data/tools/hbuilderx}"
export PATH="/data/tools/node/bin:$PATH"

APPID="${MQLT_APPID:-wx38f1bdc8a75c53df}"
VERSION="${MQLT_VERSION:-}"
DESC="${MQLT_DESC:-server ci $(date -u +%Y-%m-%dT%H:%M:%SZ)}"
PRIVATE_KEY="${MQLT_PRIVATE_KEY:-$CI/keys/private.$APPID.key}"
UPLOAD="${MQLT_UPLOAD:-0}"
ROBOT="${MQLT_ROBOT:-1}"

if [[ -z "$VERSION" && -f "$PROJECT/manifest.json" ]]; then
  VERSION=$(python3 -c 'import re,sys; t=open(sys.argv[1],encoding="utf-8").read(); m=re.search(r"\"versionName\"\s*:\s*\"([^\"]+)\"", t); print(m.group(1) if m else "1.0.0")' "$PROJECT/manifest.json")
fi
VERSION="${VERSION:-1.0.0}"
PROJECT_NAME="${MQLT_PROJECT_NAME:-miniprogram}"

if [[ ! -x "$HB/cli" ]]; then
  echo "HBuilderX CLI not found at $HB/cli" >&2
  exit 1
fi

mkdir -p "$CI/logs"
LOG="$CI/logs/publish-$(date +%Y%m%d-%H%M%S).log"

echo "== open HBuilderX CLI =="
if ! pgrep -f '/data/tools/HBuilderX/HBuilderX' >/dev/null; then
  timeout 20 "$HB/cli" open >>"$LOG" 2>&1 || true
  sleep 3
fi
if [[ -f "$CI/keys/dcloud.env" ]]; then
  # shellcheck disable=SC1091
  source "$CI/keys/dcloud.env"
  if [[ -n "${DCLOUD_USERNAME:-}" && -n "${DCLOUD_PASSWORD:-}" ]]; then
    "$HB/cli" user login --username "$DCLOUD_USERNAME" --password "$DCLOUD_PASSWORD" >>"$LOG" 2>&1 || true
  fi
fi

echo "== import project $PROJECT =="
"$HB/cli" project open --path "$PROJECT" >>"$LOG" 2>&1

echo "== compile mp-weixin =="
# Linux CLI cannot finish cli publish without DCloud real-name auth.
# launch --compile true does a local uni-app x compile (dev dist).
set +e
"$HB/cli" launch mp-weixin --project "$PROJECT_NAME" --compile true >>"$LOG" 2>&1
compile_rc=$?
set -e
if grep -qE 'Please Login in!|real person authentication|实名' "$LOG"; then
  echo "HBuilderX compile blocked (login or real-name). see $LOG" >&2
  tail -40 "$LOG" >&2
  exit 1
fi

DIST_DEV="$PROJECT/unpackage/dist/dev/mp-weixin"
DIST_BUILD="$PROJECT/unpackage/dist/build/mp-weixin"
DIST=""
if [[ -f "$DIST_DEV/app.json" ]]; then
  DIST="$DIST_DEV"
elif [[ -f "$DIST_BUILD/app.json" ]]; then
  DIST="$DIST_BUILD"
fi
if [[ -z "$DIST" || "$compile_rc" -ne 0 ]]; then
  echo "compile failed: dist app.json missing. see $LOG" >&2
  tail -80 "$LOG" >&2
  exit 1
fi
echo "compiled: $DIST"

# Skyline drops attribute selectors. uni-app x emits ".cls[class]" so page CSS never matches.
echo "== skyline: strip [class] attribute selectors =="
python3 "$CI/strip-skyline-class.py" "$DIST"


if [[ "$UPLOAD" != "1" ]]; then
  echo "skip upload (set MQLT_UPLOAD=1 to upload)"
  exit 0
fi

if [[ ! -f "$PRIVATE_KEY" ]]; then
  echo "missing wechat private key: $PRIVATE_KEY" >&2
  echo "download from mp.weixin.qq.com -> 管理 -> 开发管理 -> 开发设置 -> 小程序代码上传" >&2
  echo "whitelist this server IP in the WeChat MP admin console" >&2
  exit 1
fi

echo "== miniprogram-ci upload $VERSION =="
node "$CI/upload.mjs" \
  --appid "$APPID" \
  --project "$DIST" \
  --private-key "$PRIVATE_KEY" \
  --version "$VERSION" \
  --desc "$DESC" \
  --robot "$ROBOT"
