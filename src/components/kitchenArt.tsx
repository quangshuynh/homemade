/**
 * Art for the baking loop: ingredient jars, cookies, the bowl and the oven.
 * Driven by the catalogs' visual metadata (form, swatch, look); decorative
 * and aria-hidden, since the controls around them carry the words.
 */
import type { CookieLook, Ingredient } from '../domain/types'

const INK = 'var(--ink)'

type Point = readonly [number, number]

const GRANULES: readonly Point[] = [
  [30, 76],
  [44, 84],
  [58, 74],
  [68, 90],
  [36, 96],
  [54, 98],
  [72, 78],
]

const CHIP_PILE: readonly Point[] = [
  [28, 98],
  [42, 100],
  [56, 98],
  [70, 100],
  [34, 88],
  [50, 90],
  [64, 88],
  [42, 78],
  [58, 80],
]

const FLAKES: readonly Point[] = [
  [30, 74],
  [46, 70],
  [62, 76],
  [72, 90],
  [38, 88],
  [54, 92],
  [30, 100],
  [64, 100],
]

const swatchColour = (ingredient: Ingredient) => `var(--swatch-${ingredient.art.swatch})`
const doughColour = (dough: CookieLook['dough']) => `var(--dough-${dough})`

// ---------------------------------------------------------------- jars

