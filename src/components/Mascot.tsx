import type React from 'react'
import './Mascot.css'

/**
 * Marmalade, the kitchen cat: a ginger chef with a tilted toque, olive-green
 * eyes and an apron with a jam heart on the pocket. Drawn as one SVG whose
 * face swaps between a handful of expressions. Motion is limited to small
 * CSS touches (a blink, an ear twitch, the tail, a hat wobble on big moments)
 * that all stop when motion is reduced; the expression swap stays.
 *
 * Purely decorative: whatever she says is written next to her as text.
 */
export type MascotExpression = 'idle' | 'happy' | 'thinking' | 'surprised' | 'excited' | 'proud' | 'celebrate'

export const MASCOT_NAME = 'Marmalade'

type Eyes = 'open' | 'closed' | 'wide' | 'lidded' | 'sparkle' | 'glance'
type Mouth = 'smile' | 'open' | 'o' | 'smirk'

const FACES: Record<MascotExpression, { eyes: Eyes; mouth: Mouth; blush: boolean; brow?: 'raised' | 'smug' }> = {
  idle: { eyes: 'open', mouth: 'smile', blush: false },
  happy: { eyes: 'closed', mouth: 'smile', blush: true },
  thinking: { eyes: 'glance', mouth: 'smirk', blush: false, brow: 'raised' },
  surprised: { eyes: 'wide', mouth: 'o', blush: false },
  excited: { eyes: 'sparkle', mouth: 'open', blush: true },
  proud: { eyes: 'lidded', mouth: 'smirk', blush: true, brow: 'smug' },
  celebrate: { eyes: 'closed', mouth: 'open', blush: true },
}

const INK = 'var(--ink)'
const FUR = 'var(--marmalade-500)'
const STRIPE = 'var(--marmalade-700)'
const CREAM = 'var(--marmalade-cream)'
const PINK = 'var(--marmalade-pink)'

const EYE_CENTRES = [
  [54, 66],
  [86, 66],
] as const

function Eye({ cx, cy, eyes }: { cx: number; cy: number; eyes: Eyes }) {
  switch (eyes) {
    case 'closed':
      // Happy crescents: ^ ^
      return <path d={`M${cx - 9} ${cy + 2} Q${cx} ${cy - 9} ${cx + 9} ${cy + 2}`} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    case 'lidded':
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx="10" ry="11" fill="var(--chef-white)" stroke={INK} strokeWidth="2" />
          <circle cx={cx + 1} cy={cy + 3} r="6.5" fill="var(--marmalade-eye)" />
          <circle cx={cx + 1} cy={cy + 3} r="3.5" fill={INK} />
          {/* Half-closed: fur over the top of the eye, and a lazy lid line. */}
          <path d={`M${cx - 11} ${cy} A11 12 0 0 1 ${cx + 11} ${cy} Z`} fill={FUR} />
          <path d={`M${cx - 10.5} ${cy} H${cx + 10.5}`} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    default: {
      const wide = eyes === 'wide'
      const dx = eyes === 'glance' ? 3 : 0
      const dy = eyes === 'glance' ? -3 : 0
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={wide ? 11 : 10} ry={wide ? 13 : 11} fill="var(--chef-white)" stroke={INK} strokeWidth="2" />
          <circle cx={cx + dx} cy={cy + dy} r={wide ? 5.5 : 7} fill="var(--marmalade-eye)" />
          <circle cx={cx + dx} cy={cy + dy} r={wide ? 2.6 : 4} fill={INK} />
          <circle cx={cx + dx + 2.5} cy={cy + dy - 3} r="2" fill="var(--chef-white)" />
          {eyes === 'sparkle' && <circle cx={cx + dx - 2.5} cy={cy + dy + 2.5} r="1.2" fill="var(--chef-white)" />}
          {/* An eyelid that only appears for a blink. */}
          <ellipse className="mascot__lid ambient" cx={cx} cy={cy} rx={wide ? 12 : 11} ry={wide ? 14 : 12} fill={FUR} />
        </g>
      )
    }
  }
}

function MouthShape({ mouth }: { mouth: Mouth }) {
  switch (mouth) {
    case 'open':
      return (
        <g>
          <path d="M61 85 Q70 100 79 85 Q70 89 61 85 Z" fill="var(--jam-700)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M65 92 Q70 89 75 92 Q70 97 65 92 Z" fill={PINK} />
        </g>
      )
    case 'o':
      return <ellipse cx="70" cy="89" rx="3.5" ry="4.5" fill="var(--jam-700)" stroke={INK} strokeWidth="1.5" />
    case 'smirk':
      return <path d="M70 82 V85 M62 86 Q66 88.5 70 85 Q75 90 80 83" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    case 'smile':
      return <path d="M70 82 V85 M62 85 Q66 89 70 85 Q74 89 78 85" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
  }
}

type MascotProps = {
  expression?: MascotExpression
  className?: string
}

