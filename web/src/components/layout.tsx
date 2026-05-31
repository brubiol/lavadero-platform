import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  IDashboard, ITicketNew, ITickets, IMoney, ICut, IPayroll, IInventory, ICatalog,
  IReports, IAi, IAudit, IShield, ICalendar, ISearch, ILogout, IPlus, ILock, IReceipt, IClients,
} from './icons'

/* ─────────────────────────────────────────────────────────────────────
   Turbo Lavado — Layout primitives: Frame, Sidebar, Topbar, MobileNav.
   Built to match the redesign handoff: wordmark brand, "Nuevo ticket"
   quick action, live stats strip, gradient sidebar.
   ───────────────────────────────────────────────────────────────────── */

export type NavRole = 'OPERADOR' | 'GERENTE' | 'DUENO' | 'ADMIN'

type NavItem = {
  id: string
  to: string
  label: string
  icon: ReactNode
  roles: NavRole[]
}

const NAV_OPS: NavItem[] = [
  { id: 'dashboard', to: '/',              label: 'Dashboard',     icon: <IDashboard />, roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'new',       to: '/tickets/nuevo', label: 'Nuevo ticket',  icon: <IPlus />,      roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'tickets',   to: '/tickets',       label: 'Tickets',       icon: <ITickets />,   roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'clientes',  to: '/clientes',      label: 'Clientes',      icon: <IClients />,   roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'gastos',    to: '/gastos',        label: 'Gastos',        icon: <IReceipt />,   roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'cierre',    to: '/cierre-dia',    label: 'Cierre del día',icon: <ILock />,      roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'corte',     to: '/corte',         label: 'Corte',         icon: <ICut />,       roles: ['OPERADOR','GERENTE','DUENO'] },
]

const NAV_MGMT: NavItem[] = [
  { id: 'nomina',     to: '/nomina',     label: 'Nómina',     icon: <IPayroll />,   roles: ['GERENTE','DUENO'] },
  { id: 'inventario', to: '/inventario', label: 'Inventario', icon: <IInventory />, roles: ['GERENTE','DUENO'] },
  { id: 'catalogos',  to: '/catalogos',  label: 'Catálogos',  icon: <ICatalog />,   roles: ['GERENTE','DUENO'] },
  { id: 'lealtad',    to: '/lealtad',    label: 'Lealtad',    icon: <IClients />,   roles: ['GERENTE','DUENO'] },
  { id: 'asistencia', to: '/asistencia', label: 'Asistencia', icon: <ICalendar />,  roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'reportes',   to: '/reportes',   label: 'Reportes',   icon: <IReports />,   roles: ['GERENTE','DUENO'] },
]

const NAV_OWNER: NavItem[] = [
  { id: 'ai',         to: '/ai',         label: 'AI',         icon: <IAi />,    roles: ['DUENO'] },
  { id: 'vigilancia', to: '/vigilancia', label: 'Vigilancia', icon: <IShield />,roles: ['DUENO'] },
]

const ROLE_RANK: Record<NavRole, number> = { OPERADOR: 1, GERENTE: 2, DUENO: 3, ADMIN: 4 }

// Hierarchy-aware: a higher role sees everything its juniors can.
function inRole(role: NavRole, allowed: NavRole[]) {
  const min = Math.min(...allowed.map(r => ROLE_RANK[r]))
  return ROLE_RANK[role] >= min
}

function roleDisplay(role: NavRole) {
  return role === 'ADMIN' ? 'Admin'
    : role === 'DUENO' ? 'Dueño'
    : role === 'GERENTE' ? 'Gerente'
    : 'Operador'
}

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

