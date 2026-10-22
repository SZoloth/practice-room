# Listening tests

Checks the mic detector and the pass-test grader against real recorded piano.

1. Get the samples (Salamander grand, one file per key) and convert them to 48 kHz mono WAV in `tests/samples/`:
   `npm pack tonejs-instrument-piano-mp3 && tar xzf tonejs-instrument-piano-mp3-*.tgz && mkdir -p samples && for f in package/*.mp3; do ffmpeg -loglevel error -i $f -ac 1 -ar 48000 samples/$(basename $f .mp3).wav; done`
2. `python3 mix.py` builds the test performances in `tests/audio/` (with phone-mic low cut, room reverb and noise).
3. Serve a folder holding `index.html` and `audio/` (e.g. symlinks) on localhost, then from `tests/`:
   - `node detect.mjs http://localhost:8765` runs every key C2–C7 and the pass/fail grading cases through the app's own code.
   - `node e2e.mjs http://localhost:8765 five` (or `drill`) plays a recording into Chromium's fake mic and drives the real UI.
