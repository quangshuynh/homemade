import './SecretSeal.css'

/**
 * Marks a recipe as one of the kitchen's secrets: a round midnight-ink wax
 * seal with a keyhole, always beside the word "Secret". Separate from the
 * rarity stamp, because a secret can be any rarity.
 */
export function SecretSeal({ className }: { className?: string }) {
  return (
    <span className={['secret-seal', className].filter(Boolean).join(' ')}>
      <svg className="secret-seal__wax" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 1.5 C15 2 15.8 3.4 18.4 4.2 C21.2 5.6 21 8 22 10.6 C22.6 13.6 21.3 15.4 20 18 C18.2 20.6 16 21.2 13.2 22.3 C10.4 22.8 8.6 21.8 6 20.6 C3.4 19 2.8 16.8 1.9 14 C1.4 11 2.4 9.2 3.6 6.6 C5.4 3.8 8.4 1.9 12 1.5 Z" />
        <circle cx="12" cy="10" r="2.6" className="secret-seal__keyhole" />
        <path d="M10.8 11.5 L10 16.5 H14 L13.2 11.5 Z" className="secret-seal__keyhole" />
      </svg>
      <span className="secret-seal__label">Secret</span>
    </span>
  )
}