export function Mascot({ expression = 'idle', className }: MascotProps) {
  const face = FACES[expression]
  return (
    <svg
      // Re-keyed per expression so one-shot touches (hat wobble, hop) replay on each new reaction.
      key={expression}
      className={['mascot', `mascot--${expression}`, className].filter(Boolean).join(' ')}
      viewBox="0 -16 140 156"
      aria-hidden="true"
      focusable="false"
      data-expression={expression}
    >
      <g className="mascot__figure">
        {/* Tail, behind everything, curling up on the right. */}
        <g className="mascot__tail ambient">
          <path d="M96 128 C124 126 134 104 127 84 C124 74 114 75 116 85 C120 101 112 113 94 116 Z" fill={FUR} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M121 96 L130 94 M118 106 L127 108" stroke={STRIPE} strokeWidth="3.5" strokeLinecap="round" />
        </g>

        {/* Shoulders and apron. */}
        <path d="M28 140 C28 110 46 96 70 96 C94 96 112 110 112 140 Z" fill={FUR} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M58 98 Q70 106 82 98 L84 108 Q70 114 56 108 Z" fill={CREAM} />
        <path d="M49 140 V116 Q70 110 91 116 V140 Z" fill="var(--chef-white)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M49 116 L60 100 M91 116 L80 100" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        <rect x="60" y="122" width="20" height="14" rx="2" fill="none" stroke={INK} strokeWidth="1.5" />
        <path d="M70 133 C62 127 66 122 70 126 C74 122 78 127 70 133 Z" fill="var(--jam-500)" />

        {/* Ears: drawn under the head so it overlaps their base. */}
        <g className="mascot__ear mascot__ear--left ambient">
          <path d="M37 54 L31 20 L61 37 Z" fill={FUR} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M40 48 L37 28 L54 38 Z" fill={PINK} />
        </g>
        <g className="mascot__ear mascot__ear--right">
          <path d="M103 54 L109 20 L79 37 Z" fill={FUR} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M100 48 L103 28 L86 38 Z" fill={PINK} />
        </g>

        {/* Head, with fluffy cheeks. */}
        <path
          d="M30 70 C28 46 46 32 70 32 C94 32 112 46 110 70 C115 73 114 80 107 82 C101 96 87 103 70 103 C53 103 39 96 33 82 C26 80 25 73 30 70 Z"
          fill={FUR}
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M60 35 Q61 41 63 45 M70 33 V46 M80 35 Q79 41 77 45" stroke={STRIPE} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M31 64 H41 M32 72 H40 M109 64 H99 M108 72 H100" stroke={STRIPE} strokeWidth="3" strokeLinecap="round" />
        <path d="M54 82 C54 74 62 72 70 76 C78 72 86 74 86 82 C86 92 78 97 70 97 C62 97 54 92 54 82 Z" fill={CREAM} />

        {face.blush && (
          <g className="mascot__blush">
            <ellipse cx="42" cy="81" rx="6" ry="3.5" fill={PINK} opacity="0.65" />
            <ellipse cx="98" cy="81" rx="6" ry="3.5" fill={PINK} opacity="0.65" />
          </g>
        )}

        {face.brow === 'raised' && <path d="M78 50 Q86 44 94 50" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
        {face.brow === 'smug' && (
          <path d="M45 54 Q54 51 62 55 M78 55 Q86 51 95 54" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        )}

        {EYE_CENTRES.map(([cx, cy]) => (
          <Eye key={cx} cx={cx} cy={cy} eyes={face.eyes} />
        ))}

        <path d="M66 78 H74 L70 82.5 Z" fill={PINK} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <MouthShape mouth={face.mouth} />

        <path d="M50 84 L24 79 M50 88 L25 91 M90 84 L116 79 M90 88 L115 91" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />

        {/* A small chef's toque, worn at an angle. */}
        <g className="mascot__hat">
          <g transform="rotate(-12 70 30)">
            <path
              d="M47 26 C36 24 33 8 45 5 C46 -6 62 -10 70 -2 C77 -10 94 -7 95 5 C107 7 104 24 93 26 Z"
              fill="var(--chef-white)"
              stroke={INK}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path d="M58 10 Q60 18 59 25 M80 10 Q79 18 81 25" fill="none" stroke="rgb(43 29 20 / 0.25)" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="46" y="24" width="48" height="11" rx="2.5" fill="var(--chef-white)" stroke={INK} strokeWidth="2.5" />
          </g>
        </g>
      </g>
    </svg>
  )
}

type MascotSaysProps = {
  expression: MascotExpression
  children: React.ReactNode
  className?: string
  /** For focusing the line itself (tutorial cards move focus here). */
  lineRef?: React.Ref<HTMLParagraphElement>
  lineId?: string
}

/**
 * Marmalade with something to say. Her name is written on the card, so a
 * screen reader hears "Marmalade: …" as plain text. The portrait is decoration.
 */
export function MascotSays({ expression, children, className, lineRef, lineId }: MascotSaysProps) {
  return (
    <div className={['mascot-says', className].filter(Boolean).join(' ')}>
      <Mascot expression={expression} className="mascot-says__portrait" />
      <div className="mascot-says__card">
        <p className="mascot-says__line" ref={lineRef} id={lineId} tabIndex={lineRef ? -1 : undefined}>
          <span className="mascot-says__name">
            {MASCOT_NAME}
            <span className="visually-hidden">:</span>
          </span>{' '}
          {children}
        </p>
      </div>
    </div>
  )
}
