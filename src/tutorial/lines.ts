import { findIngredient } from '../domain/ingredients'
import { nextUnlock, RARITY_LABELS } from '../domain/progression'
import type { GameSave } from '../domain/types'
import type { TutorialRun } from './tutorial'

/** What Marmalade says on each card. Short: one or two sentences, never a wall. */
export function tutorialLine(run: TutorialRun, save: GameSave): string {
  switch (run.step) {
    case 'welcome':
      return 'Oh! Someone’s finally here. I’m Marmalade, and I’ve been minding this kitchen.'
    case 'story':
      return 'The old recipe box is full of faded cards. Bake a recipe and its card comes back. Let’s start with an easy one.'
    case 'pick':
      return 'Flour, sugar and butter from the shelf. Just those three.'
    case 'mix':
      return 'Lovely. Now press Mix and give it a stir.'
    case 'bake':
      return 'Smells right already. Press Bake it.'
    case 'discovered': {
      const outcome = run.outcome
      const name = outcome?.result.kind === 'recipe' ? outcome.result.recipe.name : 'That'
      if (outcome?.reward) {
        const { rarity, crumbs, xp } = outcome.reward
        return `${name}! A ${RARITY_LABELS[rarity]} card, and every good book starts with one. That’s ${crumbs} Crumbs and ${xp} XP.`
      }
      return `${name} again. It’s already in the book, so no new Crumbs this time. Baking it again is just for fun.`
    }
    case 'book':
      return 'There it is, written back in. The book keeps every recipe you find, and Bake again lays one out for you.'
    case 'progress': {
      const upcoming = nextUnlock(save)
      const basics = 'New recipes earn Crumbs and Baker XP. Levels open up new ingredients, and Crumbs add them to the pantry.'
      if (!upcoming) return `${basics} Your shelves are already full, so yours are just for the record.`
      const name = findIngredient(upcoming.ingredientId)?.name.toLowerCase() ?? 'something new'
      return `${basics} First up: ${name}, at Baker Level ${upcoming.level} for ${upcoming.crumbs} Crumbs.`
    }
    case 'finish':
      return 'That’s enough from me. Try whatever looks good. I’ll be around.'
  }
}
