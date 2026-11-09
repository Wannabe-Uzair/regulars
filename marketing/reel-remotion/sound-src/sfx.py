"""Soft UI sounds for the reel, numpy only: key-tap-1..3, chime, sent, tick, tap (48 kHz mono 24-bit).

Every sound starts at t = 0 (no leading silence) with a raised-cosine attack of at least 1.5 ms.
Writes <sound>/sfx/*.wav and <sound>/sfx/sfx.json (each file's peak time, for syncing to picture).
"""
import json, os, sys
import numpy as np
sys.path.insert(0, "/private/tmp/claude-501/-Users-uzairspc-Regulars/76094edf-7763-4727-ab26-8c81e4426640/scratchpad/reel/src")
from synth import SR, t_of, mtof, fft_filter, write_wav, true_peak_db, rng

OUT = "/private/tmp/claude-501/-Users-uzairspc-Regulars/76094edf-7763-4727-ab26-8c81e4426640/scratchpad/reel/sound/sfx/"
os.makedirs(OUT, exist_ok=True)


def attack(x, ms):
    n = int(ms / 1000 * SR)
    x[:n] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(n) / n)
    return x


def tail(x, ms=10):
    n = int(ms / 1000 * SR)
    x[-n:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(n) / n)
    return x


def norm(x, peak_db):
    return x / np.abs(x).max() * 10 ** (peak_db / 20)


def small_room(x, mix=0.12, tau=0.08):
    t = t_of(0.3)
    ir = fft_filter(rng.standard_normal(len(t)), 300, 6000) * np.exp(-t / tau)
    ir[: int(0.006 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum())
    y = np.convolve(np.concatenate([x, np.zeros(len(t))]), ir)[: len(x) + len(t)]
    out = np.concatenate([x, np.zeros(len(t))]) + mix * y
    return tail(out[: len(x) + int(0.15 * SR)], 20)


def key_tap(pitch):
    """A soft on-screen key: a band of noise (the tap) over a short, low, damped body; little pitch."""
    t = t_of(0.05)
    click = fft_filter(rng.standard_normal(len(t)), 1500 * pitch, 3600 * pitch, slope=3) * np.exp(-t / 0.0025)
    body = fft_filter(rng.standard_normal(len(t)), 250 * pitch, 900 * pitch, slope=3) * np.exp(-t / 0.007) * 0.5
    tone = np.sin(2 * np.pi * 1600 * pitch * t) * np.exp(-t / 0.003) * 0.15
    x = attack(click + body + tone, 1.6)
    return tail(fft_filter(x, 150, 6000, slope=3), 8)


def bell(f, dur, tau):
    t = t_of(dur)
    x = (np.sin(2 * np.pi * f * t) + 0.16 * np.exp(-t / (tau * 0.5)) * np.sin(2 * np.pi * 2.0 * f * t)
         + 0.05 * np.exp(-t / (tau * 0.3)) * np.sin(2 * np.pi * 3.01 * f * t))
    return attack(x * np.exp(-t / tau), 4)


def chime():
    # the kiosk's two notes, in the music's key (F major): C6 then F6, a rising fourth onto the tonic
    a = bell(mtof(84), 1.3, 0.32)
    b = bell(mtof(89), 1.18, 0.38)
    x = np.zeros(int(1.3 * SR))
    x += a
    x[int(0.12 * SR):] += b[: len(x) - int(0.12 * SR)] * 0.9
    return small_room(tail(x, 40), mix=0.18, tau=0.12)


def stft_sweep(dur, f0, f1, width_oct):
    """Noise whose band centre glides from f0 to f1 (log), by STFT masking."""
    n = int(dur * SR)
    nfft, hop = 1024, 256
    win = np.hanning(nfft)
    xn = rng.standard_normal(n + nfft)
    frames = (n) // hop
    freqs = np.fft.rfftfreq(nfft, 1 / SR)
    y = np.zeros(n + nfft)
    wsum = np.zeros(n + nfft)
    for i in range(frames):
        s = i * hop
        u = s / n
        fc = f0 * (f1 / f0) ** (u ** 1.4)
        mask = np.exp(-0.5 * (np.log2(np.maximum(freqs, 1) / fc) / width_oct) ** 2)
        seg = np.fft.irfft(np.fft.rfft(xn[s:s + nfft] * win) * mask, nfft) * win
        y[s:s + nfft] += seg
        wsum[s:s + nfft] += win ** 2
    return (y / np.maximum(wsum, 1e-3))[:n]


def sent():
    dur = 0.42
    t = t_of(dur)
    x = stft_sweep(dur, 500, 3200, 0.45)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5 * (0.4 + 0.6 * t / dur)
    env[t > 0.85 * dur] *= np.linspace(1, 0, (t > 0.85 * dur).sum())
    x = attack(x * env, 20)
    # a soft rounded blip as it lands (an octave of the music's tonic, F5 > F6 glide)
    tb = t_of(0.12)
    f = mtof(77) * 2 ** (np.clip(tb / 0.05, 0, 1))
    blip = attack(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tb / 0.03), 3) * 0.35
    y = np.zeros(int((dur + 0.12) * SR))
    y[: len(x)] += x
    i = int(0.30 * SR)
    y[i:i + len(blip)] += blip
    return small_room(tail(y, 20), mix=0.12)


def tick():
    """A figure counting: a tiny, dry wooden tick (a 1.5 ms noise click on a short 1.3 kHz resonance)."""
    t = t_of(0.025)
    click = fft_filter(rng.standard_normal(len(t)), 2200, 5500, slope=3) * np.exp(-t / 0.0015)
    res = np.sin(2 * np.pi * 1300 * t) * np.exp(-t / 0.0025) * 0.5
    return tail(attack(fft_filter(click + res, 400, 6500, slope=3), 1.5), 6)


def tap():
    """A button press: a soft, rounded 'tock' (a short damped resonance near 700 Hz) with a breath of air."""
    t = t_of(0.07)
    f = 640 + 160 * np.exp(-t / 0.006)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.011)
    air = fft_filter(rng.standard_normal(len(t)), 1200, 4500, slope=2) * np.exp(-t / 0.004) * 0.35
    return tail(attack(fft_filter(body + air, 200, 6000, slope=2), 2.0), 12)


files = {
    "key-tap-1.wav": norm(key_tap(1.00), -16), "key-tap-2.wav": norm(key_tap(1.06), -16.5),
    "key-tap-3.wav": norm(key_tap(0.95), -15.5),
    "chime.wav": norm(chime(), -9), "sent.wav": norm(sent(), -12), "tick.wav": norm(tick(), -19),
    "tap.wav": norm(tap(), -13),
}
meta = {}
for name, x in files.items():
    write_wav(OUT + name, x)
    env = np.abs(x)
    meta[name] = {"duration_s": round(len(x) / SR, 3), "peak_at_s": round(int(env.argmax()) / SR, 4),
                  "true_peak_dbtp": round(true_peak_db(x), 2)}
    print(name, meta[name])
meta["chime.wav"]["second_note_at_s"] = 0.12
meta["sent.wav"]["lands_at_s"] = 0.30
json.dump({"sample_rate": SR, "note": "each sound starts at 0 s: place the file at the picture event",
           "files": meta}, open(OUT + "sfx.json", "w"), indent=1)
