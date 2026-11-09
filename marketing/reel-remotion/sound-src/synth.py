"""Shared numpy-only synthesis helpers for the reel's music and UI sounds (48 kHz)."""
import re, subprocess, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(20261108)


def t_of(seconds):
    return np.arange(int(round(seconds * SR))) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def fft_filter(x, lo=None, hi=None, slope=4):
    """Zero-phase band filter by FFT with smooth (butterworth-like) magnitude edges."""
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * slope))
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** (2 * slope))
    return np.fft.irfft(np.fft.rfft(x) * g, n)


def noise(seconds, lo=None, hi=None, slope=4):
    return fft_filter(rng.standard_normal(int(round(seconds * SR))), lo, hi, slope)


def adsr(n, a=0.005, d_tau=None, release=0.03, hold=None):
    """Attack (raised cosine), exponential decay with tau d_tau, cosine release over the last `release` s."""
    t = np.arange(n) / SR
    env = np.ones(n)
    na = max(1, int(a * SR))
    env[:na] = 0.5 - 0.5 * np.cos(np.pi * np.arange(na) / na)
    if d_tau:
        env[na:] *= np.exp(-(t[na:] - a) / d_tau)
    nr = min(n, max(1, int(release * SR)))
    env[n - nr:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(nr) / nr)
    return env


def place(buf, x, at, gain=1.0):
    """Add mono or stereo x into stereo buf at time `at` (s)."""
    i = int(round(at * SR))
    if i >= len(buf):
        return
    x = x[: len(buf) - i]
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    buf[i:i + len(x)] += x * gain


def pan(x, p):
    """Equal-power pan, p in -1..1."""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)


def write_wav(path, x, bits=24):
    x = np.asarray(x, float)
    if x.ndim == 1:
        x = x[:, None]
    x = np.clip(x, -1, 1)
    if bits == 24:
        i = np.round(x * 8388607).astype(np.int32)
        b = np.zeros(i.shape + (3,), np.uint8)
        for k in range(3):
            b[..., k] = (i >> (8 * k)) & 255
        data = b.tobytes()
    else:
        data = np.round(x * 32767).astype("<i2").tobytes()
    with wave.open(path, "wb") as w:
        w.setnchannels(x.shape[1])
        w.setsampwidth(bits // 8)
        w.setframerate(SR)
        w.writeframes(data)


def loudness(path):
    """Integrated LUFS and true peak (dBTP) by ffmpeg's ebur128."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)[-1])


def true_peak_db(x):
    """4x-oversampled peak by FFT interpolation, in dB."""
    x = np.asarray(x, float)
    if x.ndim == 1:
        x = x[:, None]
    pk = 0
    for c in range(x.shape[1]):
        n = len(x)
        X = np.fft.rfft(x[:, c])
        Y = np.zeros(2 * n + 1, complex)
        Y[: len(X)] = X
        y = np.fft.irfft(Y, 4 * n) * 4
        pk = max(pk, np.abs(y).max())
    return 20 * np.log10(pk + 1e-12)


def limiter(x, thr, block=0.0025, look=2, release=0.08):
    """Look-ahead peak limiter on blocks: gain = min(1, thr/peak), held over +-look blocks, released smoothly."""
    b = int(block * SR)
    n = len(x)
    nb = -(-n // b)
    pad = np.zeros((nb * b, x.shape[1]))
    pad[:n] = x
    pk = np.abs(pad).reshape(nb, b, -1).max(axis=(1, 2))
    g = np.minimum(1.0, thr / np.maximum(pk, 1e-9))
    held = g.copy()
    for k in range(1, look + 1):
        held[:-k] = np.minimum(held[:-k], g[k:])
        held[k:] = np.minimum(held[k:], g[:-k])
    a = np.exp(-block / release)
    sm = held.copy()
    for i in range(1, nb):
        sm[i] = min(held[i], a * sm[i - 1] + (1 - a) * held[i])
    centers = (np.arange(nb) + 0.5) * b
    gs = np.interp(np.arange(nb * b), centers, sm)[:n]
    return x * gs[:, None]
