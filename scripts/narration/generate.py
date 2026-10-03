"""Narration audio + word timestamps for the text boxes (Kokoro TTS).

Run with a Python environment that has kokoro-onnx and soundfile:
  KOKORO_MODEL=kokoro-v1.0.onnx (the model-files-v1.1 export, which reports
  phoneme durations) KOKORO_VOICES=voices-v1.0.bin python generate.py
Writes public/assets/audio/vo/<id>.mp3 and public/assets/data/vo/all_timestamps.json
(same schema as the captured ElevenLabs-style data: word + spacing entries).
"""
import json
import os
import re
import subprocess
import tempfile
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '../..')
AUDIO = os.path.join(ROOT, 'public/assets/audio/vo')
DATA = os.path.join(ROOT, 'public/assets/data/vo/all_timestamps.json')
LEAD = 0.25  # seconds of silence before speech, like the captured files


def align(words, groups, k):
    """DP: assign each phoneme group to 1-3 consecutive words by length."""
    import re as _re
    L = []
    for w in words:
        clean = _re.sub(r"[^A-Za-z'-]", '', w) or w
        L.append(max(1, len(k.tokenizer.phonemize(clean, 'en-us').replace(' ', ''))))
    G = [len(g[2]) for g in groups]
    n, m = len(words), len(groups)
    INF = 1e9
    cost = np.full((m + 1, n + 1), INF)
    back = np.zeros((m + 1, n + 1), int)
    cost[0, 0] = 0
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            for span in (1, 2, 3):
                if j - span < 0 or cost[i - 1, j - span] >= INF:
                    continue
                c = cost[i - 1, j - span] + abs(G[i - 1] - sum(L[j - span:j])) + (span - 1) * 0.5
                if c < cost[i, j]:
                    cost[i, j] = c
                    back[i, j] = span
    spans = []
    j = n
    for i in range(m, 0, -1):
        span = back[i, j]
        s, e, _ = groups[i - 1]
        lens = np.array(L[j - span:j], float)
        edges = s + np.concatenate([[0], np.cumsum(lens)]) / lens.sum() * (e - s)
        for q in range(span - 1, -1, -1):
            spans.append((edges[q], edges[q + 1]))
        j -= span
    return spans[::-1]


def word_groups(timings):
    groups, cur = [], []
    for t in timings:
        if t.phoneme == ' ':
            if cur:
                groups.append(cur)
                cur = []
            continue
        cur.append(t)
    if cur:
        groups.append(cur)
    out = []
    for g in groups:
        spoken = [t for t in g if t.phoneme not in '.,;:!?—…']
        if not spoken:
            if out:
                continue
            spoken = g
        out.append((spoken[0].start, spoken[-1].end, ''.join(t.phoneme for t in spoken)))
    return out


def main():
    cfg = json.load(open(os.path.join(HERE, 'narration.json')))
    k = Kokoro(os.environ.get('KOKORO_MODEL', 'kokoro-v1.0.onnx'), os.environ.get('KOKORO_VOICES', 'voices-v1.0.bin'))
    assert k.has_timings, 'use the model export that reports durations (model-files-v1.1)'
    os.makedirs(AUDIO, exist_ok=True)
    data = {}
    for key, text in cfg['lines'].items():
        speak = text
        for a, b in cfg['speak_replace'].items():
            speak = speak.replace(a, b)
        audio, sr, timings = k.create_timed(speak, voice=cfg['voice'], speed=cfg['speed'], lang='en-us')
        words = text.split()
        groups = word_groups(timings)
        spans = [(a, b) for a, b, _ in groups] if len(groups) == len(words) else align(words, groups, k)
        if len(spans) != len(words):
            total = len(audio) / sr
            lens = np.array([len(w) + 2 for w in words], float)
            edges = np.concatenate([[0], np.cumsum(lens)]) / lens.sum() * total
            spans = list(zip(edges[:-1], edges[1:]))
            print(key, 'word count mismatch; proportional timing')
        pad = np.zeros(int(LEAD * sr), np.float32)
        audio = np.concatenate([pad, audio, np.zeros(int(0.35 * sr), np.float32)])
        entries = []
        for i, (w, (s, e)) in enumerate(zip(words, spans)):
            entries.append({'text': w, 'start': round(s + LEAD, 3), 'end': round(e + LEAD, 3), 'type': 'word', 'speaker_id': None})
            if i < len(words) - 1:
                nxt = spans[i + 1][0] + LEAD
                entries.append({'text': ' ', 'start': round(e + LEAD, 3), 'end': round(max(nxt, e + LEAD), 3), 'type': 'spacing', 'speaker_id': None})
        data[key] = {'text': text, 'language_code': 'eng', 'language_probability': 1, 'words': entries}
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            sf.write(f.name, audio, sr)
            wav = f.name
        out = os.path.join(AUDIO, f'{key}.mp3')
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', wav,
                        '-af', 'highpass=f=70,loudnorm=I=-20:TP=-1.5:LRA=11,aresample=44100',
                        '-ac', '1', '-b:a', '96k', out], check=True)
        os.remove(wav)
        print(key, f'{len(audio) / sr:.1f}s', len(words), 'words')
    json.dump(data, open(DATA, 'w'), ensure_ascii=False)


if __name__ == '__main__':
    main()
