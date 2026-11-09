#!/bin/sh
# Rebuilds every Tenure app icon. Run anywhere; renders from /Users/apple/myo-app/tenure.
set -e
T=/Users/apple/myo-app/tenure
A=$T/app/assets
O=$A/icons
cd "$T"
r() { node tools/render.mjs png "$A/icon.html?v=$1" "$O/$2" "$3" "$3"; }
r normal   icon-512.png          512
r normal   icon-192.png          192
r maskable icon-maskable-512.png 512
r normal   apple-touch-icon.png  180
r small    favicon-32.png        32
node "$O/make-favicon-svg.mjs"
