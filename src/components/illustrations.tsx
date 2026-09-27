/**
 * Hand-authored kitchen objects. Flat vector shapes with a cocoa ink outline
 * and colours from the design tokens. All are decorative (aria-hidden): the
 * control that contains one always carries its own text label.
 */

import { useId } from 'react'

type IllustrationProps = { className?: string }

const INK = 'var(--ink)'
const STROKE = 'var(--stroke-illustration)'

function Shadow({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgb(70 38 12 / 0.28)" />
}

export function MixingBowl({ className }: IllustrationProps) {
  return (
    <svg className={className} viewBox="0 0 260 190" aria-hidden="true" focusable="false">
      <Shadow cx={128} cy={174} rx={104} ry={13} />
      {/* spoon handle, behind the rim */}
      <path d="M168 78 L236 14" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <path d="M168 78 L236 14" stroke="var(--wood-400)" strokeWidth="8" strokeLinecap="round" />
      {/* bowl body */}
      <path
        d="M22 80 C25 136 72 170 128 170 C184 170 233 137 236 79 Z"
        fill="var(--enamel-400)"
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M31 104 C58 118 196 119 227 103" fill="none" stroke="var(--jam-500)" strokeWidth="6" strokeLinecap="round" />
      <path d="M46 132 C60 150 84 160 104 163" fill="none" stroke="rgb(255 255 255 / 0.45)" strokeWidth="5" strokeLinecap="round" />
      {/* a little chipped enamel */}
      <path d="M198 142 l6 -3 l2 5 l-5 2 z" fill={INK} opacity="0.75" />
      {/* rim */}
      <ellipse cx="129" cy="80" rx="108" ry="25" fill="var(--enamel-300)" stroke={INK} strokeWidth={STROKE} />
      <ellipse cx="129" cy="83" rx="94" ry="17" fill="#e8f2ee" />
      {/* soft dough, slowly rising */}
      <g className="mixing-bowl__dough ambient">
        <path
          d="M66 88 C70 72 96 66 116 70 C132 62 160 64 176 74 C194 76 198 88 188 94 C160 100 96 101 70 96 C64 94 64 91 66 88 Z"
          fill="var(--butter-300)"
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M100 80 q8 -5 16 0" fill="none" stroke="var(--butter-500)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M140 76 q6 -4 13 1" fill="none" stroke="var(--butter-500)" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* spoon bowl resting in the dough */}
      <ellipse cx="160" cy="84" rx="15" ry="8" transform="rotate(-38 160 84)" fill="var(--wood-300)" stroke={INK} strokeWidth="2.2" />
    </svg>
  )
}

export function RecipeBox({ className }: IllustrationProps) {
  return (
    <svg className={className} viewBox="0 0 210 180" aria-hidden="true" focusable="false">
      <Shadow cx={104} cy={166} rx={88} ry={10} />
      {/* open lid tipped back */}
      <path d="M34 64 L176 64 L184 24 L26 24 Z" fill="var(--jam-500)" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
      <path d="M40 58 L170 58" stroke="var(--jam-700)" strokeWidth="3" strokeLinecap="round" />
      {/* index cards and divider tabs */}
      <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
        <path d="M44 96 V52 H66 V44 H96 V52 H164 V96 Z" fill="var(--enamel-300)" />
        <path d="M40 100 V60 H128 V50 H158 V60 H168 V100 Z" fill="var(--paper)" />
        <path d="M38 104 V68 H52 V58 H84 V68 H170 V104 Z" fill="var(--butter-300)" />
      </g>
      <path d="M92 76 H158" stroke="var(--paper-rule)" strokeWidth="2" />
      {/* tin box */}
      <rect x="24" y="84" width="162" height="76" rx="7" fill="var(--butter-400)" stroke={INK} strokeWidth={STROKE} />
      <path d="M32 94 H178" stroke="var(--butter-500)" strokeWidth="3" strokeLinecap="round" />
      <rect x="74" y="108" width="62" height="30" rx="2" fill="var(--paper)" stroke={INK} strokeWidth="2" transform="rotate(-1.5 105 123)" />
      <path d="M84 120 q6 -5 12 0 t12 0 t12 0" fill="none" stroke="var(--ink-pen)" strokeWidth="2" strokeLinecap="round" />
      <path d="M86 129 H120" stroke="var(--paper-rule)" strokeWidth="1.5" />
    </svg>
  )
}

export function PantryJar({ className }: IllustrationProps) {
  const gingham = `gingham-${useId()}`
  return (
    <svg className={className} viewBox="0 0 160 200" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={gingham} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="var(--paper)" />
          <rect width="6" height="12" fill="var(--jam-500)" opacity="0.55" />
          <rect width="12" height="6" fill="var(--jam-500)" opacity="0.55" />
        </pattern>
      </defs>
      <Shadow cx={80} cy={186} rx={62} ry={9} />
      {/* glass */}
      <rect x="24" y="58" width="112" height="124" rx="20" fill="rgb(233 245 243 / 0.72)" stroke={INK} strokeWidth={STROKE} />
      {/* flour */}
      <path
        d="M31 112 C48 104 64 114 80 108 C98 102 112 112 129 106 V160 C129 169 122 175 113 175 H47 C38 175 31 169 31 160 Z"
        fill="var(--paper)"
        stroke="var(--paper-shade)"
        strokeWidth="2"
      />
      <path d="M38 76 V150" stroke="rgb(255 255 255 / 0.9)" strokeWidth="5" strokeLinecap="round" />
      <rect x="36" y="44" width="88" height="18" rx="4" fill="rgb(233 245 243 / 0.9)" stroke={INK} strokeWidth={STROKE} />
      {/* cloth cover and string */}
      <path
        d="M20 48 Q80 10 140 48 L144 66 L134 60 L124 68 L112 61 L100 69 L88 61 L76 69 L64 61 L52 69 L40 61 L28 68 L16 64 Z"
        fill={`url(#${gingham})`}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M26 58 Q80 64 134 58" fill="none" stroke="var(--wood-500)" strokeWidth="3" strokeLinecap="round" />
      <path d="M118 60 q10 8 4 18 M118 60 q-2 12 8 16" fill="none" stroke="var(--wood-500)" strokeWidth="2.5" strokeLinecap="round" />
      {/* label */}
      <rect x="52" y="128" width="56" height="28" rx="2" fill="var(--kraft)" stroke={INK} strokeWidth="2" transform="rotate(2 80 142)" />
      <path d="M62 142 q6 -4 12 0 t12 0 t10 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
