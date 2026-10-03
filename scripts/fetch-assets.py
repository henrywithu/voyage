"""Download only public, source-observed assets and record provenance."""
import concurrent.futures
import hashlib
import json
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
paths = json.loads((ROOT / 'reference/asset-paths.json').read_text())
audio_fallbacks = '--audio-fallbacks' in sys.argv
if audio_fallbacks:
    # AudioConfig.FILE_TYPE selects the same track stem with .mp3 when Ogg is unsupported.
    variants = [path[:-4] + '.mp3' for path in paths if path.startswith('assets/audio/') and path.endswith('.ogg')]
    paths = sorted(set(paths + variants))
    (ROOT / 'reference/asset-paths.json').write_text(json.dumps(paths, indent=2))
    requested = variants
else:
    requested = paths

def fetch(path):
    url = 'https://santionispirits.com/' + path
    dest = ROOT / 'public' / path
    try:
        if not dest.exists():
            with urllib.request.urlopen(url, timeout=45) as response:
                data = response.read()
            if data.lstrip().startswith(b'<!DOCTYPE'):
                return {'path': path, 'url': url, 'status': 'html-fallback'}
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        data = dest.read_bytes()
        return {'path': path, 'url': url, 'status': 'downloaded', 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    except Exception as error:
        return {'path': path, 'url': url, 'status': str(error)}

with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
    results = list(pool.map(fetch, requested))
if audio_fallbacks:
    previous = json.loads((ROOT / 'reference/asset-provenance.json').read_text())
    merged = {row['path']: row for row in previous}
    merged.update({row['path']: row for row in results})
    results = [merged[path] for path in paths]
(ROOT / 'reference/asset-provenance.json').write_text(json.dumps(results, indent=2))
print(json.dumps({'downloaded': sum(x['status'] == 'downloaded' for x in results), 'total': len(results), 'bytes': sum(x.get('bytes', 0) for x in results)}))
for row in results:
    if row['status'] != 'downloaded':
        print(row['path'], row['status'])
