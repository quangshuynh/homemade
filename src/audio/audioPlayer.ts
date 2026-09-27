import { SOUNDS, type SoundDefinition, type SoundId } from './sounds'

/**
 * A tiny sound-effect player on the Web Audio API.
 *
 * - Nothing is created or fetched until the first `play`, which only ever
 *   happens in response to something the player did, so nothing autoplays.
 * - Every failure (no Web Audio, a blocked context, a file that won't load
 *   or decode) is swallowed: sound is a nicety and must never break a bake.
 * - `play` never waits. The first time, every sound is loaded; the one
 *   asked for plays if it's ready almost at once, and is skipped rather
 *   than arriving late.
 * - Overlap is bounded: the same sound can't restart within a few
 *   milliseconds, and only a handful play at once.
 */
export type AudioPlayer = {
  play(id: SoundId): void
  /** Stops anything playing (used when the player turns sound off). */
  stopAll(): void
}

/** The subset of AudioContext this uses, so tests can pass a fake. */
export type AudioContextLike = {
  readonly state: string
  readonly currentTime: number
  readonly destination: unknown
  resume(): Promise<void>
  decodeAudioData(data: ArrayBuffer): Promise<unknown>
  createBufferSource(): {
    buffer: unknown
    connect(node: unknown): unknown
    start(): void
    stop(): void
    onended: (() => void) | null
  }
  createGain(): { gain: { value: number }; connect(node: unknown): unknown }
}

export type AudioPlayerOptions = {
  sounds?: Record<SoundId, SoundDefinition>
  createContext?: () => AudioContextLike | null
  load?: (url: string) => Promise<ArrayBuffer>
  now?: () => number
  /** At most this many sounds at once. */
  maxVoices?: number
  /** The same sound can't restart within this many milliseconds. */
  retriggerMs?: number
  /** A sound still loading after this long is skipped instead of playing late. */
  lateMs?: number
}

function defaultContext(): AudioContextLike | null {
  const Context = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return Context ? (new Context() as unknown as AudioContextLike) : null
}

async function defaultLoad(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Sound ${url} answered ${response.status}`)
  return response.arrayBuffer()
}

export function createAudioPlayer(options: AudioPlayerOptions = {}): AudioPlayer {
  const {
    sounds = SOUNDS,
    createContext = defaultContext,
    load = defaultLoad,
    now = () => performance.now(),
    maxVoices = 4,
    retriggerMs = 60,
    lateMs = 250,
  } = options

  let context: AudioContextLike | null | undefined
  const buffers = new Map<SoundId, unknown>()
  const loading = new Map<SoundId, Promise<void>>()
  const lastStarted = new Map<SoundId, number>()
  const playing = new Set<ReturnType<AudioContextLike['createBufferSource']>>()

  function getContext(): AudioContextLike | null {
    if (context === undefined) {
      try {
        context = createContext()
      } catch {
        context = null
      }
    }
    return context
  }

  function warm(ctx: AudioContextLike, id: SoundId): Promise<void> {
    let pending = loading.get(id)
    if (!pending) {
      pending = load(sounds[id].url)
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => {
          buffers.set(id, buffer)
        })
        .catch(() => {
          // Leave it undecoded; a later play will try again.
          loading.delete(id)
        })
      loading.set(id, pending)
    }
    return pending
  }

  function start(ctx: AudioContextLike, id: SoundId, buffer: unknown) {
    const time = now()
    const last = lastStarted.get(id)
    if (last !== undefined && time - last < retriggerMs) return
    if (playing.size >= maxVoices) return
    lastStarted.set(id, time)

    try {
      const source = ctx.createBufferSource()
      const gain = ctx.createGain()
      source.buffer = buffer
      gain.gain.value = sounds[id].volume
      source.connect(gain)
      gain.connect(ctx.destination)
      source.onended = () => playing.delete(source)
      source.start()
      playing.add(source)
    } catch {
      // A sound that can't start is just not heard.
    }
  }

  return {
    play(id) {
      try {
        const ctx = getContext()
        if (!ctx) return
        if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
        const buffer = buffers.get(id)
        if (buffer !== undefined) {
          start(ctx, id, buffer)
        } else {
          // First use: load every sound now, so the rest are ready when they're needed.
          const requested = now()
          for (const other of Object.keys(sounds) as SoundId[]) void warm(ctx, other)
          void warm(ctx, id).then(() => {
            const ready = buffers.get(id)
            if (ready !== undefined && now() - requested <= lateMs) start(ctx, id, ready)
          })
        }
      } catch {
        // Sound must never get in the way of the game.
      }
    },
    stopAll() {
      for (const source of playing) {
        try {
          source.stop()
        } catch {
          // Already stopped.
        }
      }
      playing.clear()
    },
  }
}
