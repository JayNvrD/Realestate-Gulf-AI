import React, { useMemo, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Database,
  Bot,
  Link as LinkIcon,
  LogOut,
  Building2,
  X,
  Menu,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Layout() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation: NavItem[] = useMemo(
    () => [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Leads', href: '/leads', icon: Users },
      { name: 'Conversations', href: '/conversations', icon: MessageSquare },
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'Knowledge Base', href: '/kb', icon: Database },
      { name: 'AI Avatars', href: '/avatars', icon: Bot },
      { name: 'Public Links', href: '/links', icon: LinkIcon },
    ],
    [],
  );

  const isActive = (path: string) => location.pathname === path;

  const navItems = navigation.map((item) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Link
        key={item.name}
        to={item.href}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
        onClick={() => setSidebarOpen(false)}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="truncate">{item.name}</span>
      </Link>
    );
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="safe-area-top fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-fluid-lg font-bold text-slate-900">Realestate AI</h1>
                <p className="text-xs font-medium text-slate-500">Voice-First CRM</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{profile?.display_name}</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition duration-200 md:hidden ${
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-shell transition-transform duration-200 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-semibold text-slate-900">Navigation</span>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 px-4 py-4">{navItems}</nav>
      </aside>

      {/* Tablet icon rail */}
      <aside className="safe-area-top safe-area-bottom fixed bottom-0 left-0 top-16 z-30 hidden w-20 flex-col border-r border-slate-200 bg-white/95 backdrop-blur-md md:flex lg:hidden">
        <div className="flex h-full flex-col items-center gap-2 px-2 py-6">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex h-14 w-full items-center justify-center rounded-xl text-sm font-semibold transition ${
                  active
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
                title={item.name}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="safe-area-top safe-area-bottom fixed bottom-0 left-0 top-16 z-30 hidden w-72 flex-col border-r border-slate-200 bg-white/95 px-4 py-6 backdrop-blur-lg lg:flex">
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Main</p>
          </div>
          <nav className="space-y-1">{navItems}</nav>
        </div>
      </aside>

      <div className="flex min-h-screen pt-20">
        <main className="safe-area-bottom flex-1 pb-8 md:pl-20 lg:pl-72">
          <div className="mx-auto w-full max-w-shell px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
