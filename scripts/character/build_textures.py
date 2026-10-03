"""Regenerate Chaewon's atlas and trim textures."""
import os
import sys
import face_art
import textures
import svgrender

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '../../public/assets/images/story/chaewon')
ref = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'build/face_ref.png')
svg = face_art.face_svg(ref)
face_png = os.path.join(HERE, 'build/face.png')
svgrender.svg2png(svg, face_png, 1024, 1024)
textures.write_textures(os.path.join(HERE, 'build'), face_png, svgrender.svg2png,
                        face_svg=face_art.face_svg(ref, closeup=True))
os.replace(os.path.join(HERE, 'build/chaewon_atlas.png'), os.path.join(OUT, 'atlas.png'))
os.replace(os.path.join(HERE, 'build/chaewon_trim.png'), os.path.join(OUT, 'trim.png'))
print('textures written to', OUT)
