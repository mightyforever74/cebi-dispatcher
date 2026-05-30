#!/bin/bash
# Inspect GeoJSON layer structure
set -e

for LAYER in 19419 42487; do
  echo "=== Layer $LAYER ==="
  FILE="/tmp/layer_${LAYER}.json"
  
  POLY=$(grep -o '"type":"Polygon"' "$FILE" | wc -l)
  MULTI=$(grep -o '"type":"MultiPolygon"' "$FILE" | wc -l)
  FEATS=$(grep -o '"type":"Feature"' "$FILE" | wc -l)
  
  echo "Features:      $FEATS"
  echo "Polygon:       $POLY"
  echo "MultiPolygon:  $MULTI"
  echo "File size:     $(wc -c < $FILE) bytes"
  echo ""
done