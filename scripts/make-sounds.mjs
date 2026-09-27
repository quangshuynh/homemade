// Synthesises Homemade's sound effects into small mono WAV files.
// Everything is generated from the maths below: no recordings, no samples,
// no third-party assets. Deterministic (seeded noise), so re-running it
// produces identical files.
//
//   node scripts/make-sounds.mjs
import { writeFileSync } from 'node:fs'

const RATE = 22050
const out = new URL('../src/assets/sounds/', import.meta.url)

let seed = 0x2b1d14
function noise() {
  // xorshift32: deterministic white noise in [-1, 1]
  seed ^= seed << 13
  seed ^= seed >>> 17
  seed ^= seed << 5
  return ((seed >>> 0) / 0xffffffff) * 2 - 1
}

function render(seconds, sample) {
  const length = Math.round(seconds * RATE)
  const data = new Float32Array(length)
  for (let i = 0; i < length; i++) data[i] = sample(i / RATE, i)
  // Short fade in/out so nothing clicks.
  const fade = Math.round(0.004 * RATE)
  for (let i = 0; i < fade; i++) {
    data[i] *= i / fade
    data[length - 1 - i] *= i / fade
  }
  return data
}

/** A struck bell/glass partial: sine with exponential decay. */
const partial = (t, freq, decay, gain = 1) => gain * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / decay)

function wav(data, peak = 0.7) {
  const max = data.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1
  const buffer = Buffer.alloc(44 + data.length * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + data.length * 2, 4)
  buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(RATE, 24)
  buffer.writeUInt32LE(RATE * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(data.length * 2, 40)
  data.forEach((v, i) => buffer.writeInt16LE(Math.round((v / max) * peak * 32767), 44 + i * 2))
  return buffer
}

/** One-pole low-pass, for softening noise. */
function lowPass(data, amount) {
  let last = 0
  return data.map((v) => (last += amount * (v - last)))
}

const sounds = {
  // A glass jar lid lifted and set down: a small, bright "tink".
  pick: render(0.22, (t) => partial(t, 1760, 0.05) + partial(t, 2790, 0.03, 0.5) + partial(t, 4410, 0.015, 0.25) + (t < 0.006 ? noise() * 0.4 : 0)),
  // Taking something back out: a lower, softer wooden "tock".
  remove: render(0.16, (t) => partial(t, 520 - 900 * t, 0.035) + partial(t, 1180, 0.018, 0.35) + (t < 0.004 ? noise() * 0.3 : 0)),
  // A whisk going round the bowl: three soft swishes of filtered noise.
  mix: lowPass(
    render(0.72, (t) => {
      const phase = (t % 0.24) / 0.24
      return noise() * Math.sin(Math.PI * phase) ** 2 * (1 - t * 0.6)
    }),
    0.18,
  ),
  // The oven timer: a small bell with inharmonic partials, left to ring.
  ding: render(1.3, (t) => partial(t, 1318.5, 0.42) + partial(t, 1318.5 * 2.76, 0.16, 0.35) + partial(t, 1318.5 * 5.4, 0.06, 0.15)),
  // A new recipe: three rising bell notes (C6, E6, G6), gently.
  discover: render(1.2, (t) =>
    [1046.5, 1318.5, 1568].reduce((sum, freq, index) => {
      const start = index * 0.12
      if (t < start) return sum
      const local = t - start
      return sum + partial(local, freq, 0.35) + partial(local, freq * 2.01, 0.12, 0.2)
    }, 0),
  ),
}

for (const [name, data] of Object.entries(sounds)) {
  writeFileSync(new URL(`${name}.wav`, out), wav(data, name === 'mix' ? 0.45 : 0.6))
}
