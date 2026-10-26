import React, { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Building2,
  FileText,
  GitMerge,
  Network,
  Bell,
  BarChart3,
  Upload,
  Users,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../contexts/AuthContext'
import { getUnreadCount } from '../../api/notifications'
import { DataNote } from '../ui/DataNote'

// ─── Nav link definition ──────────────────────────────────────────────────────

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  badge?: number
  roles?: string[]
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  unreadCount: number
  pendingRelCount: number
  onClose?: () => void
}

function Sidebar({ unreadCount, pendingRelCount, onClose }: SidebarProps) {
  const { user, logout, hasRole } = useAuth()

  const mainLinks: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/institutions', label: 'Institutions', icon: Building2 },
    { to: '/cases', label: 'Cases', icon: FileText },
    {
      to: '/relationships',
      label: 'Relationships',
      icon: GitMerge,
      badge: pendingRelCount > 0 ? pendingRelCount : undefined,
    },
    { to: '/coordination', label: 'Coordination', icon: Network },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    {
      to: '/imports',
      label: 'Imports',
      icon: Upload,
      roles: ['data_admin', 'system_admin'],
    },
  ]

  const adminLinks: NavItem[] = [
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/audit', label: 'Audit Log', icon: ClipboardList },
  ]

  const showAdminSection = hasRole(['system_admin', 'senior_management'])

  return (
    <aside className="flex flex-col h-full w-64 bg-indigo-900 text-white flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-indigo-700">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-base leading-tight">AICTE C³</p>
            <p className="text-indigo-300 text-xs leading-tight">Case Coordination</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 rounded text-indigo-300 hover:text-white focus:outline-none"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {mainLinks.map((link) => {
          if (link.roles && !hasRole(link.roles)) return null
          return <SidebarNavLink key={link.to} item={link} />
        })}

        {showAdminSection && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                Administration
              </p>
            </div>
            {adminLinks.map((link) => (
              <SidebarNavLink key={link.to} item={link} />
            ))}
          </>
        )}
      </nav>

      {/* User area */}
      <div className="border-t border-indigo-700 px-4 py-4 space-y-3">
        {user && (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center
                text-white text-sm font-semibold flex-shrink-0"
              aria-hidden="true"
            >
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
              <p className="text-xs text-indigo-300 truncate capitalize">
                {user.role.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm
            text-indigo-200 hover:bg-indigo-700 hover:text-white
            focus:outline-none focus:ring-2 focus:ring-indigo-400
            transition-colors duration-150"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

function SidebarNavLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        clsx(
          'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium',
          'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400',
          isActive
            ? 'bg-indigo-700 text-white'
            : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
        )
      }
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 flex-shrink-0" />
        {item.label}
      </span>
      {item.badge !== undefined && (
        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1
          rounded-full bg-red-500 text-white text-xs font-semibold">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </NavLink>
  )
}

// ─── Top Header ───────────────────────────────────────────────────────────────

interface TopHeaderProps {
  onMenuClick: () => void
}

function TopHeader({ onMenuClick }: TopHeaderProps) {
  const { user } = useAuth()
  const location = useLocation()

  // Derive page title from pathname
  const pageTitle = (() => {
    const seg = location.pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
    return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
  })()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-900">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-4">
        <DataNote />
        {user && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div
              className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center
                text-white text-sm font-semibold flex-shrink-0"
              aria-hidden="true"
            >
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block font-medium truncate max-w-[150px]">
              {user.full_name}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}

// ─── AppLayout ────────────────────────────────────────────────────────────────

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Fetch unread notification count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: getUnreadCount,
    refetchInterval: 60_000, // poll every minute
    staleTime: 30_000,
  })

  const unreadCount = unreadData?.count ?? 0
  // Pending relationships badge is not yet available from a dedicated endpoint;
  // leave at 0 for now — individual pages can use their own queries.
  const pendingRelCount = 0

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar unreadCount={unreadCount} pendingRelCount={pendingRelCount} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative z-50 flex">
            <Sidebar
              unreadCount={unreadCount}
              pendingRelCount={pendingRelCount}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
