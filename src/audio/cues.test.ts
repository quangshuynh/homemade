import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { timedCues } from './cues'

describe('timed sound cues', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('rings anything due at 0 at once, and the rest on time, in order', () => {
    const played: string[] = []
    timedCues(
      [
        { id: 'ding', at: 0 },
        { id: 'level-up', at: 1450 },
        { id: 'discover-common', at: 350 },
      ],
      (id) => played.push(id),
    )
    expect(played).toEqual(['ding'])
    vi.advanceTimersByTime(349)
    expect(played).toEqual(['ding'])
    vi.advanceTimersByTime(1)
    expect(played).toEqual(['ding', 'discover-common'])
    vi.advanceTimersByTime(1100)
    expect(played).toEqual(['ding', 'discover-common', 'level-up'])
  })

  it('cancels whatever is still waiting, and nothing that already rang', () => {
    const played: string[] = []
    const cancel = timedCues(
      [
        { id: 'mastery-up', at: 700 },
        { id: 'achievement-unlock', at: 1400 },
      ],
      (id) => played.push(id),
    )
    vi.advanceTimersByTime(800)
    cancel()
    vi.advanceTimersByTime(5000)
    expect(played).toEqual(['mastery-up'])
    expect(vi.getTimerCount()).toBe(0)
  })
})
