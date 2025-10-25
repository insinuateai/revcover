#!/usr/bin/env bash
set -euo pipefail

ORG_NAME=${ORG_NAME:-Revcover}
RECOVERED_USD=${RECOVERED_USD:-12500}
RECOVERY_RATE=${RECOVERY_RATE:-42}
NEW_RUNS=${NEW_RUNS:-17}
TIMEFRAME=${TIMEFRAME:-"last 7 days"}

cat <<REPORT
To: stakeholders@${ORG_NAME,,}.com
Subject: ${ORG_NAME} KPI Update (${TIMEFRAME})

Hi team,

Here are the latest recovery KPIs for ${TIMEFRAME}:
  • Recovered: \\$${RECOVERED_USD}
  • Recovery rate: ${RECOVERY_RATE}%
  • New runs: ${NEW_RUNS}

We remain on track for our Proof-of-Value. Reply if you need deeper detail.

— Revcover Ops
REPORT
