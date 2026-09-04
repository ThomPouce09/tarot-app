# Synthèse maison de 10 sons magiques (CC0) — wave + stdlib, conversion MP3 ensuite.
import wave, math, struct, os

SR = 44100
OUT = os.path.dirname(os.path.abspath(__file__))

def buf(dur):
    return [0.0] * int(SR * dur)

def add(buf, t0, samples):
    i0 = int(t0 * SR)
    for i, s in enumerate(samples):
        j = i0 + i
        if 0 <= j < len(buf):
            buf[j] += s

def bell(freq, dur, amp=1.0, decay=3.2, partials=((1,1.0),(2.0,.42),(2.74,.3),(5.4,.12),(8.9,.05))):
    n = int(SR * dur); out = []
    for i in range(n):
        t = i / SR
        env = math.exp(-decay * t) * min(1.0, t / 0.008)
        v = sum(a * math.sin(2 * math.pi * freq * p * t) for p, a in partials)
        out.append(amp * env * v)
    return out

def pluck(freq, dur, amp=1.0, decay=7.0):
    n = int(SR * dur); out = []
    for i in range(n):
        t = i / SR
        env = math.exp(-decay * t) * min(1.0, t / 0.004)
        v = math.sin(2*math.pi*freq*t) + 0.3*math.sin(4*math.pi*freq*t) + 0.1*math.sin(8*math.pi*freq*t)
        out.append(amp * env * v)
    return out

def shimmer(t0, dur, amp=0.16, f0=2400, f1=7600, decay=4.0):
    n = int(SR * dur); out = []; ph = 0.0
    for i in range(n):
        t = i / SR
        f = f0 + (f1 - f0) * t / dur
        ph += 2 * math.pi * f / SR
        out.append(amp * math.exp(-decay * t) * math.sin(ph))
    return out

def normalize(b, peak=0.85):
    m = max(1e-9, max(abs(x) for x in b))
    k = peak / m
    for i in range(len(b)):
        b[i] *= k

def save(name, b):
    normalize(b)
    p = os.path.join(OUT, name + '.wav')
    w = wave.open(p, 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<h', max(-32767, min(32767, int(x * 32767)))) for x in b))
    w.close(); print(name, round(len(b)/SR, 2), 's')

N = lambda semi: 440.0 * 2 ** (semi / 12.0)  # A4=440 ; semi depuis A4
C5, D5, E5, G5, A5, B5 = N(-9), N(-7), N(-5), N(-2), N(0), N(2)
C6, D6, E6, G6, A6, B6, C7, E7, G7 = N(3), N(5), N(7), N(10), N(12), N(14), N(15), N(19), N(22)
C3, G3, C4, E4, G4 = N(-33), N(-26), N(-21), N(-16), N(-14)

# 1 — Carillon ascendant (recette validée) + écho + shimmer
b = buf(2.4)
for k, f in enumerate([C5, E5, G5, C6]):
    add(b, 0.02 + k * 0.14, bell(f, 1.6, 0.8))
add(b, 0.02 + 4 * 0.14, bell(C6 * 2, 1.2, 0.35))
add(b, 0.5, shimmer(1.9, 0.14))
save('magic-1', b)

# 2 — Pentatonique rapide
b = buf(2.2)
for k, f in enumerate([C5, D5, E5, G5, A5, C6, D6, E6]):
    add(b, 0.02 + k * 0.085, bell(f, 1.1, 0.65, decay=4.2))
add(b, 0.7, shimmer(2.0, 0.12))
save('magic-2', b)

# 3 — Cloches lointaines (2 cloches graves, longue traîne)
b = buf(2.8)
add(b, 0.02, bell(E5, 2.6, 0.9, decay=1.6))
add(b, 0.35, bell(B5, 2.3, 0.7, decay=1.8))
add(b, 0.9, bell(E6, 1.6, 0.35, decay=2.2))
save('magic-3', b)

# 4 — Scintillement féerique (glissando aigu + petit carillon)
b = buf(2.0)
add(b, 0.0, shimmer(1.1, 0.2, f0=1800, f1=8200, decay=2.6))
for k, f in enumerate([G6, C7, E7]):
    add(b, 0.9 + k * 0.1, bell(f, 0.9, 0.5, decay=4.5))
save('magic-4', b)

# 5 — Gong profond + shimmer
b = buf(3.0)
add(b, 0.0, bell(C3, 2.9, 1.0, decay=1.1, partials=((1,1.0),(2.7,.5),(5.4,.25),(8.9,.1))))
add(b, 0.0, bell(C4, 2.4, 0.4, decay=1.5))
add(b, 0.15, shimmer(2.2, 0.09, f0=3000, f1=9000))
save('magic-5', b)

# 6 — Glissando de harpe (cordes pincées rapides)
b = buf(2.0)
for k, f in enumerate([C4, E4, G4, C5, E5, G5, C6, E6, G6]):
    add(b, 0.02 + k * 0.07, pluck(f, 1.2, 0.6, decay=5.0))
save('magic-6', b)

# 7 — Boîte à musique (timbre sinusoïdal sec, motif G-B-D-G haut)
b = buf(2.2)
timbre = ((1,1.0),(4,.25),(9,.06))
for k, f in enumerate([G4, N(2), N(5), N(10)]):
    add(b, 0.05 + k * 0.24, bell(f, 0.8, 0.75, decay=6.0, partials=timbre))
add(b, 0.05 + 4 * 0.24, bell(N(2), 0.8, 0.75, decay=6.0, partials=timbre))
add(b, 0.05 + 5 * 0.24, bell(G5, 1.3, 0.8, decay=3.5, partials=timbre))
save('magic-7', b)

# 8 — Brume éthérée (nappes désaccordées + cloche)
b = buf(2.6)
n = int(SR * 1.4)
for i in range(n):
    t = i / SR
    env = (t / 1.4) ** 2 * math.exp(-2.2 * t)
    v = (math.sin(2*math.pi*G4*t) + math.sin(2*math.pi*(G4+3)*t) +
         math.sin(2*math.pi*C5*t) + 0.6*math.sin(2*math.pi*E5*t))
    b[i] += 0.28 * env * v
add(b, 1.1, bell(C6, 1.5, 0.7, decay=2.4))
add(b, 1.35, bell(G6, 1.1, 0.4, decay=3.0))
save('magic-8', b)

# 9 — Retour de vague (swell inversé puis cloche)
b = buf(2.4)
n = int(SR * 1.2)
for i in range(n):
    t = i / SR
    env = (t / 1.2) ** 3
    v = (math.sin(2*math.pi*C5*t) + math.sin(2*math.pi*E5*t) +
         math.sin(2*math.pi*G5*t) + 0.5*math.sin(2*math.pi*C6*t))
    b[i] += 0.22 * env * v
add(b, 1.15, bell(C6, 1.2, 0.9, decay=2.8))
add(b, 1.3, shimmer(1.0, 0.12, f0=2600, f1=8000))
save('magic-9', b)

# 10 — Triple étincelle (3 clochettes très aiguës + longue traîne shimmer)
b = buf(2.4)
for k, f in enumerate([E7, G7, C7]):
    add(b, 0.03 + k * 0.12, bell(f, 0.8, 0.5, decay=5.5))
add(b, 0.4, shimmer(1.9, 0.13, f0=3200, f1=9500, decay=3.2))
add(b, 0.55, bell(C7, 1.5, 0.35, decay=2.2))
save('magic-10', b)

print('OK 10 wavs')
