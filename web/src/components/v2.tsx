import type { CSSProperties, ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────
// Turbo Lavado v2 — primitives ported from the kit's ui_kits/turbo-lavado-web/v2.jsx.
// CSS lives in styles.css under the tl2-* family. Use ALONGSIDE the
// existing tl-* primitives from ./ui.
// ─────────────────────────────────────────────────────────────────────

// ── PageHeader ───────────────────────────────────────────────────────
export function PageHeader({
  eyebrow,
  eyebrowDot,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode
  eyebrowDot?: boolean
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="tl2-page-header">
      <div className="tl2-page-header__left">
        {eyebrow && (
          <div className="tl2-page-header__eyebrow">
            {eyebrowDot && <span className="dot" />}
            {eyebrow}
          </div>
        )}
        <h1 className="tl2-page-header__title">{title}</h1>
        {subtitle && <p className="tl2-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="tl2-page-header__right">{actions}</div>}
    </div>
  )
}

// ── Card (accent-strip chrome) ───────────────────────────────────────
export type CardTone = 'purple' | 'emerald' | 'amber' | 'rose' | 'ink' | 'yellow'

export function Card({
  tone,
  title,
  subtitle,
  actions,
  children,
  flush = false,
  noStrip = false,
  style,
  className,
}: {
  tone?: CardTone
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  flush?: boolean
  noStrip?: boolean
  style?: CSSProperties
  className?: string
}) {
  const cls = ['tl2-card', tone ? `t-${tone}` : '', noStrip ? 'no-strip' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} style={style}>
      {(title || actions) && (
        <div className="tl2-card__head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
        </div>
      )}
      <div className={`tl2-card__body${flush ? ' flush' : ''}`}>{children}</div>
    </div>
  )
}

// ── Sparkline (mini SVG) ─────────────────────────────────────────────
export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = 'var(--primary-600)',
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
}) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data.map<[number, number]>((v, i) => {
    const x = i * step
    const y = height - ((v - min) / range) * (height - 4) - 2
    return [x, y]
  })
  const line = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ')
  const last = points[points.length - 1]
  const fill = `${line} L ${last[0]} ${height} L 0 ${height} Z`
  return (
    <svg className="tl2-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ color }}>
      <path className="fill" d={fill} fill="currentColor" />
      <path className="line" d={line} />
      <circle className="last" cx={last[0]} cy={last[1]} r={2.2} />
    </svg>
  )
}

// ── KPI (with optional sparkline + delta pill) ──────────────────────
export type KpiTone = 'good' | 'warn' | 'bad' | 'info'
export type DeltaDir = 'up' | 'down' | 'flat'

export function Kpi({
  label,
  value,
  cur,
  tone,
  sub,
  delta,
  deltaDir = 'flat',
  spark,
  sparkColor,
}: {
  label: ReactNode
  value: ReactNode
  cur?: string
  tone?: KpiTone
  sub?: ReactNode
  delta?: ReactNode
  deltaDir?: DeltaDir
  spark?: number[]
  sparkColor?: string
}) {
  return (
    <div className={`tl2-kpi${tone ? ` t-${tone}` : ''}`}>
      <div className="tl2-kpi__label"><span className="dot" />{label}</div>
      <div className="tl2-kpi__value tl2-mono-display">
        {cur && <span className="cur">{cur}</span>}
        {value}
      </div>
      <div className="tl2-kpi__foot">
        <span>{sub}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {delta && (
            <span className={`tl2-kpi__delta ${deltaDir}`}>
              {deltaDir === 'up' ? '↑' : deltaDir === 'down' ? '↓' : '—'} {delta}
            </span>
          )}
          {spark && <Sparkline data={spark} color={sparkColor} />}
        </span>
      </div>
    </div>
  )
}

// ── Brand watermark hero card ────────────────────────────────────────
export function BrandHero({
  corner,
  children,
  watermark = 'TURBO',
  style,
  className,
}: {
  corner?: ReactNode
  children: ReactNode
  watermark?: ReactNode
  style?: CSSProperties
  className?: string
}) {
  return (
    <div className={`tl2-hero${className ? ` ${className}` : ''}`} style={style}>
      {corner && <div className="tl2-hero__corner">{corner}</div>}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      {watermark && <div className="tl2-hero__watermark">{watermark}</div>}
    </div>
  )
}

// ── License-plate badge ──────────────────────────────────────────────
export function LicensePlate({ children }: { children: ReactNode }) {
  return (
    <span className="tl2-plate">
      <span className="tl2-plate__rim" />
      {children}
      <span className="tl2-plate__rim" />
    </span>
  )
}

// Hash a vehicle string to a fake plate so visuals stay readable when
// the underlying ticket doesn't carry one yet.
export function fakePlate(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0
  h = Math.abs(h)
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ'
  const a = letters[h % 23]
  const b = letters[Math.floor(h / 23) % 23]
  const c = letters[Math.floor(h / 529) % 23]
  const n = (h % 90) + 10
  const m = (Math.floor(h / 90) % 90) + 10
  return `${a}${b}${c}-${n}-${m}`
}

// ── Monogram tile (inventory category, etc.) ─────────────────────────
export function Monogram({ name, tone = 'green' }: { name: string; tone?: 'green' | 'amber' | 'purple' | 'ink' }) {
  const bg =
    tone === 'green'  ? 'linear-gradient(135deg, #34d399, #059669)'
    : tone === 'amber'  ? 'linear-gradient(135deg, #fbbf24, #d97706)'
    : tone === 'purple' ? 'linear-gradient(135deg, #a78bfa, #7c3aed)'
                        : 'linear-gradient(135deg, var(--ink-500), var(--ink-700))'
  const ch = (name[0] || '?').toUpperCase()
  return <span className="tl2-monogram" style={{ background: bg }}>{ch}</span>
}

// ── Risk meter ring (vigilancia) ─────────────────────────────────────
export function RiskMeter({ score, max = 500 }: { score: number; max?: number }) {
  const pct = Math.min(1, score / max)
  const radius = 26
  const circ = 2 * Math.PI * radius
  const color = pct > 0.6 ? '#ef4444' : pct > 0.35 ? '#f59e0b' : '#10b981'
  return (
    <div className="tl2-meter">
      <svg width={64} height={64} viewBox="0 0 64 64">
        <circle cx={32} cy={32} r={radius} fill="none" stroke="var(--ink-100)" strokeWidth={6} />
        <circle
          cx={32}
          cy={32}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - pct * circ}
        />
      </svg>
      <span className="tl2-meter__label" style={{ color }}>{score}</span>
    </div>
  )
}

// ── Completion ring (cierre del día) ─────────────────────────────────
export function CompletionRing({
  pct,
  label,
  color = 'var(--brand-green)',
  size = 56,
}: {
  pct: number
  label?: ReactNode
  color?: string
  size?: number
}) {
  const radius = (size - 8) / 2
  const circ = 2 * Math.PI * radius
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ink-100)" strokeWidth={5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - pct * circ}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 13,
          color: 'var(--ink-900)',
        }}
      >
        {label ?? `${Math.round(pct * 100)}%`}
      </span>
    </div>
  )
}

// ── Underline tabs ───────────────────────────────────────────────────
export function UnderlineTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: T; label: ReactNode; icon?: ReactNode; count?: number }>
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="tl2-tabs">
      {items.map((it) => (
        <button
          type="button"
          key={it.id}
          className={`tl2-tabs__tab${value === it.id ? ' active' : ''}`}
          onClick={() => onChange(it.id)}
        >
          {it.icon}
          {it.label}
          {typeof it.count === 'number' && <span className="count">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}
