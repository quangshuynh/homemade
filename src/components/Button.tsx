import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import './Button.css'

type Variant = 'primary' | 'plain' | 'danger'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

export function Button({ variant = 'plain', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={['button', `button--${variant}`, className].filter(Boolean).join(' ')} {...props} />
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }

/** A link that looks like a button, for navigation actions. */
export function LinkButton({ variant = 'plain', className, ...props }: LinkButtonProps) {
  return <a className={['button', `button--${variant}`, className].filter(Boolean).join(' ')} {...props} />
}
