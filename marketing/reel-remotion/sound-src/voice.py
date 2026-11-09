"""Render the reel's nine voice lines with Kokoro (am_michael), fit each to its beat, write voice.json.

Usage: python -I voice.py <voice-name>
Each line becomes <sound>/NN-name.wav: 48 kHz mono, exactly the beat's length (longer only if a line overruns),
speech placed AIR seconds after the file start. Word starts come from Kokoro's own phoneme durations.
"""
import json, subprocess, sys, re
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = "/private/tmp/claude-501/-Users-uzairspc-Regulars/76094edf-7763-4727-ab26-8c81e4426640/scratchpad/reel/"
SOUND = ROOT + "sound/"
VOICE = sys.argv[1] if len(sys.argv) > 1 else "am_michael"
AIR = 0.2
SR = 24000
OUT_SR = 48000
TARGET_LUFS = -16.0

# (file, beat start, beat end, spoken text, caption, caption->spoken map: how many spoken words each caption word covers)
LINES = [
    ("01-question", 0, 3, "Where did January's new members go?", "Where did January's new members go?", None),
    ("02-six-in-ten", 3, 7, "Six in ten are gone by month three.", "6 in 10 new members are gone by month three.",
     [1, 1, 1, 0, 0, 1, 1, 1, 1, 1]),
    ("03-the-line", 7, 12,
     "The ones who stay come three times a week. Seventy-eight percent of them renewed. Under once a week, fifty-nine percent.",
     "The ones who stay come three times a week. 78% of them renewed. Under once a week, 59%.",
     [1] * 9 + [2] + [1] * 7 + [2]),
    ("04-the-mark", 12, 14, "Meet Regulars.", "Meet Regulars.", None),
    ("05-check-in", 14, 17, "Every check-in counts.", "Every check-in counts.", None),
    ("06-slipping", 17, 20, "See who's slipping, before they're gone.", "See who's slipping, before they're gone.", None),
    ("07-nudge", 20, 23, "One tap, and his coach's text is on its way.", "One tap, and his coach's text is on its way.", None),
    ("08-back", 23, 26, "And Sam's back.", "And Sam's back.", None),
    ("09-end-card", 26, 30, "Regulars. Turn new members into regulars.", "Regulars. Turn new members into regulars.", None),
]
# Line 3 cannot fit 7-12 s at speed 1.15 (6.6 s of speech for a 4.6 s window), so it starts early, on the beat
# at 5.5 s (a J-cut under the 6-in-10 picture) and ends by 12.3 s; "Meet Regulars." then starts on the beat at 12.45 s.
PLACE = {"03-the-line": {"file_start": 5.3, "window_end": 12.3}, "04-the-mark": {"offset": 0.45}}
STRESS = {"01-question": ["January's"]}  # from the brief; other lines leave stress to the film
# speed first, then tighter pauses, as the brief allows (0.9 to 1.15)
TRIES = [(s, 0.25, 0.1) for s in (1.0, 1.05, 1.1, 1.15)] + [(1.15, 0.12, 0.06), (1.15, 0.06, 0.03)]

k = Kokoro(ROOT + "models/kokoro-v1.0.onnx", ROOT + "models/voices-v1.0.bin")


def speech_bounds(a):
    f = int(0.01 * SR)
    n = len(a) // f
    rms = np.sqrt(np.mean(a[: n * f].reshape(n, f) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms / rms.max())
    on = np.where(db > -40)[0]
    return on[0] * f, (on[-1] + 1) * f


def word_starts(timings, n_words):
    """Start time of each space-separated word, from the phoneme timings."""
    starts, new = [], True
    for t in timings:
        if t.phoneme == " ":
            new = True
            continue
        if new and re.match(r"[^\s.,?!;:—…\"“”]", t.phoneme):
            starts.append(t.start)
            new = False
    return starts if len(starts) == n_words else None


def loudness(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    i = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1])
    tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)[-1])
    return i, tp


def level(raw, dst, gain):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af",
                    f"highpass=f=70,acompressor=threshold=-24dB:ratio=2:attack=8:release=120:knee=6,"
                    f"volume={gain:.2f}dB,aresample=192000,alimiter=limit=0.79:attack=2:release=60:level=false,"
                    f"aresample={OUT_SR}:filter_type=kaiser:filter_size=64", "-ac", "1", "-c:a", "pcm_s24le", dst], check=True)


