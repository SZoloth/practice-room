# Build test performances from real piano recordings (Salamander-derived samples), with
# phone-mic-like coloring: low-cut, room reverb, background noise.
import numpy as np, wave, json, sys, os
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
SD = os.path.join(HERE, "samples")
OUT = os.path.join(HERE, "audio")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"]
_cache = {}

def sample(midi):
    if midi not in _cache:
        name = f"{NAMES[midi % 12]}{midi // 12 - 1}"
        alt = {"Ds": "Eb", "Gs": "Ab"}  # package may spell these differently
        path = f"{SD}/{name}.wav"
        if not os.path.exists(path):
            n = NAMES[midi % 12]
            path = f"{SD}/{alt.get(n, n)}{midi // 12 - 1}.wav"
        w = wave.open(path)
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        _cache[midi] = x
    return _cache[midi]

def render(events, total, phone=True, noise_db=-55, reverb=True):
    """events: list of (time_s, midi, gain, dur_s)"""
    y = np.zeros(int(total * SR), np.float32)
    for t, m, g, dur in events:
        x = sample(m).copy()
        n = min(len(x), int((dur + 0.15) * SR))
        x = x[:n]
        rel = int(dur * SR)
        if rel < n:
            x[rel:] *= np.exp(-np.arange(n - rel) / (0.04 * SR))  # damper on key release
        i = int(t * SR)
        j = min(len(y), i + n)
        y[i:j] += g * x[: j - i]
    if reverb:
        L = int(0.4 * SR)
        ir = rng.standard_normal(L).astype(np.float32) * np.exp(-np.arange(L) / (0.08 * SR))
        ir *= 0.25 / np.sqrt((ir ** 2).sum())
        y = y + np.fft.irfft(np.fft.rfft(y, len(y) + L) * np.fft.rfft(ir, len(y) + L))[: len(y)].astype(np.float32)
    if phone:  # two first-order high-pass stages at ~150 Hz: phone mics barely hear the bass fundamental
        a = np.exp(-2 * np.pi * 150 / SR)
        for _ in range(2):
            out = np.zeros_like(y); prev_x = prev_y = 0.0
            # vectorised one-pole HP via cumulative trick is messy; plain loop is fine for test sizes
            for k in range(len(y)):
                prev_y = a * (prev_y + y[k] - prev_x); prev_x = y[k]; out[k] = prev_y
            y = out
    y = y + rng.standard_normal(len(y)).astype(np.float32) * 10 ** (noise_db / 20)
    y *= 0.5 / max(1e-6, np.abs(y).max())
    return y.astype(np.float32)

def save(name, y):
    y.tofile(f"{OUT}/{name}.f32")
    w = wave.open(f"{OUT}/{name}.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()

def steady(bpm, n, jitter=0.012, start=0.5, drift=0.0):
    t, ts, beat = start, [], 60 / bpm
    for i in range(n):
        ts.append(t + rng.normal(0, jitter)); t += beat * (1 - drift * i / n)
    return ts

meta = {}
# A: every key C2..C7, one at a time, moderately loud
ms = list(range(36, 97))
save("sweep", render([(0.5 + 1.0 * i, m, 1.0, 0.8) for i, m in enumerate(ms)], 0.5 + len(ms) + 1))
meta["sweep"] = ms
# B: steady beat on middle C
for bpm in (60, 100):
    save(f"pulse{bpm}", render([(t, 60, rng.uniform(.7, 1), 0.5) for t in steady(bpm, 12)], 14))
# C: rushing (speeds up ~20% over the take)
save("pulse_rush", render([(t, 60, 1, 0.5) for t in steady(60, 12, drift=0.35)], 14))
# C2: sloppy (±90 ms)
save("pulse_sloppy", render([(t, 60, 1, 0.5) for t in steady(80, 12, jitter=0.09)], 14))
# E: five-finger G (G A B C D C B A G) at 80, right hand near middle, left hand an octave lower
G5 = [67, 69, 71, 72, 74, 72, 71, 69, 67]
def five(notes, gains=None, legato=1.0):
    ts = steady(80, len(notes), jitter=0.015)
    g = gains or [rng.uniform(.85, 1) for _ in notes]
    return [(t, m, gi, 0.75 * legato) for t, m, gi in zip(ts, notes, g)]
save("five_rh", render(five(G5), 9))
save("five_lh", render(five([m - 12 for m in G5]), 9))
save("five_wrong", render(five([67, 69, 71, 73, 74, 72, 71, 69, 67]), 9))  # C# instead of C
save("five_quiet", render(five(G5, gains=[1, 1, 1, 1, .2, 1, 1, 1, 1]), 9))
save("five_pedal", render(five(G5, legato=4.0), 12))  # notes ring into each other
# F: G major scale, hands together in octaves, eighth notes at 80 (160 notes/min)
up = [67, 69, 71, 72, 74, 76, 78, 79]; seq = up + up[-2::-1]
def scale(split_ms):
    ts = steady(160, len(seq), jitter=0.012)
    ev = []
    for i, (t, m) in enumerate(zip(ts, seq)):
        off = split_ms(i) / 1000
        ev += [(t, m, 0.9, 0.35), (t + off, m - 12, 0.9, 0.35)]
    return ev
save("scale_together", render(scale(lambda i: rng.uniform(-30, 40)), 8))
save("scale_split", render(scale(lambda i: 130 if i % 3 == 0 else 10), 8))
json.dump(meta, open(f"{OUT}/meta.json", "w"))
print("ok")
# stress: noisy room (fan/HVAC at -35 dB) and soft playing
save("five_rh_noisy", render(five(G5), 9, noise_db=-35))
save("pulse60_soft_noisy", render([(t, 60, 0.15, 0.5) for t in steady(60, 12)], 14, noise_db=-40))
# reading-drill end-to-end: D4 repeatedly (correct for the forced first treble note), with an E4 every 5th
ev = [(4.0 + 1.3 * i, 64 if i % 5 == 4 else 62, 1.0, 0.6) for i in range(60)]
save("drill_e2e", render(ev, 4.0 + 1.3 * 60 + 2, reverb=True))
def at(start, notes):
    return [(start + 0.75 * i + rng.normal(0, .012), m, 0.95, 0.6) for i, m in enumerate(notes)]
save("five_e2e", render(at(4.9, G5) + at(18.3, [m - 12 for m in G5]), 40))
