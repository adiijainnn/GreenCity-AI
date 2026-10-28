'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Role } from '@/lib/types';
import { api } from '@/lib/api';
import { useTranslation, LanguageSelector } from '@/lib/i18n';
import { 
  TreePine, 
  Map, 
  CloudSun,
  Compass,
  Mic,
  BarChart3, 
  AlertTriangle, 
  ShieldCheck, 
  Building2, 
  Menu, 
  X, 
  LogIn, 
  LogOut, 
  Zap,
} from 'lucide-react';

interface NavLinkConfig {
  href: string;
  translationKey: string;
  fallbackLabel: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navLinksConfig: NavLinkConfig[] = [
  { href: '/', translationKey: 'nav.home', fallbackLabel: 'Home', icon: TreePine },
  { href: '/map', translationKey: 'nav.map', fallbackLabel: 'Live Map & GPS', icon: Map },
  { href: '/environment', translationKey: 'nav.environment', fallbackLabel: 'Live AQI & Weather', icon: CloudSun },
  { href: '/explore', translationKey: 'nav.explore', fallbackLabel: 'Nearby & Compare', icon: Compass },
  { href: '/assistant', translationKey: 'nav.assistant', fallbackLabel: 'Voice Assistant', icon: Mic },
  { href: '/analytics', translationKey: 'nav.analytics', fallbackLabel: 'City Analytics', icon: BarChart3 },
  { href: '/report', translationKey: 'nav.report', fallbackLabel: 'Report Issue', icon: AlertTriangle },
  { href: '/reports', translationKey: 'nav.reports', fallbackLabel: 'Issue Reports', icon: ShieldCheck, adminOnly: true },
  { href: '/priority', translationKey: 'nav.priority', fallbackLabel: 'Priority', icon: Zap, adminOnly: true },
  { href: '/admin', translationKey: 'nav.admin', fallbackLabel: 'Admin Panel', icon: Building2, adminOnly: true },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { activeRole, setActiveRole, currentUser, setCurrentUser, logout } = useAppStore();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('greencity_token') : null;
    if (token && !currentUser) {
      api.getMe()
        .then((userData) => {
          setCurrentUser(userData);
          setActiveRole(userData.role as Role);
        })
        .catch(() => {
          localStorage.removeItem('greencity_token');
        });
    }
  }, [currentUser, setCurrentUser, setActiveRole]);

  const isAdmin = currentUser?.role === 'ADMIN' || activeRole === 'ADMIN';
  const visibleLinks = navLinksConfig.filter(link => !link.adminOnly || isAdmin);

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm' 
          : 'bg-white/85 backdrop-blur-sm border-b border-slate-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0" onClick={() => setMobileOpen(false)}>
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-emerald-600 group-hover:bg-emerald-700 transition-colors" />
            <div className="relative flex items-center justify-center w-full h-full text-white">
              <TreePine className="w-5 h-5 font-bold" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-extrabold tracking-tight text-slate-900">{t('common.appName', 'GreenCity')}</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Solapur</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">{t('common.citySubtitle', 'City Parks & Environmental Intelligence')}</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1 flex-1 justify-center">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            const isPriority = link.href === '/priority';
            const label = t(link.translationKey, link.fallbackLabel);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 relative whitespace-nowrap ${
                  isActive
                    ? isPriority
                      ? 'bg-red-50 text-red-800 border border-red-200 shadow-2xs font-bold'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs font-bold'
                    : isPriority
                      ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${
                  isActive
                    ? isPriority ? 'text-red-600' : 'text-emerald-700'
                    : isPriority ? 'text-red-500' : 'text-slate-500'
                }`} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Language Selector, Auth & User State */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Language Selector */}
          <LanguageSelector variant="header" />

          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 py-1.5 px-2.5 rounded-2xl shadow-2xs">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                {currentUser.full_name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {currentUser.full_name?.split(' ')[0]}
                </p>
                <p className="text-[10px] font-semibold text-emerald-700">
                  {isAdmin ? 'Admin' : 'Citizen'}
                </p>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white transition-colors ml-0.5"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('nav.login', 'Login')}</span>
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
            
            {/* Language Selector Mobile */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Language / भाषा निवडा</p>
              <LanguageSelector variant="mobile" />
            </div>

            {/* User profile / Login in mobile */}
            <div className="pb-3 border-b border-slate-100">
              {currentUser ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                      {currentUser.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{currentUser.full_name}</p>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        {isAdmin ? 'City Administrator' : 'Resident Citizen'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm text-center flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('nav.login', 'Login / Sign Up')}</span>
                </Link>
              )}
            </div>

            {/* Navigation links for mobile */}
            <nav className="grid grid-cols-2 gap-2">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                const isPriority = link.href === '/priority';
                const label = t(link.translationKey, link.fallbackLabel);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? isPriority
                          ? 'bg-red-50 text-red-800 border border-red-200 font-bold'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
                        : isPriority
                          ? 'text-red-600 bg-red-50 border border-red-100 hover:border-red-200'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isPriority ? 'text-red-500' : isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
