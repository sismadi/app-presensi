#!/usr/bin/env sh
# Unduh bobot model face-api.js untuk self-hosting (tanpa ketergantungan CDN saat runtime).
# Setelah selesai: di config.js set MODEL_URL: './models'
set -e
BASE=https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights
DIR="$(dirname "$0")/../models"; mkdir -p "$DIR"
for f in tiny_face_detector_model-weights_manifest.json tiny_face_detector_model-shard1 \
         face_landmark_68_model-weights_manifest.json face_landmark_68_model-shard1 \
         face_recognition_model-weights_manifest.json face_recognition_model-shard1 face_recognition_model-shard2; do
  echo "unduh $f"; curl -fsSL "$BASE/$f" -o "$DIR/$f"
done
echo "Selesai: $(du -sh "$DIR" | cut -f1) di $DIR"
