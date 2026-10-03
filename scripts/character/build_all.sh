#!/usr/bin/env bash
# Rebuild every Chaewon asset from the CC0 MakeHuman base mesh.
# Requirements: python3 with numpy, scipy, pillow and bpy (previews only);
# node + playwright for SVG rasterisation (PW_DIR); MakeHuman data at
# $MAKEHUMAN_DATA (makehumancommunity/makehuman: makehuman/data).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
python3 face_ref.py build/face_ref.png        # feature masks in the atlas projection (Blender)
python3 build_textures.py build/face_ref.png  # atlas + trim
python3 master.py build/chaewon_master.npz    # body, dress, straps, hair guides
python3 build_walk.py ../../public/assets/decoded/story/wander/saint-walk-2.bin.mesh
python3 build_statics.py
python3 build_frames.py hood1 hood2
python3 build_frames.py profile pillar
python3 build_frames.py eyes widen
python3 build_rigs.py hand pour
python3 build_rigs.py drink
python3 build_rigs.py feet
python3 build_rigs.py float
