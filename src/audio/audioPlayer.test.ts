import { describe, expect, it, vi } from 'vitest'
import { createAudioPlayer, type AudioContextLike } from './audioPlayer'
import type { SoundId } from './sounds'

const SOUNDS = {
  pick: { url: '/pick.wav', volume: 0.3 },
  remove: { url: '/remove.wav', volume: 0.3 },
  mix: { url: '/mix.wav', volume: 0.3 },
  ding: { url: '/ding.wav', volume: 0.3 },
  discover: { url: '/discover.wav', volume: 0.3 },
} satisfies Record<SoundId, unknown>

/** A stand-in AudioContext that records which buffers were started. */
function fakeContext() {
  const started: unknown[] = []
  const sources: { onended: (() => void) | null }[] = []
  const context: AudioContextLike = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    decodeAudioData: vi.fn(async (data: ArrayBuffer) => ({ decoded: new TextDecoder().decode(data) })),
    createBufferSource() {
      const source = {
        buffer: null as unknown,
        connect: () => undefined,
        start: () => started.push(source.buffer),
        stop: vi.fn(),
        onended: null as (() => void) | null,
      }
      sources.push(source)
      return source
    },
    createGain: () => ({ gain: { value: 1 }, connect: () => undefined }),
  }
  return { context, started, sources }
}

const load = vi.fn(async (url: string) => new TextEncoder().encode(url).buffer as ArrayBuffer)
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('audio player', () => {
  it('creates nothing and loads nothing until the first sound is asked for', () => {
    const createContext = vi.fn(() => fakeContext().context)
    createAudioPlayer({ sounds: SOUNDS, createContext, load })
    expect(createContext).not.toHaveBeenCalled()
  })

  it('loads every sound on first use and plays the one asked for once it is ready', async () => {
    const { context, started } = fakeContext()
    const loads = vi.fn(load)
    const player = createAudioPlayer({ sounds: SOUNDS, createContext: () => context, load: loads, now: () => 0 })

    player.play('pick')
    await flush()

    expect(loads).toHaveBeenCalledTimes(5)
    expect(started).toEqual([{ decoded: '/pick.wav' }])

    player.play('mix')
    expect(started).toEqual([{ decoded: '/pick.wav' }, { decoded: '/mix.wav' }])
  })

  it('skips a first sound that took too long to load rather than playing it late', async () => {
    const { context, started } = fakeContext()
    let time = 0
    const slowLoad = async (url: string) => {
      time += 1000
      return load(url)
    }
    const player = createAudioPlayer({ sounds: SOUNDS, createContext: () => context, load: slowLoad, now: () => time })
    player.play('ding')
    await flush()
    expect(started).toEqual([])
  })

  it('does not stack the same sound on top of itself', async () => {
    const { context, started } = fakeContext()
    let time = 0
    const player = createAudioPlayer({ sounds: SOUNDS, createContext: () => context, load, now: () => time, retriggerMs: 60 })
    player.play('pick')
    await flush()
    time = 10
    player.play('pick')
    player.play('pick')
    expect(started).toHaveLength(1)
    time = 100
    player.play('pick')
    expect(started).toHaveLength(2)
  })

  it('plays only a handful of sounds at once', async () => {
    const { context, started, sources } = fakeContext()
    let time = 0
    const player = createAudioPlayer({ sounds: SOUNDS, createContext: () => context, load, now: () => (time += 100), maxVoices: 2 })
    player.play('pick')
    await flush()
    player.play('mix')
    player.play('ding')
    expect(started).toHaveLength(2)
    sources[0]?.onended?.()
    player.play('ding')
    expect(started).toHaveLength(3)
  })

  it('stops whatever is playing when asked', async () => {
    const { context, sources } = fakeContext()
    const player = createAudioPlayer({ sounds: SOUNDS, createContext: () => context, load, now: () => 0 })
    player.play('ding')
    await flush()
    player.stopAll()
    expect((sources[0] as unknown as { stop: ReturnType<typeof vi.fn> }).stop).toHaveBeenCalled()
  })

  it('wakes a suspended context from within the gesture that asked for a sound', () => {
    const { context } = fakeContext()
    const suspended = { ...context, state: 'suspended' }
    createAudioPlayer({ sounds: SOUNDS, createContext: () => suspended, load }).play('pick')
    expect(suspended.resume).toHaveBeenCalled()
  })

  describe('failing safely', () => {
    it('does nothing where there is no Web Audio', () => {
      const player = createAudioPlayer({ sounds: SOUNDS, createContext: () => null, load })
      expect(() => player.play('pick')).not.toThrow()
    })

    it('survives a context that cannot be created', () => {
      const player = createAudioPlayer({
        sounds: SOUNDS,
        createContext: () => {
          throw new Error('not allowed')
        },
        load,
      })
      expect(() => player.play('pick')).not.toThrow()
      expect(() => player.stopAll()).not.toThrow()
    })

    it('survives a sound that fails to load or decode, and tries again later', async () => {
      const { context, started } = fakeContext()
      let fail = true
      const flaky = vi.fn(async (url: string) => {
        if (fail) throw new Error('offline')
        return load(url)
      })
      const player = createAudioPlayer({ sounds: SOUNDS, createContext: () => context, load: flaky, now: () => 0 })

      expect(() => player.play('pick')).not.toThrow()
      await flush()
      expect(started).toEqual([])

      fail = false
      player.play('pick')
      await flush()
      expect(started).toEqual([{ decoded: '/pick.wav' }])
    })

    it('survives a source that refuses to start', async () => {
      const { context } = fakeContext()
      const broken = {
        ...context,
        createBufferSource: () => {
          throw new Error('nope')
        },
      }
      const player = createAudioPlayer({ sounds: SOUNDS, createContext: () => broken, load, now: () => 0 })
      player.play('pick')
      await flush()
      expect(() => player.play('pick')).not.toThrow()
    })
  })
})
