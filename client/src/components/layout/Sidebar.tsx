'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { cn, truncate, formatDate } from '@/lib/utils';
import {
  Bot, MessageSquarePlus, Search, LayoutDashboard, Settings, Shield,
  Download, LogOut, ChevronLeft, Trash2, Star, MoreHorizontal,
  Menu, X, Sun, Moon,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { conversations, activeConversationId, searchQuery, loadConversations, createConversation, selectConversation, deleteConversation, updateConversation, setSearchQuery } = useChatStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', next);
  };

  const handleNewChat = async () => {
    const id = await createConversation();
    router.push('/chat');
    selectConversation(id);
    setMobileOpen(false);
  };

  const handleSelectChat = (id: string) => {
    selectConversation(id);
    router.push('/chat');
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItems = [
    { href: '/chat', icon: MessageSquarePlus, label: 'Chat' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/settings', icon: Settings, label: 'Settings' },
    { href: '/install', icon: Download, label: 'Install App' },
  ];

  if (user?.role === 'admin' || user?.role === 'owner') {
    navItems.splice(3, 0, { href: '/admin', icon: Shield, label: 'Admin' });
  }

  const sidebarContent = (
    <div className={cn(
      'flex flex-col h-full bg-[var(--surface-1)] border-r border-[var(--border)]',
      collapsed ? 'w-16' : 'w-72'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Bot className="w-7 h-7 text-brand-500" />
            <span className="font-bold text-lg">MCP AI Server</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition hidden md:block"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] md:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className={cn(
            'flex items-center gap-2 w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition font-medium',
            collapsed ? 'p-2.5 justify-center' : 'px-3 py-2.5'
          )}
        >
          <MessageSquarePlus className="w-4 h-4" />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 mb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search chats…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-0)] focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>
      )}

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {filteredConversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              'group flex items-center rounded-lg cursor-pointer transition',
              activeConversationId === conv.id
                ? 'bg-[var(--surface-2)]'
                : 'hover:bg-[var(--surface-2)]'
            )}
          >
            <button
              onClick={() => handleSelectChat(conv.id)}
              className={cn('flex-1 text-left p-2 min-w-0', collapsed && 'p-2.5')}
            >
              {collapsed ? (
                <MessageSquarePlus className="w-4 h-4 mx-auto text-[var(--text-secondary)]" />
              ) : (
                <div className="flex items-center gap-2">
                  {conv.starred && <Star className="w-3 h-3 text-yellow-500 flex-shrink-0 fill-yellow-500" />}
                  <span className="text-sm truncate">{truncate(conv.title, 32)}</span>
                </div>
              )}
              {!collapsed && (
                <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                  {formatDate(conv.updatedAt)}
                </span>
              )}
            </button>

            {!collapsed && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === conv.id ? null : conv.id); }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-3)] transition"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {menuOpen === conv.id && (
                  <div className="absolute right-0 top-full mt-1 bg-[var(--surface-0)] border border-[var(--border)] rounded-lg shadow-lg z-50 w-36">
                    <button
                      onClick={() => { updateConversation(conv.id, { starred: !conv.starred }); setMenuOpen(null); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[var(--surface-2)] transition"
                    >
                      <Star className="w-3.5 h-3.5" />
                      {conv.starred ? 'Unstar' : 'Star'}
                    </button>
                    <button
                      onClick={() => { deleteConversation(conv.id); setMenuOpen(null); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="border-t border-[var(--border)] p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/chat' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg transition text-sm',
                collapsed ? 'p-2.5 justify-center' : 'px-3 py-2',
                isActive
                  ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--border)] p-3">
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && user && (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-red-500 transition"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] shadow-sm md:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 h-full w-72">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block h-screen sticky top-0">
        {sidebarContent}
      </div>
    </>
  );
}
