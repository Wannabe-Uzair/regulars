"""The reel's music bed: 120 BPM (a bar every 2 s), 30 s + 2 s tail, numpy only.

Writes <sound>/music.wav and <sound>/music-drums.wav (the drums alone, at the same gain as in music.wav),
48 kHz stereo 24-bit. Key F major. One chord per bar:
  0 Dm9 (intro) | 1 Bbmaj9 (drop 2.75-3.0) | 2 Fadd9 | 3 C | 4 Dm9 | 5 Bbmaj9 | 6 C9sus (lift into "Meet Regulars")
  7 Fadd9 | 8 C/E | 9 Dm9 | 10 Bbmaj9 | 11 Fadd9 | 12 Gm7 > C | 13-14 Fadd9, resolved at 26.0 and held.
"""
import sys
import numpy as np
sys.path.insert(0, "/private/tmp/claude-501/-Users-uzairspc-Regulars/76094edf-7763-4727-ab26-8c81e4426640/scratchpad/reel/src")
from synth import SR, t_of, mtof, noise, adsr, place, pan, write_wav, loudness, true_peak_db, fft_filter, rng, limiter

OUT = "/private/tmp/claude-501/-Users-uzairspc-Regulars/76094edf-7763-4727-ab26-8c81e4426640/scratchpad/reel/sound/"
BAR, S16 = 2.0, 0.125
DUR = 32.0
N = int(DUR * SR)
DROP = (2.75, 3.0)
TARGET_LUFS = -24.0  # sits under the voice lines (-16 LUFS each); see the report for the loop gain

CH = {  # bass midi, voicing midi
    "Dm9": (38, [53, 57, 60, 64]), "Bbmaj9": (34, [53, 57, 60, 62]), "Fadd9": (41, [53, 57, 60, 67]),
    "C": (36, [52, 55, 60, 62]), "C9sus": (36, [53, 55, 60, 62]), "C/E": (40, [52, 55, 60, 62]),
    "Gm7": (43, [53, 55, 58, 62]), "Fend": (41, [53, 57, 60, 65, 67, 69]),
}
BARS = ["Dm9", "Bbmaj9", "Fadd9", "C", "Dm9", "Bbmaj9", "C9sus", "Fadd9", "C/E", "Dm9", "Bbmaj9", "Fadd9",
        ("Gm7", "C"), "Fend", "Fend"]


def chord_at(bar, step):
    c = BARS[bar]
    return CH[c[0] if step < 8 else c[1]] if isinstance(c, tuple) else CH[c]


# ---------- instruments ----------
def kick(v=1.0):
    t = t_of(0.5)
    f = 46 + 95 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * adsr(len(t), a=0.002, d_tau=0.17, release=0.08)
    click = noise(0.5, 900, 4000) * np.exp(-t / 0.0035) * 0.05
    x = np.tanh(1.4 * (body + click)) / np.tanh(1.4)
    return x * v


_clap_src = noise(0.4, 900, 3200, slope=3)


def clap(v=1.0, p=0.0):
    t = t_of(0.4)
    env = np.zeros_like(t)
    for k, d in enumerate((0.0, 0.009, 0.018)):  # three soft hand claps a few ms apart
        m = t >= d
        env[m] += (0.55 if k < 2 else 1.0) * np.exp(-(t[m] - d) / (0.004 if k < 2 else 0.075))
    a = int(0.0015 * SR)
    env[:a] *= np.linspace(0, 1, a)
    return pan(_clap_src * env * v, p)


_hat_src = noise(0.12, 6500, 13000, slope=3)


def hat(v=1.0, p=0.0, tau=0.022):
    t = t_of(0.12)
    env = np.exp(-t / tau)
    a = int(0.0012 * SR)
    env[:a] *= np.linspace(0, 1, a)
    return pan(_hat_src * env * v, p)


