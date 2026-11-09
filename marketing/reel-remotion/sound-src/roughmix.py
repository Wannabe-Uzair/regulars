"""Rough mix for checking: the nine voice lines at their file_start times over music.wav, -0.5 dB, then a
4x-oversampled limiter at -2 dBFS so the true peak stays under -1 dBTP. Also writes raw/voice-track.wav."""
import json, subprocess
S = "/private/tmp/claude-501/-Users-uzairspc-Regulars/76094edf-7763-4727-ab26-8c81e4426640/scratchpad/reel/sound/"
d = json.load(open(S + "voice.json"))
ins, f, labels = [], [], []
for i, l in enumerate(d["lines"]):
    ins += ["-i", l["file"]]
    ms = int(round(l["file_start"] * 1000))
    f.append(f"[{i}:a]pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[v{i}]")
    labels.append(f"[v{i}]")
n = len(d["lines"])
f.append("".join(labels) + f"amix=inputs={n}:normalize=0:duration=longest,apad=whole_len={32 * 48000},asplit=2[vm][vo]")
f.append(f"[{n}:a][vm]amix=inputs=2:normalize=0:duration=first,volume=-0.5dB,aresample=192000,"
         "alimiter=limit=0.79:attack=1:release=50:level=false,aresample=48000[mix]")
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"] + ins + ["-i", S + "music.wav",
               "-filter_complex", ";".join(f), "-map", "[mix]", "-c:a", "pcm_s24le", S + "rough-mix.wav",
               "-map", "[vo]", "-c:a", "pcm_s24le", "-t", "32", S + "raw/voice-track.wav"], check=True)
