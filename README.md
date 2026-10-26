# Practice Room

A 25-minute daily piano practice planner built on mastery-learning principles: a skill map with prerequisites, pass tests, spaced review, timed reading drills, and embedded beginner video lessons.

Live at https://szoloth.github.io/practice-room/

Progress is stored in your browser (localStorage). Use the Log tab to download or restore a backup.

## Listening

The P-95 has no MIDI out, so the app listens through the mic instead. The steady-beat, five-finger and C/G/F scale pass tests count you in, then grade timing, wrong notes, loudness and hands-together from what they hear. The note-reading drills can be answered by playing the exact key. Pieces get a record-and-listen-back step before you grade them. Nothing is uploaded; audio stays in the browser. See `tests/` for the checks against recorded piano.

## Lesson exercises

Each Bill Hilton video lesson (1 to 9 so far) comes with its exercises made interactive, under the video on the Today tab and on the Drills tab. They're taken from what Bill asks for in each lesson: the note-naming game's five levels, reading and playing lines of notes with finger numbers, playing then humming each note, clapping rhythms, short tunes in time, scales with a check on the thumb-under, loud/soft control, sharps and key signatures, and a terms quiz. His worksheets are PDFs the app can't load, so lines of notes and rhythms are generated fresh in the same ranges. Exercises live in `lessons.js`.

## Tests

```
python3 tests/fetch_samples.py   # Salamander grand piano samples, three loudness layers (needs npm, ffmpeg)
cd tests && python3 mix.py       # phone-mic-like recordings for detect.mjs
# serve a folder containing index.html, lessons.js, samples/ and audio/ (symlinks are fine), then:
node detect.mjs http://localhost:PORT    # detector and pass-test grading
node lessons.mjs http://localhost:PORT   # every lesson exercise, end to end, right and wrong performances
```