def bass(m, dur, v=1.0):
    t = t_of(dur + 0.05)
    ph = 2 * np.pi * mtof(m) * t
    x = (np.sin(ph) + 0.30 * np.exp(-t / 0.18) * np.sin(2 * ph) + 0.12 * np.exp(-t / 0.09) * np.sin(3 * ph)
         + 0.05 * np.exp(-t / 0.06) * np.sin(4 * ph))
    x = np.tanh(1.3 * x) / np.tanh(1.3)
    env = adsr(len(t), a=0.006, d_tau=None, release=0.05) * (0.75 + 0.25 * np.exp(-t / 0.25))
    return x * env * v


def stab(notes, dur=0.45, v=1.0, bright=1.0, tau=0.22, a=0.006):
    """Plucky chord: additive saw-ish partials whose upper harmonics fade faster (a filter envelope)."""
    t = t_of(dur)
    out = np.zeros((len(t), 2))
    for j, m in enumerate(notes):
        for side, cents in ((0, -4), (1, 4)):
            f0 = mtof(m) * 2 ** ((cents + rng.uniform(-1, 1)) / 1200)
            ph0 = rng.uniform(0, 2 * np.pi)
            x = np.zeros_like(t)
            for h in range(1, 11):
                if f0 * h > 9000:
                    break
                x += (1 / h ** 1.55) * np.exp(-t * (h - 1) * 9 / bright) * np.sin(2 * np.pi * f0 * h * t + ph0 * h)
            out[:, side] += x
    out *= adsr(len(t), a=a, d_tau=tau, release=0.06)[:, None] * v / len(notes)
    return out


def reverb_ir(seconds=1.4, tau=0.38):
    t = t_of(seconds)
    ir = np.stack([fft_filter(rng.standard_normal(len(t)), 200, 5000) for _ in range(2)], 1)
    ir *= np.exp(-t / tau)[:, None]
    ir[: int(0.012 * SR)] = 0  # 12 ms pre-delay
    return ir / np.sqrt((ir ** 2).sum(0)).max()


def convolve(x, ir):
    n = len(x) + len(ir)
    nf = 1 << (n - 1).bit_length()
    y = np.stack([np.fft.irfft(np.fft.rfft(x[:, c], nf) * np.fft.rfft(ir[:, c], nf), nf)[: len(x)] for c in range(2)], 1)
    return y


# ---------- arrangement ----------
drums = np.zeros((N, 2))
bassb = np.zeros((N, 2))
keys = np.zeros((N, 2))
kicks = []

for bar in range(15):
    b0 = bar * BAR
    product = 7 <= bar <= 12
    # kick
    if bar == 0:
        ks = [0, 8]
    elif bar == 6:
        ks = [0, 8]
    elif bar == 13:
        ks = [0]
    elif bar == 14:
        ks = []
    elif product:
        ks = [0, 4, 7, 8, 12]
    else:
        ks = [0, 7, 8] + ([14] if bar % 2 else [])
    for s in ks:
        v = 1.0 if s in (0, 8) else 0.8
        place(drums, kick(v), b0 + s * S16, 0.7)
        kicks.append(b0 + s * S16)
    # clap / snap on 2 and 4
    if 1 <= bar <= 12:
        for s in (4, 12):
            place(drums, clap(1.0, 0.05), b0 + s * S16, 0.5)
    if bar == 6:  # a soft clap run up into the product half (after "Meet Regulars.")
        for s, v in ((13, 0.35), (14, 0.5), (15, 0.7)):
            place(drums, clap(v, -0.1), b0 + s * S16, 0.5)
    # closed hats
    if bar <= 13:
        for s in range(16):
            if s % 2 == 0:
                v = 1.0 if s % 4 == 2 else 0.55
            elif product:
                v = 0.28
            else:
                continue
            if bar == 13:
                v *= 0.5 if s < 8 else 0.25 * (1 - s / 16)
            if bar == 0:
                v *= 0.7
            place(drums, hat(v, -0.25 if s % 4 == 2 else 0.2), b0 + s * S16 + (0.006 if s % 2 else 0), 0.17)
    if product and bar % 2 == 1:  # a soft open hat on the last offbeat of every other product bar
        place(drums, hat(0.7, 0.3, tau=0.09), b0 + 14 * S16, 0.14)
    # bass
    if bar <= 12:
        pat = [(0, 5), (6, 2), (8, 5), (14, 2)] if bar else [(0, 14)]
        for s, ln in pat:
            root, _ = chord_at(bar, s)
            m = root + (7 if (s == 14 and bar % 2) else 0)
            place(bassb, bass(m, ln * S16 - 0.01, 1.0), b0 + s * S16)
    # chord stabs: one pattern, offbeat; brighter in the product half
    if bar <= 12:
        for s, v in ((0, 1.0), (3, 0.7), (6, 0.85), (10, 0.75), (13, 0.6)):
            if bar == 0 and s == 0:
                v = 1.1
            _, notes = chord_at(bar, s)
            br = 2.3 if product else 1.6
            if bar == 6:
                br = 1.6 + 0.06 * s  # opens up across the lift
            place(keys, stab(notes, 0.5, v, bright=br), b0 + s * S16, 1.0)

