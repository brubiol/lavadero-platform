import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  IDashboard, ITicketNew, ITickets, IMoney, ICut, IPayroll, IInventory, ICatalog,
  IReports, IAi, IAudit, IShield, ICalendar, ISearch, ILogout, IPlus,
} from './icons'

/* ─────────────────────────────────────────────────────────────────────
   Turbo Lavado — Layout primitives: Frame, Sidebar, Topbar, MobileNav.
   Built to match the redesign handoff exactly using design-system CSS.
   ───────────────────────────────────────────────────────────────────── */

export type NavRole = 'OPERADOR' | 'GERENTE' | 'DUENO'

type NavItem = {
  id: string
  to: string
  label: string
  icon: ReactNode
  roles: NavRole[]
}

const NAV_OPS: NavItem[] = [
  { id: 'dashboard', to: '/',              label: 'Dashboard',     icon: <IDashboard />, roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'new',       to: '/tickets/nuevo', label: 'Nuevo ticket',  icon: <ITicketNew />, roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'tickets',   to: '/tickets',       label: 'Tickets',       icon: <ITickets />,   roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'gastos',    to: '/gastos',        label: 'Gastos',        icon: <IMoney />,     roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'cierre',    to: '/cierre-dia',    label: 'Cierre del día',icon: <ICut />,       roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'corte',     to: '/corte',         label: 'Corte',         icon: <ICut />,       roles: ['OPERADOR','GERENTE','DUENO'] },
  { id: 'paquetes',  to: '/paquetes',      label: 'Paquetes',      icon: <IMoney />,     roles: ['OPERADOR','GERENTE','DUENO'] },
]

const NAV_MGMT: NavItem[] = [
  { id: 'nomina',      to: '/nomina',      label: 'Nómina',      icon: <IPayroll />,   roles: ['GERENTE','DUENO'] },
  { id: 'inventario',  to: '/inventario',  label: 'Inventario',  icon: <IInventory />, roles: ['GERENTE','DUENO'] },
  { id: 'catalogos',   to: '/catalogos',   label: 'Catálogos',   icon: <ICatalog />,   roles: ['GERENTE','DUENO'] },
  { id: 'asistencia',  to: '/asistencia',  label: 'Asistencia',  icon: <ICalendar />,  roles: ['OPERADOR','GERENTE','DUENO'] },
]

const NAV_OWNER: NavItem[] = [
  { id: 'reportes',   to: '/reportes',   label: 'Reportes',   icon: <IReports />, roles: ['DUENO'] },
  { id: 'ai',         to: '/ai',         label: 'AI',         icon: <IAi />,      roles: ['DUENO'] },
  { id: 'vigilancia', to: '/vigilancia', label: 'Vigilancia', icon: <IShield />,  roles: ['DUENO'] },
  { id: 'auditoria',  to: '/auditoria',  label: 'Auditoría',  icon: <IAudit />,   roles: ['DUENO'] },
]

function inRole(role: NavRole, allowed: NavRole[]) {
  return allowed.includes(role)
}

function roleDisplay(role: NavRole) {
  return role === 'DUENO' ? 'Dueño' : role === 'GERENTE' ? 'Gerente' : 'Operador'
}

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Sidebar ────────────────────────────────────────────────────────────
export function Sidebar({
  role,
  userName,
  payrollAccess = true,
  onLogout,
}: {
  role: NavRole
  userName: string
  payrollAccess?: boolean
  onLogout: () => void
}) {
  const ops    = NAV_OPS.filter(it => inRole(role, it.roles))
  const mgmt   = NAV_MGMT.filter(it => inRole(role, it.roles) && (it.id !== 'nomina' || payrollAccess))
  const owner  = NAV_OWNER.filter(it => inRole(role, it.roles))
  return (
    <aside className="tl-sidebar">
      <div className="tl-sb-brand">
        <div className="tl-sb-logo">
          <img src="/logo.png" alt="Turbo Lavado" />
        </div>
        <div className="tl-sb-brand-text">
          <div className="name">Turbo Lavado</div>
          <div className="sub">
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--brand-green-bright)', boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
            Ecológico · operación diaria
          </div>
        </div>
      </div>

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
          {owner.map(it => <SidebarLink key={it.id} item={it} />)}
        </div>
      )}

      <div className="tl-sb-foot">
        <div className="tl-sb-avatar">{initialsOf(userName)}</div>
        <div className="tl-sb-user flex-1 min-w-0">
          <div className="name truncate">{userName}</div>
          <div className="role">{roleDisplay(role)}</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Cerrar sesion"
          aria-label="Cerrar sesion"
          className="tl-icon-btn"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          <ILogout size={16} />
        </button>
      </div>
    </aside>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      data-testid={`nav-${item.id}`}
      className={({ isActive }) => `tl-sb-link${isActive ? ' active' : ''}`}
    >
      <span className="ico">{item.icon}</span>
      <span className="elip">{item.label}</span>
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
        <span className="text-sm font-bold tracking-tight text-ink-900 truncate">Turbo Lavado</span>
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
