import type { CSSProperties, ReactNode } from 'react'
import { IAlert, ICheck, IInfo } from './icons'

/* ─────────────────────────────────────────────────────────────────────
   Turbo Lavado — UI primitives.
   Each component wraps the design-system CSS classes from styles.css.
   ───────────────────────────────────────────────────────────────────── */

export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'gray' | 'purple'
export type MetricTone = 'default' | 'good' | 'warn' | 'bad' | 'info' | 'feature'
export type BannerTone = 'good' | 'warn' | 'bad' | 'info'
export type PanelTone = 'default' | 'accent' | 'warn' | 'feature'
export type PageHeadTone = 'default' | 'hero'
export type StatStripTone = 'default' | 'good' | 'warn' | 'bad' | 'info' | 'purple'

/** Legacy alias kept so callers using the old `variant` names keep working. */
export type MetricVariant = 'default' | 'success' | 'danger' | 'info' | 'feature' | 'warn'
const METRIC_VARIANT_TO_TONE: Record<MetricVariant, MetricTone> = {
  default: 'default',
  success: 'good',
  danger:  'bad',
  info:    'info',
  feature: 'feature',
  warn:    'warn',
}
export function variantToTone(v?: MetricVariant): MetricTone {
  return v ? METRIC_VARIANT_TO_TONE[v] : 'default'
}

