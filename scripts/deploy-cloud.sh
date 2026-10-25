#!/usr/bin/env bash
# Run on the cloud VM, inside the repo folder: bash scripts/deploy-cloud.sh
# Pulls the latest manifests, applies them, and restarts the apps so they pull the newest images from GHCR.
set -euo pipefail
git pull --ff-only
kubectl apply -k k8s-cloud
kubectl -n docop rollout restart deployment/backend deployment/frontend deployment/admin deployment/mcp-server
for d in backend frontend admin mcp-server; do
  kubectl -n docop rollout status deployment/$d --timeout=5m
done
kubectl -n docop get pods