# end card: the resolved chord lands at 26.0 and is held
place(keys, stab(CH["Fend"][1], 4.5, 1.15, bright=1.5, tau=1.6, a=0.004), 26.0)
place(keys, stab([m + 12 for m in CH["Fend"][1][:3]], 4.0, 0.35, bright=1.0, tau=1.4, a=0.004), 26.0)
place(bassb, bass(41, 4.4, 1.0) * np.exp(-t_of(4.45) / 3.0), 26.0)
place(bassb, bass(29, 4.4, 0.45) * np.exp(-t_of(4.45) / 3.0), 26.0)
place(keys, stab(CH["Fend"][1], 4.0, 0.8, bright=0.8, tau=2.6, a=0.35), 28.0)  # a soft swell, still F, held to 30 s

# pump bass and keys a little under each kick
pump = np.ones(N)
tt = t_of(0.25)
for k in kicks:
    i = int(k * SR)
    seg = pump[i:i + len(tt)]
    seg *= 1 - 0.30 * np.exp(-tt[: len(seg)] / 0.07)
keys *= pump[:, None]
bassb *= pump[:, None]

ir = reverb_ir()
mix_keys = keys + 0.22 * convolve(keys, ir)
mix_drums = drums + 0.06 * convolve(drums, ir)
mix_bass = bassb

# tame the voice band a touch in the keys (1.5-4 kHz) so the narration sits on top
f_keys = np.stack([fft_filter(mix_keys[:, c], 120, 7000, slope=2) for c in range(2)], 1)
music = 1.0 * f_keys + 0.36 * mix_bass + 0.75 * mix_drums
drum_only = 0.75 * mix_drums


def drop(x):
    a, b = int(DROP[0] * SR), int(DROP[1] * SR)
    f = int(0.004 * SR)
    g = np.ones(len(x))
    g[a:b] = 0
    g[a - f:a] = np.linspace(1, 0, f)
    x *= g[:, None]
    return x


music, drum_only = drop(music), drop(drum_only)
# fade the tail to silence by 32 s
fade = t_of(DUR) > 31.0
for x in (music, drum_only):
    x[fade] *= np.linspace(1, 0, fade.sum())[:, None]

# level: scale to the target loudness, then a look-ahead limiter holds the peaks PLR dB above it, so the loop
# version can be raised to -14 LUFS without passing -1 dBTP
PLR = 11.5
for _ in range(3):
    write_wav(OUT + "music.wav", music)
    lufs, _ = loudness(OUT + "music.wav")
    g = 10 ** ((TARGET_LUFS - lufs) / 20)
    music *= g
    drum_only *= g
    music = limiter(music, 10 ** ((TARGET_LUFS + PLR) / 20))
write_wav(OUT + "music.wav", music)
write_wav(OUT + "music-drums.wav", drum_only)
print("true peak (4x)", round(true_peak_db(music), 2))
for p in ("music.wav", "music-drums.wav"):
    print(p, loudness(OUT + p))
print("kicks", len(kicks))
