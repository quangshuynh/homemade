import type { MascotExpression } from '../components/Mascot'
import { themeName } from './catalog'
import type { DecorMoment } from './rules'

/**
 * What Marmalade says about decorating. Three remarks in all, each made at
 * most once per kitchen (the save remembers which): the first thing put
 * out, the first whole theme out together, and the framed scrap. Swapping
 * things about otherwise gets no comment at all.
 */
export function decorRemark(moment: DecorMoment): { expression: MascotExpression; line: string } {
  switch (moment.id) {
    case 'first-equip':
      return { expression: 'happy', line: 'Oh, that looks like it’s always been there.' }
    case 'first-set':
      return { expression: 'proud', line: `The whole ${themeName(moment.theme)} set, out at once. It looks lived in again.` }
    case 'scrap-frame':
      return { expression: 'thinking', line: 'Same pencil as the notes. I’m not sure it was meant to be framed. I like it, though.' }
  }
}