function JarContents({ ingredient }: { ingredient: Ingredient }) {
  const fill = swatchColour(ingredient)
  switch (ingredient.art.form) {
    case 'powder':
      return <path d="M20 70 Q35 60 50 64 Q66 58 80 68 V100 Q80 106 74 106 H26 Q20 106 20 100 Z" fill={fill} />
    case 'granules':
      return (
        <g>
          <path d="M20 66 Q50 60 80 66 V100 Q80 106 74 106 H26 Q20 106 20 100 Z" fill={fill} />
          {GRANULES.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="rgb(120 110 100 / 0.45)" transform={`rotate(20 ${x} ${y})`} />
          ))}
        </g>
      )
    case 'block':
      return (
        <g>
          <rect x="26" y="68" width="48" height="34" rx="3" fill={fill} stroke={INK} strokeWidth="1.8" />
          <path d="M26 80 H74" stroke="var(--paper)" strokeWidth="6" opacity="0.9" />
        </g>
      )
    case 'eggs':
      return (
        <g stroke={INK} strokeWidth="1.8">
          <ellipse cx="38" cy="90" rx="12" ry="15" fill={fill} />
          <ellipse cx="62" cy="88" rx="12" ry="15" fill={fill} />
          <ellipse cx="50" cy="72" rx="11" ry="14" fill={fill} />
        </g>
      )
    case 'chips':
      return (
        <g>
          {CHIP_PILE.map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M${x - 6} ${y + 4} Q${x} ${y - 8} ${x + 6} ${y + 4} Z`} fill={fill} stroke={INK} strokeWidth="1" />
          ))}
        </g>
      )
    case 'flakes':
      return (
        <g>
          <path d="M20 68 Q34 60 50 66 Q66 60 80 68 V100 Q80 106 74 106 H26 Q20 106 20 100 Z" fill={fill} />
          {FLAKES.map(([x, y], index) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="4.5" ry="2.6" fill="rgb(255 255 255 / 0.55)" stroke="rgb(90 60 30 / 0.45)" strokeWidth="0.8" transform={`rotate(${index * 37} ${x} ${y})`} />
          ))}
        </g>
      )
    case 'spread':
      return (
        <g>
          <path d="M20 62 Q50 54 80 62 V100 Q80 106 74 106 H26 Q20 106 20 100 Z" fill={fill} />
          <path d="M34 66 q10 -8 18 -2 q8 6 16 -2" fill="none" stroke="rgb(255 255 255 / 0.4)" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'liquid':
      return null
  }
}

/** A labelled pantry container for one ingredient. Liquids get a little bottle instead of a jar. */
export function IngredientJar({ ingredient, className }: { ingredient: Ingredient; className?: string }) {
  if (ingredient.art.form === 'liquid') {
    return (
      <svg className={className} viewBox="0 0 100 120" aria-hidden="true" focusable="false">
        <ellipse cx="50" cy="114" rx="30" ry="5" fill="rgb(70 38 12 / 0.25)" />
        <path d="M38 34 V46 Q24 54 24 70 V104 Q24 112 32 112 H68 Q76 112 76 104 V70 Q76 54 62 46 V34 Z" fill="var(--glass)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M26 76 H74 V104 Q74 110 68 110 H32 Q26 110 26 104 Z" fill={swatchColour(ingredient)} />
        <path d="M32 64 V100" stroke="rgb(255 255 255 / 0.85)" strokeWidth="4" strokeLinecap="round" />
        <g className="jar-art__lid">
          <rect x="36" y="16" width="28" height="20" rx="3" fill="var(--wood-400)" stroke={INK} strokeWidth="2.5" />
        </g>
      </svg>
    )
  }
  const lid = ingredient.category === 'basic' ? 'var(--enamel-400)' : 'var(--jam-500)'
  return (
    <svg className={className} viewBox="0 0 100 120" aria-hidden="true" focusable="false">
      <ellipse cx="50" cy="114" rx="38" ry="5" fill="rgb(70 38 12 / 0.25)" />
      <rect x="16" y="34" width="68" height="76" rx="14" fill="var(--glass)" stroke={INK} strokeWidth="2.5" />
      <JarContents ingredient={ingredient} />
      <rect x="16" y="34" width="68" height="76" rx="14" fill="none" stroke={INK} strokeWidth="2.5" />
      <path d="M24 46 V92" stroke="rgb(255 255 255 / 0.85)" strokeWidth="4" strokeLinecap="round" />
      <g className="jar-art__lid">
        <rect x="12" y="18" width="76" height="18" rx="4" fill={lid} stroke={INK} strokeWidth="2.5" />
        <path d="M18 24 H82" stroke="rgb(255 255 255 / 0.4)" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/**
 * A jar that hasn't been added yet: wrapped in kraft paper and tied with
 * twine, with just a peek of what's inside at the top. Still clearly a jar
 * on the same shelf, so it reads as "coming", not "missing".
 */
export function WrappedJar({ ingredient, className }: { ingredient: Ingredient; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 120" aria-hidden="true" focusable="false">
      <ellipse cx="50" cy="114" rx="38" ry="5" fill="rgb(70 38 12 / 0.25)" />
      {/* The paper, gathered at the neck. */}
      <path
        d="M14 50 Q12 40 22 36 L34 30 Q50 24 66 30 L78 36 Q88 40 86 50 L88 104 Q88 112 80 112 H20 Q12 112 12 104 Z"
        fill="var(--kraft)"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M34 30 L28 14 L42 24 L50 10 L58 24 L72 14 L66 30" fill="var(--kraft)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="50" cy="31" rx="12" ry="4" fill={swatchColour(ingredient)} stroke={INK} strokeWidth="1.5" />
      <path d="M24 60 Q30 74 26 92 M74 58 Q70 80 76 96" stroke="rgb(70 38 12 / 0.25)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Twine round the neck and down the front, with a bow. */}
      <path d="M30 34 Q50 42 70 34" stroke="var(--jam-600)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M50 38 V110" stroke="var(--jam-600)" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 40 Q38 32 40 46 Q46 46 50 40 Q62 32 60 46 Q54 46 50 40" fill="none" stroke="var(--jam-600)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

// ---------------------------------------------------------------- cookies

const SHAPES: Record<CookieLook['shape'], string> = {
  round: 'M50 8 C74 8 92 26 92 50 C92 75 73 92 49 92 C25 92 8 74 8 50 C8 26 26 8 50 8 Z',
  square: 'M16 12 H84 Q90 12 90 18 V83 Q90 89 84 89 H17 Q11 89 11 83 V18 Q11 12 16 12 Z',
  wobbly: 'M48 10 C68 6 90 22 88 44 C94 64 76 90 52 88 C30 94 8 76 12 52 C4 30 26 12 48 10 Z',
}

const SUGAR_EXTRA: readonly Point[] = [
  [38, 76],
  [74, 38],
  [24, 46],
]

const TOPPING_SPOTS: readonly Point[] = [
  [34, 32],
  [60, 28],
  [70, 52],
  [44, 56],
  [28, 66],
  [58, 72],
  [50, 40],
]

function Topping({ look }: { look: CookieLook }) {
  switch (look.topping) {
    case 'none':
      return look.shape === 'square' ? (
        <g fill={INK} opacity="0.35">
          {[30, 50, 70].map((x) => [32, 52, 72].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />))}
        </g>
      ) : null
    case 'chips':
      return (
        <g fill="var(--swatch-chocolate)" stroke={INK} strokeWidth="1">
          {TOPPING_SPOTS.slice(0, 6).map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M${x - 5} ${y + 3} Q${x} ${y - 7} ${x + 5} ${y + 3} Z`} />
          ))}
        </g>
      )
    case 'sugar':
    case 'cinnamon-sugar':
      return (
        <g>
          {look.topping === 'cinnamon-sugar' &&
            TOPPING_SPOTS.map(([x, y]) => <circle key={`c${x}`} cx={x + 4} cy={y + 4} r="3" fill="var(--swatch-cinnamon)" opacity="0.7" />)}
          {[...TOPPING_SPOTS, ...SUGAR_EXTRA].map(([x, y]) => (
            <rect key={`s${x}-${y}`} x={x} y={y} width="3.2" height="3.2" fill="#fffdf6" stroke="rgb(43 29 20 / 0.35)" strokeWidth="0.6" transform={`rotate(30 ${x} ${y})`} />
          ))}
        </g>
      )
    case 'vanilla-flecks':
      return (
        <g fill={INK} opacity="0.55">
          {TOPPING_SPOTS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" />
          ))}
        </g>
      )
    case 'oats':
      return (
        <g fill="var(--swatch-oat)" stroke="rgb(43 29 20 / 0.5)" strokeWidth="0.9">
          {TOPPING_SPOTS.map(([x, y], index) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="4.5" ry="2.8" transform={`rotate(${index * 41} ${x} ${y})`} />
          ))}
        </g>
      )
    case 'coconut':
      return (
        <g fill="none" stroke="#fffdf6" strokeWidth="2.4" strokeLinecap="round">
          {[...TOPPING_SPOTS, ...SUGAR_EXTRA].map(([x, y], index) => (
            <path key={`${x}-${y}`} d={`M${x - 3} ${y} q3 ${index % 2 ? -3 : 3} 6 0`} />
          ))}
        </g>
      )
    case 'fork-marks':
      return (
        <g fill="none" stroke="rgb(43 29 20 / 0.4)" strokeWidth="2.2" strokeLinecap="round" transform="rotate(45 50 50)">
          {[38, 50, 62].map((at) => (
            <path key={`v${at}`} d={`M${at} 26 V74`} />
          ))}
          {[38, 50, 62].map((at) => (
            <path key={`h${at}`} d={`M26 ${at} H74`} />
          ))}
        </g>
      )
    case 'crinkle':
      return (
        <g fill="none" stroke="#fbf5e8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 44 L36 38 L42 48 L56 36 L64 46" />
          <path d="M30 66 L44 60 L52 70 L66 58 L78 64" />
          <path d="M50 18 L52 28 L46 34" />
        </g>
      )
  }
}

