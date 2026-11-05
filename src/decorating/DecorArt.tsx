/**
 * Art for the kitchen's decorations and the fixtures they sit in: the
 * window, the wall shelf and the cupboard doors. Same hand as the rest of
 * the kitchen (flat shapes, a cocoa ink outline, colours from tokens), drawn
 * from each decoration's `visual`. All decorative and aria-hidden: whatever
 * a player needs to know is always written beside it.
 */
import { useId, type ReactNode } from 'react'
import type { DecorationLook } from './types'

const INK = 'var(--ink)'
const LINE = 2

type ArtProps = { className?: string }

function Svg({ viewBox, className, children }: { viewBox: string; className?: string; children: ReactNode }) {
  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
      {children}
    </svg>
  )
}

// ---------------------------------------------------------------- fixtures

/** A four-pane window with a deep sill. Curtains and herbs are drawn over it, in the same 120×100 box. */
export function WindowFixture({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 120 100" className={className}>
      <rect x="14" y="6" width="92" height="80" rx="3" fill="var(--wood-200)" stroke={INK} strokeWidth={LINE} />
      <rect x="21" y="12" width="78" height="68" fill="var(--sky)" stroke={INK} strokeWidth="1.5" />
      {/* a soft cloud and the light on the glass */}
      <path d="M30 34 q5 -7 12 -3 q4 -6 11 -1 q6 0 5 6 h-28 q-4 -1 0 -2 z" fill="var(--paper)" opacity="0.9" />
      <path d="M78 20 l-14 22 M88 22 l-10 16" stroke="rgb(255 255 255 / 0.7)" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 12 V80 M21 46 H99" stroke="var(--wood-300)" strokeWidth="5" />
      <path d="M60 12 V80 M21 46 H99" stroke={INK} strokeWidth="1" opacity="0.5" />
      {/* sill */}
      <path d="M6 84 H114 L110 94 H10 Z" fill="var(--wood-300)" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
    </Svg>
  )
}

/** A plank on two brackets. Whatever stands on the shelf is drawn above it. */
export function ShelfFixture({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 100 26" className={className}>
      <path d="M22 9 V22 L32 9 Z M78 9 V22 L68 9 Z" fill="var(--wood-400)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="2" y="2" width="96" height="8" rx="1.5" fill="var(--wood-300)" stroke={INK} strokeWidth={LINE} />
      <path d="M8 5 H60" stroke="var(--wood-200)" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  )
}

// ---------------------------------------------------------------- textiles

type Point = readonly [number, number]
const LEMON_SPOTS: readonly Point[] = [
  [20, 28],
  [38, 42],
  [22, 58],
  [40, 70],
]
const BERRY_SPOTS: readonly Point[] = [
  [36, 26],
  [18, 44],
  [34, 58],
  [20, 72],
]
const LEMONS_ON_TREE: readonly Point[] = [
  [26, 26],
  [42, 16],
  [40, 30],
]

function TowelArt({ pattern, className }: { pattern: 'gingham' | 'fruit' | 'stripe'; className?: string }) {
  const id = `towel-${useId()}`
  const fill = pattern === 'gingham' ? `url(#${id})` : pattern === 'fruit' ? 'var(--paper)' : 'var(--paper-shade)'
  return (
    <Svg viewBox="0 0 60 92" className={className}>
      <defs>
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="var(--paper)" />
          <rect width="5" height="10" fill="var(--jam-500)" opacity="0.5" />
          <rect width="10" height="5" fill="var(--jam-500)" opacity="0.5" />
        </pattern>
      </defs>
      {/* folded over the handle: the back fold peeks out above */}
      <path d="M12 8 Q30 0 48 8 V20 H12 Z" fill={fill} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" opacity="0.85" />
      <path d="M10 14 H50 V80 Q30 84 10 80 Z" fill={fill} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      {pattern === 'stripe' && (
        <g fill="var(--ink-soft)" opacity="0.8">
          <rect x="11" y="24" width="38" height="4" />
          <rect x="11" y="31" width="38" height="2" />
          <rect x="11" y="62" width="38" height="2" />
          <rect x="11" y="67" width="38" height="4" />
        </g>
      )}
      {pattern === 'fruit' && (
        <g stroke={INK} strokeWidth="1">
          {LEMON_SPOTS.map(([x, y]) => (
            <ellipse key={`l${x}`} cx={x} cy={y} rx="4.5" ry="3.2" fill="var(--swatch-lemon)" />
          ))}
          {BERRY_SPOTS.map(([x, y]) => (
            <path key={`s${x}`} d={`M${x} ${y - 3} q4 0 3 4 q-1 3 -3 4 q-2 -1 -3 -4 q-1 -4 3 -4 z`} fill="var(--jam-500)" />
          ))}
        </g>
      )}
      {/* hem and a little fringe */}
      <path d="M10 76 Q30 80 50 76" fill="none" stroke={INK} strokeWidth="1" opacity="0.5" />
      <path d="M14 82 v5 M20 83 v5 M26 83 v5 M32 83 v5 M38 83 v5 M44 82 v5" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  )
}

function CurtainsArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 120 100" className={className}>
      {/* the wire across the middle of the window */}
      <path d="M18 48 H102" stroke={INK} strokeWidth="1.5" />
      <g stroke={INK} strokeWidth={LINE} strokeLinejoin="round">
        <path d="M19 48 H58 V80 Q50 84 42 80 Q34 84 26 80 Q22 82 19 80 Z" fill="var(--paper)" />
        <path d="M62 48 H101 V80 Q98 82 94 80 Q86 84 78 80 Q70 84 62 80 Z" fill="var(--paper)" />
      </g>
      {/* gathered folds and a jam-red hem */}
      <path d="M28 50 V78 M38 50 V79 M48 50 V79 M72 50 V79 M82 50 V79 M92 50 V78" stroke="var(--paper-shade)" strokeWidth="2.5" />
      <path d="M20 76 Q38 80 57 76 M63 76 Q82 80 100 76" fill="none" stroke="var(--jam-500)" strokeWidth="3" />
      {[24, 34, 44, 54, 66, 76, 86, 96].map((x) => (
        <circle key={x} cx={x} cy="48" r="1.8" fill="var(--wood-500)" />
      ))}
    </Svg>
  )
}

function HerbBundleArt({ className }: ArtProps) {
  const bundle = (x: number, length: number, leaf: string) => (
    <g key={x}>
      <path d={`M${x} 14 V${22}`} stroke="var(--kraft)" strokeWidth="1.5" />
      <path d={`M${x - 3} 22 h6`} stroke="var(--jam-500)" strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M${x} 22 V${22 + length}`} stroke="var(--leaf-700)" strokeWidth="1.5" />
      {Array.from({ length: Math.floor(length / 6) }, (_, index) => {
        const y = 26 + index * 6
        return (
          <g key={y} fill={leaf} stroke={INK} strokeWidth="0.8">
            <ellipse cx={x - 4} cy={y} rx="4" ry="1.8" transform={`rotate(35 ${x - 4} ${y})`} />
            <ellipse cx={x + 4} cy={y + 2} rx="4" ry="1.8" transform={`rotate(-35 ${x + 4} ${y + 2})`} />
          </g>
        )
      })}
    </g>
  )
  return (
    <Svg viewBox="0 0 120 100" className={className}>
      <path d="M21 14 Q60 19 99 14" fill="none" stroke="var(--kraft)" strokeWidth="1.8" />
      {bundle(36, 30, 'var(--leaf-500)')}
      {bundle(60, 36, 'var(--leaf-700)')}
      {bundle(84, 28, 'var(--leaf-500)')}
    </Svg>
  )
}

/** Dried orange slices on a string, swagged across the top of the window. */
function OrangeGarlandArt({ className }: ArtProps) {
  const slices: readonly [number, number][] = [
    [30, 22],
    [45, 27],
    [60, 29],
    [75, 27],
    [90, 22],
  ]
  return (
    <Svg viewBox="0 0 120 100" className={className}>
      <path d="M21 14 Q60 40 99 14" fill="none" stroke="var(--kraft)" strokeWidth="1.6" />
      {slices.map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="6.5" fill="var(--swatch-orange)" stroke={INK} strokeWidth="1.2" />
          <circle cx={x} cy={y} r="4.6" fill="#f6b25c" />
          <path
            d={`M${x} ${y - 4.6} V${y + 4.6} M${x - 4.6} ${y} H${x + 4.6} M${x - 3.3} ${y - 3.3} L${x + 3.3} ${y + 3.3} M${x + 3.3} ${y - 3.3} L${x - 3.3} ${y + 3.3}`}
            stroke="rgb(150 70 20 / 0.6)"
            strokeWidth="0.8"
          />
        </g>
      ))}
    </Svg>
  )
}

// ---------------------------------------------------------------- the wall

function FrameArt({ look, className }: { look: Extract<DecorationLook, { kind: 'frame' }>; className?: string }) {
  const moulding = look.moulding === 'gilt' ? 'var(--gilt)' : look.moulding === 'painted' ? 'var(--enamel-600)' : 'var(--wood-500)'
  if (look.picture === 'bakery-sign') {
    // A painted board on two chains, rather than a framed picture.
    return (
      <Svg viewBox="0 0 80 70" className={className}>
        <path d="M40 4 L16 22 M40 4 L64 22" stroke={INK} strokeWidth="1.4" strokeDasharray="2 2" />
        <circle cx="40" cy="4" r="2.2" fill="var(--brass)" stroke={INK} strokeWidth="1" />
        <rect x="6" y="22" width="68" height="42" rx="5" fill={moulding} stroke={INK} strokeWidth={LINE} />
        <rect x="11" y="27" width="58" height="32" rx="3" fill="none" stroke="var(--butter-300)" strokeWidth="1.2" strokeDasharray="3 2" />
        {/* a loaf, and "fresh bread" in painted lettering */}
        <path d="M24 48 q0 -10 16 -10 q16 0 16 10 z" fill="var(--dough-golden)" stroke={INK} strokeWidth="1.4" />
        <path d="M31 42 l3 4 M39 40 l3 5 M47 41 l3 4" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M18 54 H62" stroke="var(--butter-300)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 3" />
      </Svg>
    )
  }
  return (
    <Svg viewBox="0 0 64 80" className={className}>
      {/* the string and the nail it hangs from */}
      <path d="M32 4 L12 22 M32 4 L52 22" stroke={INK} strokeWidth="1.2" />
      <circle cx="32" cy="4" r="2" fill="var(--rack-wire)" />
      <rect x="6" y="18" width="52" height="58" rx="2" fill={moulding} stroke={INK} strokeWidth={LINE} />
      {look.moulding === 'gilt' && <rect x="9" y="21" width="46" height="52" fill="none" stroke="var(--foil)" strokeWidth="1.5" />}
      <rect x="13" y="25" width="38" height="44" fill={look.picture === 'gold-seal' ? 'var(--mythic-paper)' : 'var(--paper)'} stroke={INK} strokeWidth="1" />
      {look.picture === 'recipe-card' && (
        <g>
          <path d="M15 33 H49" stroke="var(--paper-margin)" strokeWidth="1.4" />
          <path d="M15 41 H49 M15 48 H49 M15 55 H49 M15 62 H49" stroke="var(--paper-rule)" strokeWidth="1" />
          <path d="M18 30 q3 -3 6 0 t6 0 t6 0" fill="none" stroke="var(--pencil)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M18 45 q4 -2 8 0 t8 0 M18 52 q3 -2 6 0 t6 0 t6 0" fill="none" stroke="var(--pencil)" strokeWidth="1" opacity="0.45" strokeLinecap="round" />
        </g>
      )}
      {look.picture === 'gold-seal' && (
        <g>
          <circle cx="32" cy="45" r="12" fill="var(--foil)" stroke="var(--rarity-mythic)" strokeWidth="1.6" />
          <circle cx="32" cy="45" r="9" fill="none" stroke="var(--rarity-mythic)" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          <path d="M32 38 L34 43 L39 43.5 L35 46.8 L36.4 52 L32 49 L27.6 52 L29 46.8 L25 43.5 L30 43 Z" fill="var(--rarity-mythic)" />
          <path d="M27 56 L24 66 L28 64 L30 67 L31 57 M37 56 L40 66 L36 64 L34 67 L33 57" fill="var(--jam-500)" stroke={INK} strokeWidth="0.8" />
        </g>
      )}
      {look.picture === 'photograph' && (
        // The fair-day photograph on a card mount: a white-edged print in faded sepia (the window, the
        // table, two figures), with its bottom-right corner torn away to show the mount behind.
        <g>
          <path d="M16 28 H48 V58 L43 63 L40 60 L37 66 H16 Z" fill="var(--chef-white)" stroke={INK} strokeWidth="0.8" />
          <path d="M19 31 H45 V56 L42 59 L39 57 L36 62 H19 Z" fill="var(--photo-sepia)" />
          <rect x="24" y="34" width="16" height="10" fill="var(--photo-light)" stroke="var(--photo-ink)" strokeWidth="0.7" />
          <path d="M32 34 V44 M24 39 H40" stroke="var(--photo-ink)" strokeWidth="0.6" />
          <path d="M20 52 H40" stroke="var(--photo-ink)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="26" cy="44" r="2.4" fill="var(--photo-ink)" />
          <path d="M23 52 Q26 45 29 52" fill="var(--photo-ink)" />
          <circle cx="35" cy="47.5" r="1.8" fill="var(--photo-ink)" />
          <path d="M33 52 Q35 48 37 52" fill="var(--photo-ink)" />
        </g>
      )}
      {look.picture === 'botanical' && (
        <g>
          <path d="M32 64 Q30 48 33 30" fill="none" stroke="var(--leaf-700)" strokeWidth="1.5" />
          {[34, 40, 46, 52, 58].map((y, index) => (
            <g key={y} fill="var(--leaf-500)" stroke="var(--leaf-700)" strokeWidth="0.6">
              <ellipse cx={index % 2 ? 27 : 37} cy={y} rx="5" ry="1.8" transform={`rotate(${index % 2 ? 25 : -25} ${index % 2 ? 27 : 37} ${y})`} />
              <ellipse cx={index % 2 ? 37 : 27} cy={y + 2} rx="4.5" ry="1.6" transform={`rotate(${index % 2 ? -25 : 25} ${index % 2 ? 37 : 27} ${y + 2})`} />
            </g>
          ))}
          <path d="M22 66 H42" stroke="var(--ink-soft)" strokeWidth="0.8" />
        </g>
      )}
    </Svg>
  )
}

function ScrapFrameArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 48 52" className={className}>
      {/* propped up on its little easel leg */}
      <path d="M30 10 L42 50" stroke="var(--wood-500)" strokeWidth="3" strokeLinecap="round" />
      <rect x="6" y="6" width="32" height="42" rx="1.5" fill="var(--wood-500)" stroke={INK} strokeWidth={LINE} transform="rotate(-4 22 27)" />
      <g transform="rotate(-4 22 27)">
        <path d="M11 12 H33 V38 L30 40 L27 38 L23 41 L19 38 L15 41 L11 38 Z" fill="var(--paper-shade)" stroke={INK} strokeWidth="0.8" />
        <path d="M14 18 q3 -2 6 0 t6 0 M14 24 q4 -2 8 0 t6 0 M14 30 q3 -2 6 0" fill="none" stroke="var(--pencil)" strokeWidth="1" strokeLinecap="round" />
      </g>
    </Svg>
  )
}

// ---------------------------------------------------------------- on the counter and the shelf

function PotPlantArt({ plant, className }: { plant: 'thyme' | 'lemon-tree' | 'coffee'; className?: string }) {
  const pot = (
    <g stroke={INK} strokeWidth={LINE} strokeLinejoin="round">
      <path d="M17 62 H51 L47 86 H21 Z" fill="var(--terracotta)" />
      <rect x="14" y="56" width="40" height="8" rx="2" fill="var(--terracotta)" />
    </g>
  )
  if (plant === 'thyme') {
    const tufts: readonly [number, number][] = [
      [22, 50],
      [30, 44],
      [38, 40],
      [46, 46],
      [26, 36],
      [36, 30],
      [44, 36],
      [32, 52],
      [42, 52],
    ]
    return (
      <Svg viewBox="0 0 68 88" className={className}>
        <path d="M30 56 Q28 40 24 32 M34 56 Q36 36 36 26 M38 56 Q42 42 46 34" fill="none" stroke="var(--leaf-700)" strokeWidth="1.4" />
        {tufts.map(([x, y]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="6" ry="4.5" fill={(x + y) % 3 ? 'var(--leaf-500)' : 'var(--leaf-700)'} stroke={INK} strokeWidth="1" />
        ))}
        {pot}
      </Svg>
    )
  }
  if (plant === 'coffee') {
    // Glossy, dark pointed leaves in pairs up a thin stem, with clusters of red cherries.
    const pairs: readonly [number, number][] = [
      [50, 0],
      [42, 1],
      [34, 0],
      [26, 1],
      [18, 0],
    ]
    return (
      <Svg viewBox="0 0 68 88" className={className}>
        <path d="M34 58 V12" stroke="var(--wood-500)" strokeWidth="2" strokeLinecap="round" />
        {pairs.map(([y, tilt]) => (
          <g key={y} fill="var(--leaf-700)" stroke={INK} strokeWidth="1">
            <path d={`M34 ${y} Q${22 - tilt * 2} ${y - 9} ${12 + tilt * 2} ${y - 2} Q${22} ${y + 3} 34 ${y} Z`} />
            <path d={`M34 ${y} Q${46 + tilt * 2} ${y - 9} ${56 - tilt * 2} ${y - 2} Q${46} ${y + 3} 34 ${y} Z`} />
          </g>
        ))}
        {[
          [31, 44],
          [37, 36],
          [31, 28],
        ].map(([x, y]) => (
          <g key={y} fill="var(--jam-500)" stroke={INK} strokeWidth="0.8">
            <circle cx={x} cy={y} r="2.4" />
            <circle cx={x! + 3} cy={y! + 1.5} r="2.4" />
          </g>
        ))}
        {pot}
      </Svg>
    )
  }
  return (
    <Svg viewBox="0 0 68 88" className={className}>
      <path d="M34 58 V30 M34 40 L26 32" stroke="var(--wood-500)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="34" cy="22" r="18" fill="var(--leaf-500)" stroke={INK} strokeWidth={LINE} />
      <path d="M22 18 q6 -8 14 -6 M30 32 q8 2 14 -4" fill="none" stroke="var(--leaf-700)" strokeWidth="1.5" strokeLinecap="round" />
      {LEMONS_ON_TREE.map(([x, y]) => (
        <ellipse key={x} cx={x} cy={y} rx="4" ry="3" fill="var(--swatch-lemon)" stroke={INK} strokeWidth="1" />
      ))}
      {pot}
    </Svg>
  )
}

function JarArt({ glaze, className }: { glaze: 'cream' | 'green'; className?: string }) {
  const body = glaze === 'cream' ? 'var(--glaze-cream)' : 'var(--glaze-green)'
  return (
    <Svg viewBox="0 0 60 72" className={className}>
      <ellipse cx="30" cy="68" rx="22" ry="3" fill="rgb(70 38 12 / 0.25)" />
      <path d="M12 26 Q8 50 14 66 H46 Q52 50 48 26 Z" fill={body} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M17 34 Q15 48 18 60" fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="3" strokeLinecap="round" />
      {glaze === 'cream' ? (
        <>
          <path d="M14 44 H46" stroke="var(--enamel-400)" strokeWidth="3" />
          <text x="30" y="56" textAnchor="middle" fontSize="8" fill="var(--ink-soft)" style={{ fontFamily: 'var(--font-hand)' }}>
            cookies
          </text>
        </>
      ) : (
        <path d="M14 40 q8 4 16 0 t16 0" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="2" />
      )}
      {/* lid and knob; the cream one has a chip out of its rim */}
      <path d="M10 20 Q30 12 50 20 V27 H10 Z" fill={body} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <circle cx="30" cy="12" r="4.5" fill={body} stroke={INK} strokeWidth={LINE} />
      {glaze === 'cream' && <path d="M44 20 l4 1 l-2 4 z" fill="var(--wood-300)" stroke={INK} strokeWidth="0.8" />}
    </Svg>
  )
}

function CrockArt({ material, className }: { material: 'stoneware' | 'copper'; className?: string }) {
  const body = material === 'copper' ? 'var(--copper-400)' : 'var(--stoneware)'
  return (
    <Svg viewBox="0 0 60 84" className={className}>
      <ellipse cx="30" cy="80" rx="20" ry="3" fill="rgb(70 38 12 / 0.25)" />
      {material === 'stoneware' ? (
        <g stroke={INK} strokeWidth="1.6" strokeLinecap="round">
          {/* wooden spoons and a spatula */}
          <path d="M20 44 L12 12" stroke="var(--wood-500)" strokeWidth="3" />
          <ellipse cx="11" cy="10" rx="4" ry="7" fill="var(--wood-300)" transform="rotate(-14 11 10)" />
          <path d="M30 44 L31 6" stroke="var(--wood-400)" strokeWidth="3" />
          <ellipse cx="31" cy="6" rx="4.5" ry="6" fill="var(--wood-200)" />
          <path d="M40 44 L48 16" stroke="var(--wood-500)" strokeWidth="3" />
          <rect x="44" y="4" width="10" height="13" rx="2" fill="var(--wood-300)" transform="rotate(16 49 10)" />
        </g>
      ) : (
        <g stroke={INK} strokeWidth="1.4" strokeLinecap="round" fill="none">
          {/* a whisk, a ladle and a spatula */}
          <path d="M18 44 L14 22" stroke="var(--rack-wire)" strokeWidth="2.5" />
          <path d="M14 22 C4 14 8 2 14 2 C20 2 22 14 14 22 M14 22 C9 12 12 4 14 2 C17 4 18 12 14 22" stroke="var(--rack-wire)" />
          <path d="M30 44 L31 10" stroke="var(--ink-soft)" strokeWidth="2.5" />
          <path d="M26 10 q5 -9 10 0 q-5 6 -10 0 z" fill="var(--rack-wire)" />
          <path d="M42 44 L47 18" stroke="var(--wood-500)" strokeWidth="3" />
          <rect x="42" y="6" width="11" height="13" rx="2" fill="var(--jam-500)" transform="rotate(12 47 12)" />
        </g>
      )}
      <path d="M10 40 H50 L47 76 Q30 80 13 76 Z" fill={body} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <ellipse cx="30" cy="40" rx="20" ry="4" fill={material === 'copper' ? 'var(--copper-600)' : 'var(--wood-500)'} stroke={INK} strokeWidth="1.5" />
      {material === 'copper' ? (
        <path d="M16 46 Q15 60 17 72" fill="none" stroke="rgb(255 240 210 / 0.6)" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d="M11 54 H49" stroke="var(--enamel-600)" strokeWidth="2.5" />
      )}
    </Svg>
  )
}

function RollingPinArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 96 50" className={className}>
      <ellipse cx="48" cy="46" rx="40" ry="3" fill="rgb(70 38 12 / 0.25)" />
      {/* the stand: two little cradles on a board */}
      <rect x="14" y="36" width="68" height="8" rx="2" fill="var(--wood-400)" stroke={INK} strokeWidth={LINE} />
      <path d="M24 36 V28 Q30 34 36 28 V36 M60 36 V28 Q66 34 72 28 V36" fill="var(--wood-300)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      {/* the pin, dark with use */}
      <rect x="20" y="20" width="56" height="12" rx="6" fill="var(--wood-500)" stroke={INK} strokeWidth={LINE} />
      <path d="M26 23 H70" stroke="rgb(255 230 190 / 0.4)" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="22.5" width="17" height="7" rx="3.5" fill="var(--wood-400)" stroke={INK} strokeWidth="1.6" />
      <rect x="75" y="22.5" width="17" height="7" rx="3.5" fill="var(--wood-400)" stroke={INK} strokeWidth="1.6" />
    </Svg>
  )
}

function BreadBoardArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 76 76" className={className}>
      <ellipse cx="38" cy="72" rx="30" ry="3" fill="rgb(70 38 12 / 0.25)" />
      {/* the board, propped against the wall, with a hole in its handle */}
      <path d="M22 70 L30 26 Q31 20 26 18 L30 4 H46 L50 18 Q45 20 46 26 L54 70 Z" fill="var(--wood-300)" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <circle cx="38" cy="11" r="3" fill="var(--wood-500)" stroke={INK} strokeWidth="1.2" />
      {/* a crusty loaf in front */}
      <path d="M10 70 Q8 50 38 48 Q68 50 66 70 Z" fill="var(--dough-golden)" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M22 58 l6 6 M34 54 l6 7 M46 55 l6 6" stroke="var(--swatch-brown-sugar)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 64 Q38 58 60 64" fill="none" stroke="rgb(255 240 200 / 0.5)" strokeWidth="2" />
    </Svg>
  )
}

// ---------------------------------------------------------------- keepsake rewards (Interval 9)

function CookieTinArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 64 56" className={className}>
      <ellipse cx="32" cy="52" rx="26" ry="3" fill="rgb(70 38 12 / 0.25)" />
      <path d="M8 22 H56 V48 Q32 54 8 48 Z" fill="var(--enamel-600)" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      {/* the windmill on the side, a little worn */}
      <path d="M32 46 V34 M32 34 l-7 -6 M32 34 l7 -6 M32 34 l-7 6 M32 34 l7 6" stroke="var(--enamel-300)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M28 46 L30 36 H34 L36 46 Z" fill="var(--enamel-300)" />
      {/* the lid, dented at one edge */}
      <path d="M5 16 Q32 9 59 16 V23 Q32 27 5 23 Z" fill="var(--enamel-400)" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M46 14 q3 3 6 1" fill="none" stroke={INK} strokeWidth="1" />
      <path d="M12 18 Q32 14 52 18" fill="none" stroke="rgb(255 255 255 / 0.5)" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

function OvenMittArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 60 92" className={className}>
      {/* the hanging loop over the handle */}
      <path d="M30 4 Q24 10 30 16 Q36 10 30 4" fill="none" stroke="var(--kraft)" strokeWidth="2" />
      <path
        d="M16 18 H44 Q50 18 50 26 V70 Q50 84 34 84 H24 Q10 84 10 70 V52 Q2 50 4 40 Q6 34 12 38 L16 42 Z"
        fill="var(--jam-500)"
        stroke={INK}
        strokeWidth={LINE}
        strokeLinejoin="round"
      />
      {/* quilting, the scorched thumb and the stitched cookie */}
      <path d="M18 30 L42 54 M18 46 L42 70 M42 30 L18 54 M42 46 L22 66" stroke="rgb(255 230 220 / 0.35)" strokeWidth="1.2" />
      <path d="M5 40 Q7 46 11 46" fill="none" stroke="var(--wood-500)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <circle cx="32" cy="58" r="7" fill="var(--dough-golden)" stroke={INK} strokeWidth="1" strokeDasharray="2 1.5" />
      <path d="M29 56 h1 M34 57 h1 M31 61 h1" stroke="var(--ink-soft)" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="14" y="16" width="32" height="7" rx="2" fill="var(--paper)" stroke={INK} strokeWidth="1.6" />
    </Svg>
  )
}

function RecipeBundleArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 64 50" className={className}>
      <ellipse cx="32" cy="46" rx="26" ry="3" fill="rgb(70 38 12 / 0.25)" />
      {/* a stack of old index cards, a little uneven */}
      <rect x="8" y="30" width="48" height="13" rx="1.5" fill="var(--paper-shade)" stroke={INK} strokeWidth="1.6" transform="rotate(2 32 36)" />
      <rect x="6" y="20" width="50" height="13" rx="1.5" fill="var(--paper)" stroke={INK} strokeWidth="1.6" transform="rotate(-3 32 26)" />
      <rect x="9" y="11" width="46" height="13" rx="1.5" fill="var(--paper-shade)" stroke={INK} strokeWidth="1.6" transform="rotate(1 32 18)" />
      <path d="M14 15 H26 M14 19 H24" stroke="var(--pencil)" strokeWidth="1" strokeLinecap="round" />
      {/* tied up with red ribbon, in a bow */}
      <path d="M31 8 V44" stroke="var(--jam-500)" strokeWidth="3.5" />
      <path d="M32 12 Q22 2 22 12 Q22 18 32 12 Q42 18 42 12 Q42 2 32 12" fill="var(--jam-500)" stroke={INK} strokeWidth="1.2" />
      <path d="M32 12 L27 22 M32 12 L37 22" stroke="var(--jam-500)" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  )
}

const PLATE_COOKIES: readonly Point[] = [
  [30, 32],
  [46, 32],
  [38, 45],
]

function CookiePlateArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 76 72" className={className}>
      <ellipse cx="38" cy="68" rx="28" ry="3" fill="rgb(70 38 12 / 0.25)" />
      {/* propped up on a little wire stand */}
      <path d="M22 68 L30 52 M54 68 L46 52" stroke="var(--rack-wire)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="38" cy="36" r="30" fill="var(--paper)" stroke={INK} strokeWidth={LINE} />
      <circle cx="38" cy="36" r="25" fill="none" stroke="var(--enamel-600)" strokeWidth="3" />
      <circle cx="38" cy="36" r="20" fill="none" stroke="var(--enamel-300)" strokeWidth="1.2" strokeDasharray="3 2" />
      {PLATE_COOKIES.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="8" fill="var(--dough-golden)" stroke={INK} strokeWidth="1.4" />
          <path d={`M${x - 3} ${y - 2} h1 M${x + 2} ${y} h1 M${x - 1} ${y + 3} h1`} stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
    </Svg>
  )
}

function TrophySpoonArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 48 60" className={className}>
      <ellipse cx="24" cy="56" rx="18" ry="2.5" fill="rgb(70 38 12 / 0.25)" />
      {/* a little wooden plinth with an engraved plate */}
      <path d="M8 46 H40 L42 54 H6 Z" fill="var(--wood-500)" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <rect x="15" y="48" width="18" height="4" rx="1" fill="var(--brass)" stroke={INK} strokeWidth="0.8" />
      {/* the spoon, standing in its cradle */}
      <path d="M24 46 V22" stroke="var(--rack-wire)" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="24" cy="13" rx="7" ry="10" fill="var(--paper-shade)" stroke={INK} strokeWidth={LINE} />
      <path d="M21 8 Q20 13 22 18" fill="none" stroke="rgb(255 255 255 / 0.8)" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 42 q6 -4 12 0" fill="none" stroke="var(--wood-300)" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  )
}

function CatFigurineArt({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 64 44" className={className}>
      <ellipse cx="32" cy="40" rx="26" ry="3" fill="rgb(70 38 12 / 0.25)" />
      {/* curled up asleep, tail round her paws */}
      <path d="M8 36 Q4 18 24 14 Q44 10 54 24 Q60 34 52 38 H12 Z" fill="var(--marmalade-500)" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M22 18 q2 6 0 10 M32 15 q2 6 0 10" fill="none" stroke="var(--marmalade-700)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 36 Q20 30 34 34 Q40 36 42 34" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      {/* her head, tucked in at the front, ears up */}
      <path d="M40 30 L42 18 L48 24 L54 18 L56 30 Q56 38 48 38 Q40 38 40 30 Z" fill="var(--marmalade-500)" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M44 22 L45 25 M52 22 L51 25" stroke="var(--marmalade-pink)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M43 30 q2 2 4 0 M49 30 q2 2 4 0" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="48" cy="34" rx="3" ry="2" fill="var(--marmalade-cream)" />
      {/* the china glaze */}
      <path d="M14 24 Q18 18 26 17" fill="none" stroke="rgb(255 255 255 / 0.6)" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  )
}

/** Any decoration, drawn from its look. */
export function DecorationArt({ look, className }: { look: DecorationLook; className?: string }) {
  switch (look.kind) {
    case 'towel':
      return <TowelArt pattern={look.pattern} className={className} />
    case 'frame':
      return <FrameArt look={look} className={className} />
    case 'scrap-frame':
      return <ScrapFrameArt className={className} />
    case 'curtains':
      return <CurtainsArt className={className} />
    case 'herb-bundle':
      return <HerbBundleArt className={className} />
    case 'pot-plant':
      return <PotPlantArt plant={look.plant} className={className} />
    case 'jar':
      return <JarArt glaze={look.glaze} className={className} />
    case 'crock':
      return <CrockArt material={look.material} className={className} />
    case 'rolling-pin':
      return <RollingPinArt className={className} />
    case 'bread-board':
      return <BreadBoardArt className={className} />
    case 'cookie-tin':
      return <CookieTinArt className={className} />
    case 'oven-mitt':
      return <OvenMittArt className={className} />
    case 'recipe-bundle':
      return <RecipeBundleArt className={className} />
    case 'cookie-plate':
      return <CookiePlateArt className={className} />
    case 'trophy-spoon':
      return <TrophySpoonArt className={className} />
    case 'orange-garland':
      return <OrangeGarlandArt className={className} />
    case 'cat-figurine':
      return <CatFigurineArt className={className} />
  }
}

/** The brass key from Chapter 5, on its loop of kitchen string. */
export function BrassKey({ className }: ArtProps) {
  return (
    <Svg viewBox="0 0 40 24" className={className}>
      <path d="M2 4 Q8 14 14 12" fill="none" stroke="var(--kraft)" strokeWidth="1.5" />
      <circle cx="18" cy="12" r="6" fill="none" stroke="var(--brass)" strokeWidth="3.5" />
      <circle cx="18" cy="12" r="6" fill="none" stroke={INK} strokeWidth="0.8" />
      <path d="M24 12 H38 M32 12 V17 M36 12 V16" stroke="var(--brass)" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  )
}
