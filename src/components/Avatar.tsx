// Shared avatar: renders initial + optional background color.
// If no color, falls back to an accent gradient.
import type { CSSProperties } from 'react'

export default function Avatar({
  name,
  color,
  size = 24,
  className,
}: {
  name: string
  color?: string | null
  size?: number
  className?: string
}) {
  const ch = (name || '?')[0]?.toUpperCase() || '?'
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.max(10, Math.round(size * 0.45)),
    background: color || 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
    color: color ? '#fff' : 'var(--accent-contrast)',
  }
  return (
    <span
      className={`avatar-shared ${className || ''}`}
      style={style}
    >
      {ch}
    </span>
  )
}