function slugify(label: string): string {
  // Strip Spanish diacritics first so "Préstamos" → "prestamos" — keeps
  // ASCII test ids stable as we add proper accents to UI copy.
  const ascii = label.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return ascii.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ─── Panel ──────────────────────────────────────────────────────────────
export function Panel({
  title,
  subtitle,
  actions,
  foot,
  children,
  flush = false,
  tone = 'default',
  className = '',
  style,
  testId,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  foot?: ReactNode
  children?: ReactNode
  flush?: boolean
  tone?: PanelTone
  className?: string
  style?: CSSProperties
  testId?: string
}) {
  const slug = typeof title === 'string' ? slugify(title) : ''
  const toneCls = tone !== 'default' ? tone : ''
  return (
    <div className={`tl-panel ${toneCls} ${className}`.trim()} style={style} data-testid={testId ?? (slug ? `panel-${slug}` : undefined)}>
      {(title || actions) && (
        <div className="tl-panel-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`tl-panel-body ${flush ? 'flush' : ''}`}>{children}</div>
      {foot && <div className="tl-panel-foot">{foot}</div>}
    </div>
  )
}

// ─── Metric ─────────────────────────────────────────────────────────────
export function Metric({
  label,
  value,
  sub,
  tone,
  variant,
  cur,
  delta,
  dir,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  /** Modern API. Use one of: default / good / warn / bad / info / feature. */
  tone?: MetricTone
  /** Legacy API alias — accepts old names like 'success' and 'danger'. */
  variant?: MetricVariant
  cur?: string
  delta?: string
  dir?: 'up' | 'down'
}) {
  const resolvedTone = tone ?? variantToTone(variant)
  const slug = slugify(label)
  return (
    <div
      className={`tl-metric ${resolvedTone !== 'default' ? resolvedTone : ''}`}
      data-testid={`metric-${slug}`}
    >
      <div className="label">
        <span className="dot" />
        {label}
      </div>
      <div className="value" data-testid={`metric-${slug}-value`}>
        {cur && <span className="cur">{cur}</span>}
        {value}
      </div>
      {(sub || delta) && (
        <div className="sub">
          {sub}
          {delta && (
            <span className={`delta ${dir === 'up' ? 'up' : 'down'}`}>
              {dir === 'up' ? '▲' : '▼'} {delta}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Pill ───────────────────────────────────────────────────────────────
export function Pill({ tone = 'gray', children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`tl-pill ${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}

const STATUS_TONE: Record<string, [Tone, string]> = {
  Activo:        ['good', 'Activo'],
  Cortesia:      ['warn', 'Cortesia'],
  Cortesía:      ['warn', 'Cortesia'],
  Cancelado:     ['bad', 'Cancelado'],
  Efectivo:      ['gray', 'Efectivo'],
  Tarjeta:       ['info', 'Tarjeta'],
  OK:            ['good', 'OK'],
  'Stock bajo':  ['warn', 'Stock bajo'],
  'Sin control': ['gray', 'Sin control'],
  Abierto:       ['gray', 'Abierto'],
  Cerrado:       ['good', 'Cerrado'],
  Calculado:     ['info', 'Calculado'],
  Bloqueado:     ['good', 'Bloqueado'],
}

export function StatusPill({ kind }: { kind: string }) {
  const [tone, label] = STATUS_TONE[kind] ?? (['gray', kind] as const)
  return <Pill tone={tone}>{label}</Pill>
}

// ─── Banner ─────────────────────────────────────────────────────────────
export function Banner({
  tone = 'info',
  title,
  text,
  cta,
  icon,
}: {
  tone?: BannerTone
  title: ReactNode
  text?: ReactNode
  cta?: ReactNode
  icon?: ReactNode
}) {
  const fallbackIcon = tone === 'warn' || tone === 'bad' ? <IAlert size={18} /> : tone === 'good' ? <ICheck size={18} /> : <IInfo size={18} />
  return (
    <div className={`tl-banner ${tone}`}>
      <div className="b-icon">{icon ?? fallbackIcon}</div>
      <div className="b-body">
        <div className="b-title">{title}</div>
        {text && <div className="b-text">{text}</div>}
      </div>
      {cta && <div className="flex items-center gap-2">{cta}</div>}
    </div>
  )
}

// ─── Button ─────────────────────────────────────────────────────────────
type BtnKind = 'primary' | 'go' | 'secondary' | 'ghost' | 'danger'
type BtnSize = 'sm' | 'md' | 'lg'

export function Button({
  kind = 'secondary',
  size = 'md',
  icon,
  children,
  onClick,
  block,
  type = 'button',
  disabled,
  loading,
  className = '',
  testId,
  style,
}: {
  kind?: BtnKind
  size?: BtnSize
  icon?: ReactNode
  children?: ReactNode
  onClick?: () => void
  block?: boolean
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  className?: string
  testId?: string
  style?: CSSProperties
}) {
  const sizeCls = size === 'sm' ? 'tl-btn-sm' : size === 'lg' ? 'tl-btn-lg' : ''
  const blockCls = block ? 'tl-btn-block' : ''
  const iconOnly = icon && !children ? 'tl-btn-icon' : ''
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      data-testid={testId}
      style={style}
      className={`tl-btn tl-btn-${kind} ${sizeCls} ${blockCls} ${iconOnly} ${className}`.trim()}
    >
      {loading ? <span className="tl-btn-spinner" /> : icon}
      {children}
    </button>
  )
}

// ─── Field ──────────────────────────────────────────────────────────────
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="tl-field">
      {label && <label>{label}</label>}
      {children}
      {hint && !error && <div className="hint">{hint}</div>}
      {error && <div className="err">{error}</div>}
    </div>
  )
}

// ─── Plate ──────────────────────────────────────────────────────────────
export function Plate({ children }: { children: ReactNode }) {
  return <span className="tl-plate">{children}</span>
}

// ─── Avatars ────────────────────────────────────────────────────────────
const TONE_PALETTE = [
  '#7c3aed', '#059669', '#dc2626', '#d97706', '#1d4ed8', '#5b2c83', '#0891b2', '#be123c',
]

function hashTone(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0
  return TONE_PALETTE[Math.abs(h) % TONE_PALETTE.length]
}

export function Avatars({ names, max = 3 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max)
  const extra = names.length - shown.length
  return (
    <span className="tl-avs">
      {shown.map((name, i) => (
        <span key={i} className="av" style={{ background: hashTone(name) }}>
          {(name[0] ?? '?').toUpperCase()}
        </span>
      ))}
      {extra > 0 && (
        <span className="av" style={{ background: '#94a3b8' }}>+{extra}</span>
      )}
    </span>
  )
}

// ─── SummaryRow ─────────────────────────────────────────────────────────
/**
 * Two-prop styles supported for ergonomics:
 *   <SummaryRow k="Total" v="$1,200" />
 *   <SummaryRow label="Total" value="$1,200" />   (legacy)
 */
export function SummaryRow(props: {
  k?: ReactNode
  v?: ReactNode
  label?: ReactNode
  value?: ReactNode
  vTone?: 'good' | 'warn' | 'bad'
}) {
  const k = props.k ?? props.label
  const v = props.v ?? props.value
  const color = props.vTone === 'good' ? 'var(--good-700)' : props.vTone === 'warn' ? 'var(--warn-700)' : props.vTone === 'bad' ? 'var(--bad-700)' : undefined
  const slug = typeof k === 'string' ? slugify(k) : ''
  return (
    <div className="tl-srow" data-testid={slug ? `summary-${slug}` : undefined}>
      <span className="k">{k}</span>
      <span className="v" style={color ? { color } : undefined} data-testid={slug ? `summary-${slug}-value` : undefined}>{v}</span>
    </div>
  )
}

// ─── Sparkline ──────────────────────────────────────────────────────────
export function Sparkline({ data, w = 80, h = 24, color }: { data: number[]; w?: number; h?: number; color?: string }) {
  if (data.length === 0) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w
    const y = h - ((d - min) / range) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const linePath = `M ${pts.join(' L ')}`
  const fillPath = `M 0,${h} L ${pts.join(' L ')} L ${w},${h} Z`
  const stroke = color ?? 'var(--primary-600)'
  const fill = color ? `${color}33` : 'rgba(124,58,237,0.15)'
  return (
    <svg width={w} height={h} className="block">
      <path d={fillPath} style={{ fill }} />
      <path d={linePath} style={{ stroke, fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
    </svg>
  )
}

// ─── EcoBadge ───────────────────────────────────────────────────────────
export function EcoBadge({ children = 'Ecológico' }: { children?: ReactNode }) {
  return (
    <span className="tl-eco-badge">
      <span className="leaf" />
      {children}
    </span>
  )
}

// ─── PageHead / PageTitle wrappers ──────────────────────────────────────
export function PageHead({
  title,
  subtitle,
  actions,
  tone = 'default',
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  tone?: PageHeadTone
}) {
  const toneCls = tone !== 'default' ? tone : ''
  return (
    <div className={`tl-page-head ${toneCls}`.trim()}>
      <div className="tl-page-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="tl-page-head-actions">{actions}</div>}
    </div>
  )
}

// ─── EmptyState ─────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  tone = 'default',
  cta,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  tone?: 'default' | 'good' | 'warn' | 'info' | 'purple'
  cta?: ReactNode
}) {
  const toneCls = tone !== 'default' ? tone : ''
  return (
    <div className={`tl-empty ${toneCls}`.trim()}>
      {icon && <span className="ico">{icon}</span>}
      <h4>{title}</h4>
      {description && <p>{description}</p>}
      {cta && <div className="cta">{cta}</div>}
    </div>
  )
}

// ─── StatStrip ──────────────────────────────────────────────────────────
export function StatStrip({
  label,
  value,
  sub,
  tone = 'default',
  pulse = false,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  tone?: StatStripTone
  pulse?: boolean
}) {
  const toneCls = tone !== 'default' ? tone : ''
  const slug = typeof label === 'string' ? slugify(label) : ''
  return (
    <div className={`tl-stat-strip ${toneCls}`.trim()} data-testid={slug ? `stat-${slug}` : undefined}>
      <div className="label">{label}{pulse && <span className="pulse" aria-hidden />}</div>
      {/* Second test id mirrors the SummaryRow contract so E2E tests written
          against summary-{slug}-value keep resolving after this swap. */}
      <div className="value" data-testid={slug ? `summary-${slug}-value` : undefined}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}