export function Cookie({ look, className }: { look: CookieLook; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d={SHAPES[look.shape]} transform="translate(2 4)" fill="rgb(70 38 12 / 0.28)" />
      <path d={SHAPES[look.shape]} fill={doughColour(look.dough)} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d={SHAPES[look.shape]} fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="5" transform="translate(50 50) scale(0.82) translate(-50 -50)" />
      <Topping look={look} />
    </svg>
  )
}

// ---------------------------------------------------------------- bowl

/** Where each dollop lands inside the bowl, in the order ingredients go in. */
const DOLLOP_SPOTS: readonly Point[] = [
  [100, 78],
  [150, 74],
  [124, 90],
  [78, 90],
  [170, 90],
]

type BowlProps = {
  ingredients: readonly Ingredient[]
  mixedDough: CookieLook['dough'] | null
  className?: string
}

/** The mixing bowl on the Bake screen: separate dollops until mixed, then one dough. */
export function BakingBowl({ ingredients, mixedDough, className }: BowlProps) {
  return (
    <svg className={className} viewBox="0 0 260 190" aria-hidden="true" focusable="false">
      <ellipse cx="128" cy="174" rx="104" ry="13" fill="rgb(70 38 12 / 0.28)" />
      <path d="M22 80 C25 136 72 170 128 170 C184 170 233 137 236 79 Z" fill="var(--enamel-400)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M31 104 C58 118 196 119 227 103" fill="none" stroke="var(--jam-500)" strokeWidth="6" strokeLinecap="round" />
      <path d="M46 132 C60 150 84 160 104 163" fill="none" stroke="rgb(255 255 255 / 0.45)" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="129" cy="80" rx="108" ry="25" fill="var(--enamel-300)" stroke={INK} strokeWidth="2.5" />
      <ellipse cx="129" cy="83" rx="94" ry="17" fill="#e8f2ee" />
      {mixedDough ? (
        <g className="baking-bowl__dough">
          <path
            d="M58 86 C62 70 96 64 118 68 C136 60 170 62 186 72 C204 76 206 90 194 96 C164 102 92 103 64 98 C56 96 55 90 58 86 Z"
            fill={doughColour(mixedDough)}
            stroke={INK}
            strokeWidth="2"
          />
          <path d="M96 82 q14 -10 30 -2 q14 8 30 -2" fill="none" stroke="rgb(255 255 255 / 0.4)" strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : (
        ingredients.map((ingredient, index) => {
          const [x, y] = DOLLOP_SPOTS[index % DOLLOP_SPOTS.length] as Point
          return (
            <g key={ingredient.id} className="baking-bowl__dollop">
              <ellipse cx={x} cy={y} rx="22" ry="10" fill={swatchColour(ingredient)} stroke={INK} strokeWidth="1.8" />
              <ellipse cx={x - 6} cy={y - 3} rx="7" ry="2.5" fill="rgb(255 255 255 / 0.45)" />
            </g>
          )
        })
      )}
    </svg>
  )
}

// ---------------------------------------------------------------- oven

export function Oven({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 200" aria-hidden="true" focusable="false">
      <rect x="14" y="10" width="212" height="182" rx="14" fill="var(--paper-shade)" stroke={INK} strokeWidth="2.5" />
      {[48, 90, 132, 174].map((x) => (
        <circle key={x} cx={x + 8} cy="30" r="8" fill="var(--enamel-600)" stroke={INK} strokeWidth="2" />
      ))}
      <rect x="30" y="52" width="180" height="124" rx="10" fill="#3a2419" stroke={INK} strokeWidth="2.5" />
      <rect className="oven__glow" x="42" y="64" width="156" height="100" rx="6" fill="var(--oven-glow)" opacity="0.55" />
      <rect x="54" y="126" width="132" height="10" rx="2" fill="#b9b3a8" stroke={INK} strokeWidth="1.5" />
      {[78, 120, 162].map((x) => (
        <ellipse key={x} cx={x} cy="120" rx="16" ry="8" fill="var(--dough-golden)" stroke={INK} strokeWidth="1.5" />
      ))}
      <rect x="70" y="40" width="100" height="8" rx="4" fill="var(--wood-500)" stroke={INK} strokeWidth="1.5" />
    </svg>
  )
}
