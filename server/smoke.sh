#!/usr/bin/env bash
set -e
B=localhost:3000
jq_id() { python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])'; }

echo "== health =="; curl -s $B/health; echo
PID=$(curl -s -X POST $B/projects -H 'Content-Type: application/json' -d '{"name":"测试项目"}' | jq_id)
echo "project=$PID"
CID=$(curl -s -X POST $B/projects/$PID/chapters -H 'Content-Type: application/json' -d '{}' | jq_id)
echo "chapter=$CID"
SID=$(curl -s -X POST $B/chapters/$CID/shots -H 'Content-Type: application/json' -d '{}' | jq_id)
echo "shot=$SID"
curl -s -X PUT $B/shots/$SID -H 'Content-Type: application/json' -d '{"scriptContent":"主角走进房间"}' > /dev/null
echo "script saved"
GID=$(curl -s -X POST $B/shots/$SID/generations -H 'Content-Type: application/json' -d '{"assetIds":[],"templateId":null}' | jq_id)
echo "generation=$GID"
sleep 2
echo "== poll =="; curl -s $B/generations/$GID; echo
echo "== chapters tree =="; curl -s $B/projects/$PID/chapters; echo
echo "== active =="; curl -s $B/generations/active; echo
