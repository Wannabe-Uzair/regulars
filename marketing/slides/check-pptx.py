"""Structural check of the Tenure pitch .pptx (run with build/slides-venv/bin/python).
Prints: slide count, slide size in inches, every typeface used in a run, slides with non-empty notes, each slide's text.
Exits 1 if a run uses a typeface outside the brand set or a slide has no notes."""
import sys
from pptx import Presentation
from pptx.util import Emu

BRAND = {"Anton", "Barlow", "Barlow Medium", "Barlow SemiBold", "Barlow Condensed", "Barlow Condensed SemiBold"}
prs = Presentation(sys.argv[1] if len(sys.argv) > 1 else "exports/Tenure-pitch.pptx")
faces, with_notes, texts = set(), 0, []
for slide in prs.slides:
    lines = []
    for shape in slide.shapes:
        if not shape.has_text_frame:
            continue
        for p in shape.text_frame.paragraphs:
            for r in p.runs:
                faces.add(r.font.name)
        lines.append(shape.text_frame.text.replace("\x0b", " / ").replace("\n", " / "))
    texts.append(lines)
    if slide.has_notes_slide and slide.notes_slide.notes_text_frame.text.strip():
        with_notes += 1

n = len(prs.slides)
print(f"slides: {n}")
print(f"size: {Emu(prs.slide_width).inches:.3f} x {Emu(prs.slide_height).inches:.3f} in")
print(f"typefaces: {sorted(f or '(inherited)' for f in faces)}")
print(f"notes: {with_notes}/{n}")
for i, lines in enumerate(texts, 1):
    print(f"--- slide {i}")
    for t in lines:
        print("  " + t)
bad = faces - BRAND
if bad or with_notes != n:
    print(f"FAIL: off-brand typefaces {sorted(map(str, bad))}" if bad else "FAIL: slides without notes")
    sys.exit(1)