// Live HH:MM ticker for the brand subtitle. Updates every 30s so the minute
// flips without re-rendering every second.
function useLiveTime() {
  const [time, setTime] = useState(() => formatTime(new Date()))
  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 30_000)
    return () => clearInterval(id)
  }, [])
  return time
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ─── Sidebar ────────────────────────────────────────────────────────────
export function Sidebar({
  role,
  userName,
  payrollAccess = true,
  flaggedCount = 0,
  liveStats,
  onLogout,
}: {
  role: NavRole
  userName: string
  payrollAccess?: boolean
  flaggedCount?: number
  liveStats?: { carsToday?: number; cashLabel?: string }
  onLogout: () => void
}) {
  const ops    = NAV_OPS.filter(it => inRole(role, it.roles))
  const mgmt   = NAV_MGMT.filter(it => inRole(role, it.roles) && (it.id !== 'nomina' || payrollAccess))
  const owner  = NAV_OWNER.filter(it => inRole(role, it.roles))
  const time = useLiveTime()
  const carsToday = liveStats?.carsToday
  const cashLabel = liveStats?.cashLabel

  return (
    <aside className="tl-sidebar">
      {/* Wordmark brand bar — gradient TL mark + name + live time */}
      <div className="tl-sb-brand">
        <div className="tl-sb-mark"><span>TL</span></div>
        <div className="tl-sb-wordmark">
          <div className="name">
            TURBO<span style={{ color: 'var(--brand-green-bright)' }}>·</span>LAVADO
          </div>
          <div className="sub">
            <span className="tl-sb-pulse" />
            Operación · {time}
          </div>
        </div>
      </div>

      {/* Quick action — Nuevo ticket */}
      <div className="tl-sb-quick">
        <NavLink to="/tickets/nuevo" className="tl-sb-quick-btn" data-testid="sidebar-quick-new-ticket">
          <IPlus size={14} stroke={2.6} />
          <span>Nuevo ticket</span>
          <kbd>N</kbd>
        </NavLink>
      </div>

      <nav className="tl-sb-nav">
        <div className="tl-sb-group" data-group="ops">
          {ops.map(it => <SidebarLink key={it.id} item={it} />)}
        </div>

        {mgmt.length > 0 && (
          <div className="tl-sb-group" data-group="mgmt">
            <div className="tl-sb-label">Gestión</div>
            {mgmt.map(it => <SidebarLink key={it.id} item={it} />)}
          </div>
        )}

        {owner.length > 0 && (
          <div className="tl-sb-group" data-group="owner">
            <div className="tl-sb-label">Dueño</div>
            {owner.map(it => (
              <SidebarLink
                key={it.id}
                item={it}
                badge={it.id === 'vigilancia' && flaggedCount > 0 ? flaggedCount : undefined}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Live stats strip — shows when AppShell can supply current numbers. */}
      {(carsToday != null || cashLabel != null) && (
        <div className="tl-sb-stats">
          <div className="tl-sb-stat">
            <span className="lbl">HOY</span>
            <span className="val">{carsToday != null ? carsToday : '—'}</span>
            <span className="sub">carros</span>
          </div>
          <div className="tl-sb-stat">
            <span className="lbl">CAJA</span>
            <span className="val">{cashLabel ?? '—'}</span>
            <span className="sub">en turno</span>
          </div>
        </div>
      )}

      {/* User foot */}
      <div className="tl-sb-foot">
        <div className="tl-sb-avatar">{initialsOf(userName)}</div>
        <div className="tl-sb-user">
          <div className="name">{userName}</div>
          <div className="role">{roleDisplay(role)}</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="tl-sb-logout"
        >
          <ILogout size={14} />
        </button>
      </div>
    </aside>
  )
}

function SidebarLink({ item, badge }: { item: NavItem; badge?: number }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      data-testid={`nav-${item.id}`}
      className={({ isActive }) => `tl-sb-link${isActive ? ' active' : ''}`}
    >
      <span className="ico">{item.icon}</span>
      <span className="lbl elip">{item.label}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span className="badge ml-auto">{badge > 99 ? '99+' : badge}</span>
      )}
    </NavLink>
  )
}

// ─── Topbar ─────────────────────────────────────────────────────────────
export function Topbar({
  crumbs = [],
  title,
  userName,
  role,
  actions,
}: {
  crumbs?: string[]
  title: string
  userName: string
  role: NavRole
  actions?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="tl-topbar hidden lg:flex">
      <div className="tl-crumb">
        {crumbs.map((c, i) => (
          <span key={i} className="contents">
            <span>{c}</span>
            <span className="sep">/</span>
          </span>
        ))}
        <span className="here">{title}</span>
      </div>
      <button type="button" className="tl-search cursor-pointer hover:border-primary-500 hover:bg-white transition-colors" onClick={() => navigate('/tickets')}>
        <ISearch size={14} />
        <span className="flex-1 text-left">Buscar tickets, lavadores, gastos…</span>
      </button>
      {actions}
      <NavLink to="/asistencia" className="tl-icon-btn" title="Asistencia" aria-label="Asistencia">
        <ICalendar size={16} />
      </NavLink>
      <div className="h-6 w-px bg-border-soft" />
      <div className="flex items-center gap-2.5">
        <div className="tl-sb-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
          {initialsOf(userName)}
        </div>
        <div className="leading-tight">
          <div className="text-[12.5px] font-semibold text-ink-900">{userName}</div>
          <div className="text-[11px] text-ink-500">{roleDisplay(role)}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Frame (desktop chrome) ─────────────────────────────────────────────
export function Frame({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="tl-frame">
      {sidebar}
      <div className="tl-main">{children}</div>
    </div>
  )
}

// ─── MobileTopbar ───────────────────────────────────────────────────────
export function MobileTopbar({ userName, pageTitle }: { userName: string; pageTitle?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border-soft bg-white/95 px-4 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="tl-sb-logo" style={{ width: 30, height: 30, flexShrink: 0 }}>
          <img src="/logo.png" alt="" />
        </div>
        <span className="text-sm font-bold tracking-tight text-ink-900 truncate">{userName ? 'Turbo Lavado' : 'Turbo Lavado'}</span>
      </div>
      {pageTitle && (
        <span className="tl-mob-page-label">{pageTitle}</span>
      )}
    </header>
  )
}

// ─── MobileNav (bottom tab bar with FAB) ────────────────────────────────
export function MobileNav({ role }: { role: NavRole }) {
  const _ = role // kept for future role-gated FAB swap
  return (
    <nav className="tl-mob-tabbar">
      <NavLink to="/" end className={({ isActive }) => `tl-mob-tab${isActive ? ' active' : ''}`} data-testid="mobile-nav-inicio">
        <IDashboard size={20} />
        <span>Inicio</span>
      </NavLink>
      <NavLink to="/tickets" className={({ isActive }) => `tl-mob-tab${isActive ? ' active' : ''}`} data-testid="mobile-nav-tickets">
        <ITickets size={20} />
        <span>Tickets</span>
      </NavLink>
      <NavLink to="/tickets/nuevo" data-testid="mobile-nav-nuevo" className="contents">
        <button type="button" className="tl-mob-fab" aria-label="Nuevo ticket">
          <IPlus size={22} stroke={2.4} />
        </button>
      </NavLink>
      <NavLink to="/gastos" className={({ isActive }) => `tl-mob-tab${isActive ? ' active' : ''}`} data-testid="mobile-nav-gastos">
        <IMoney size={20} />
        <span>Gastos</span>
      </NavLink>
      <NavLink to="/corte" className={({ isActive }) => `tl-mob-tab${isActive ? ' active' : ''}`} data-testid="mobile-nav-corte">
        <ICut size={20} />
        <span>Corte</span>
      </NavLink>
    </nav>
  )
}
