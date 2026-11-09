# Where every sound in the Regulars reel comes from

Made on 8 Nov 2026 for the 30-second film (brief: `docs/milestone-2/redesign/wave2/briefs/reel.md`). Nothing here is a
sample, a loop or a recording made by someone else: the voice is made by an open model run on this Mac, and the music
and UI sounds are synthesised in code (numpy only).

## The voice: Kokoro

| What | Version | Where from | Licence |
| --- | --- | --- | --- |
| Kokoro-82M model, ONNX export `kokoro-v1.0.onnx` (325,505,369 bytes, sha256 `beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a`) | v1.0, release `model-files-v1.1` | https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.onnx | Apache-2.0 (model card: https://huggingface.co/hexgrad/Kokoro-82M) |
| Voice styles `voices-v1.0.bin` (28,214,398 bytes, sha256 `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d`) | v1.0, release `model-files-v1.1` | https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin | Apache-2.0 |
| kokoro-onnx (the Python runner) | 0.6.1 (PyPI) | https://github.com/thewh1teagle/kokoro-onnx | MIT |
| onnxruntime | 1.31.1 (PyPI) | https://onnxruntime.ai | MIT |
| phonemizer (pulled in by kokoro-onnx) | 3.6.0 (PyPI) | https://github.com/bootphon/phonemizer | GPL-3.0-or-later |
| espeakng-loader, bundling eSpeak NG 1.52.0 (text to phonemes) | 0.2.4 (PyPI) | https://github.com/thewh1teagle/espeakng-loader | eSpeak NG is GPL-3.0-or-later; no licence is stated in the loader's own metadata |
| soundfile | 0.14.0 (PyPI) | https://github.com/bastibe/python-soundfile | BSD-3-Clause |
| numpy | 2.5.4 (PyPI) | https://numpy.org | BSD-3-Clause |
| Python | 3.12.16, fetched by uv 0.13.7 (Homebrew) | https://github.com/astral-sh/python-build-standalone | PSF |

The GPL tools (phonemizer, eSpeak NG) only turn the text into phonemes. They run on this Mac and none of their code
ships in the film. The voice audio is the output of the Apache-2.0 model.

Read before running: the kokoro-onnx README and LICENSE (in the installed package's metadata), the Kokoro-82M model
card and VOICES.md (read on the night; not copied into the repo).

Installed only in the scratch folder, with nothing system-wide:
`uv venv --python 3.12 .../reel/kokoro-env` then `uv pip install --python .../reel/kokoro-env/bin/python kokoro-onnx soundfile`.
The model files are in `.../reel/models/`.

**The voice:** `am_michael`, language `en-us`, at speed 1.0, except line 3 ("The ones who stay...") and line 7
("One tap...") at 1.15. Voices auditioned: am_michael, am_fenrir, am_puck, am_adam, am_echo (in `audition/`).

## The music and the UI sounds

Composed and synthesised in Python with numpy only (plus the standard library's `wave` for writing): no samples, no
sound fonts, no outside presets. The scripts were run from a scratch folder on the night; copies are in `marketing/reel-remotion/sound-src/` (their paths
point at that scratch folder):

- `synth.py`: shared helpers (FFT filters, envelopes, the limiter, WAV writing)
- `music.py`: `music.wav` and `music-drums.wav`
- `sfx.py`: `sfx/*.wav` and `sfx/sfx.json`
- `voice.py`: the nine voice lines and `voice.json`
- `roughmix.py`: `rough-mix.wav`, the voice placed over the music, for checking only

Run each with `.../reel/kokoro-env/bin/python -I <script>`. FFmpeg 9.0.2 (Homebrew) measures loudness and levels the
voice: a 70 Hz high-pass, gentle compression, gain, and a limiter oversampled 4x.

## What is in this folder, and where each file came from

| File | Made by | Notes |
| --- | --- | --- |
| `voice/01-question.wav` ... `voice/09-end-card.wav` | `sound-src/voice.py` (Kokoro, `am_michael`) | 48 kHz mono 24-bit, each as long as its beat, the speech at `speech_offset`; -16 LUFS, -2 dBTP |
| `voice.json` | `sound-src/voice.py` | each line's placement (`file_start`), the caption words with their times (`words`, from Kokoro's own phoneme durations) and the spoken words |
| `music.wav` | `sound-src/music.py` | 120 BPM, F major, 32 s, -24 LUFS; composed in code, no samples |
| `music.json` | `sound-src/music.py` | the bars, the cue times (the drop at 2.75-3.0 s, the product half at 14 s, the resolve at 26 s) and the levels |
| `sfx/*.wav`, `sfx/sfx.json` | `sound-src/sfx.py` | key taps, the kiosk chime, the sent blip, the tick, the tap; each starts at 0 s |
| `fonts/InterVariable.woff2`, `fonts/LICENSE.txt` | copied from `packages/ui/src/fonts/` | Inter 4, SIL Open Font License 1.1 |

The film places these with `src/cues.ts` (the UI sounds) and `voice.json` (the voice), and `mix.ts` mixes them with
ffmpeg: the voice lines at unity over the music at -1.5 dB, the UI sounds at +3 dB, then levelled to -14 LUFS and limited
(4x oversampled, -1.5 dBFS) so the true peak stays under -1 dBTP. The loop drops the voice and lifts the music to the same
loudness.
