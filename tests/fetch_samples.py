# Fetch real piano recordings for the detector tests: Salamander Grand Piano V3 from npm,
# sampled every minor third, pitch-shifted to fill in the keys between. Velocity layer 8 goes
# to samples/, the soft (4) and loud (14) layers to samples/v4 and samples/v14 for dynamics tests.
# Needs npm and ffmpeg. Usage: python3 tests/fetch_samples.py
import os, re, subprocess, tarfile, tempfile, glob
HERE = os.path.dirname(os.path.abspath(__file__))
NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"]
SRC = {"C": 0, "D#": 3, "F#": 6, "A": 9}

def midi_of(fn):
    m = re.match(r"([A-G]#?)(\d)v\d+\.mp3$", os.path.basename(fn))
    return 12 * (int(m.group(2)) + 1) + SRC[m.group(1)]

for layer, out in (("8", ""), ("4", "v4"), ("14", "v14")):
    dest = os.path.join(HERE, "samples", out)
    os.makedirs(dest, exist_ok=True)
    if len(glob.glob(dest + "/*.wav")) >= 88:
        continue
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["npm", "pack", f"@audio-samples/piano-mp3-velocity{layer}", "--silent"], cwd=tmp, check=True)
        tarfile.open(glob.glob(tmp + "/*.tgz")[0]).extractall(tmp, filter="data")
        have = {midi_of(f): f for f in glob.glob(tmp + "/package/audio/*.mp3")}
        for m in range(21, 109):
            src = min(have, key=lambda s: abs(s - m))
            ratio = 2 ** ((m - src) / 12)
            name = f"{NAMES[m % 12]}{m // 12 - 1}.wav"
            # asetrate shifts pitch (and length) by the ratio; aresample brings it back to 48 kHz
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", have[src], "-ac", "1",
                            "-af", f"asetrate={int(44100 * ratio)},aresample=48000", "-t", "4",
                            os.path.join(dest, name)], check=True)
    print("layer", layer, "->", dest)