out = {"voice": VOICE, "model": "Kokoro v1.0 (kokoro-onnx 0.6.1)", "sample_rate": OUT_SR, "air_s": AIR,
       "word_timing": "word starts from Kokoro's phoneme durations (the model's own duration output)", "lines": []}
for name, b0, b1, text, caption, cmap in LINES:
    pl = PLACE.get(name, {})
    fs = pl.get("file_start", b0)
    off = pl.get("offset", AIR)
    window = pl.get("window_end", b1 - AIR) - (fs + off)
    words = text.split()
    for speed, sp, cp in TRIES:
        a, sr, tim = k.create_timed(text, VOICE, speed, "en-us", sentence_pause=sp, clause_pause=cp)
        s0, s1 = speech_bounds(a)
        dur = (s1 - s0) / SR
        if dur <= window:
            break
    starts = word_starts(tim, len(words))
    if starts is None:  # fall back to a character share
        chars = np.array([len(w) + 1 for w in words], float)
        starts = list(s0 / SR + np.concatenate([[0], np.cumsum(chars)[:-1]]) / chars.sum() * dur)
    seg = a[s0:s1]
    fade = int(0.008 * SR)
    seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
    total = max(b1 - fs, off + dur + AIR)
    buf = np.zeros(int(round(total * SR)), np.float32)
    buf[int(off * SR): int(off * SR) + len(seg)] = seg
    raw = SOUND + "raw/" + name + ".wav"
    sf.write(raw, buf, SR, subtype="FLOAT")
    # level: 70 Hz high-pass, gentle compression, a fixed gain to the target, a true-peak-safe limiter, 48 kHz
    i0, _ = loudness(raw)
    gain = TARGET_LUFS - i0
    dst = SOUND + name + ".wav"
    for _pass in range(3):
        level(raw, dst, gain)
        i1, tp1 = loudness(dst)
        if abs(i1 - TARGET_LUFS) < 0.3:
            break
        gain += TARGET_LUFS - i1
    # map caption words to spoken words
    if cmap is None:
        cmap = [1] * len(caption.split())
    cap_words, si = [], 0
    rel = [s - s0 / SR for s in starts]  # relative to speech start
    for cw, n in zip(caption.split(), cmap):
        if n:
            t = rel[si]
            si += n
        else:  # not spoken: share the previous spoken word's span
            prev = cap_words[-1]["t"]
            nxt = rel[si] if si < len(rel) else dur
            t = prev + (nxt - prev) * 0.5 * (1 + sum(1 for c in cap_words if c.get("unspoken")) ) / 3
        w = {"word": cw, "t": round(t, 3), "at": round(fs + off + t, 3)}
        if n == 0:
            w["unspoken"] = True
        if cw.strip(".,?!") in STRESS.get(name, []):
            w["stress"] = True
        cap_words.append(w)
    assert si == len(words), (name, si, len(words))
    spoken = [{"word": w, "t": round(r, 3), "at": round(fs + off + r, 3)} for w, r in zip(words, rel)]
    line = {"file": dst, "beat": name[3:], "beat_start": b0, "beat_end": b1, "file_start": fs,
            "file_duration": round(len(buf) / SR, 3), "speech_offset": off, "speech_start_at": round(fs + off, 3),
            "speech_duration": round(dur, 3), "speech_end_at": round(fs + off + dur, 3),
            "fits": bool(dur <= window + 1e-9), "moved": bool(pl), "spare_s": round(window - dur, 3),
            "speed": speed, "sentence_pause": sp, "clause_pause": cp,
            "text_spoken": text, "caption": caption, "lufs": i1, "true_peak_dbtp": tp1,
            "words": cap_words, "spoken_words": spoken}
    out["lines"].append(line)
    print(f"{name}: speed {speed} pauses {sp}/{cp} speech {dur:.2f}s window {window:.2f}s "
          f"{'OK' if line['fits'] else 'OVER %.2fs' % (dur - window)} {i1} LUFS {tp1} dBTP")
json.dump(out, open(SOUND + "voice.json", "w"), indent=1)
