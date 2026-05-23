import type { SVGProps } from 'react'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'stroke'> & { size?: number; stroke?: number }

const base = ({ size = 18, stroke = 1.85, ...rest }: IconProps) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: stroke,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...rest,
})

export const IDashboard = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
)
export const ITicketNew = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 100-4V8z"/><path d="M9 12h6M12 9v6"/></svg>
)
export const ITickets = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 100-4V8z"/><path d="M9 7v10"/></svg>
)
export const IMoney = (p: IconProps) => (
  <svg {...base(p)}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/></svg>
)
export const ICut = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 9.5l12 5M6 14.5l12-5"/><circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/></svg>
)
export const IPayroll = (p: IconProps) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.6 3.3-6 6.5-6s6 2.4 6.5 6"/><circle cx="17.5" cy="9.5" r="2.5"/><path d="M14 18c.4-2 2-3.5 3.5-3.5"/></svg>
)
export const IInventory = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4M21 7v10l-9 4"/></svg>
)
export const ICatalog = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>
)
export const IReports = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg>
)
export const IAi = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3l1.6 4 4 1.6-4 1.6L12 14l-1.6-4-4-1.6 4-1.6L12 3z"/><path d="M19 14l.8 2 2 .8-2 .8L19 20l-.8-2-2-.8 2-.8z"/><path d="M5 16l.6 1.5 1.5.6-1.5.6L5 20l-.6-1.5-1.5-.6 1.5-.6z"/></svg>
)
export const IAudit = (p: IconProps) => (
  <svg {...base(p)}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
)
export const IShield = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
)
export const ISearch = (p: IconProps) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
)
export const IBell = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></svg>
)
export const ICalendar = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>
)
export const IPlus = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14"/></svg>
)
export const ILogout = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
)
export const ICheck = (p: IconProps) => (
  <svg {...base(p)}><path d="M20 6L9 17l-5-5"/></svg>
)
export const IAlert = (p: IconProps) => (
  <svg {...base(p)}><path d="M10.3 3.86a2 2 0 013.4 0l8 14a2 2 0 01-1.7 3H4a2 2 0 01-1.7-3l8-14z"/><path d="M12 9v4M12 17h.01"/></svg>
)
export const IInfo = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>
)
export const IX = (p: IconProps) => (
  <svg {...base(p)}><path d="M18 6L6 18M6 6l12 12"/></svg>
)
export const ICar = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 17h14M5 13h14M5 13l1.5-5h11L19 13"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>
)
export const ICash = (p: IconProps) => (
  <svg {...base(p)}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>
)
