function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * When something was baked, the way you'd scribble it on a label: "Today, 9:30 AM",
 * "Yesterday, 4:05 PM", "14 March, 8:00 AM". Uses the player's clock and locale.
 */
export function bakedAtLabel(iso: string, now: Date): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Some time ago'
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (sameDay(date, now)) return `Today, ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(date, yesterday)) return `Yesterday, ${time}`
  const day = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
  return `${day}, ${time}`
}
