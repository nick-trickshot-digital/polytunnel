'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LOCATION_NAME } from '@/lib/config';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/tasks', label: 'Tasks', icon: '📋' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/history', label: 'Records', icon: '📊' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile bottom nav — large tap targets */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-earth-200 md:hidden safe-area-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-stretch justify-around px-1 py-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-3 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-tunnel-600 text-white shadow-sm scale-105'
                    : 'text-earth-600 active:bg-earth-100'
                }`}
              >
                <span className="text-2xl leading-none">{item.icon}</span>
                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-earth-600'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-72 bg-tunnel-900 flex-col z-50">
        {/* Logo area */}
        <div className="p-8 pb-6">
          <div className="flex items-center gap-3">
            <Image
              src="/images/ant-head.png"
              alt="Ant"
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover object-top border-2 border-tunnel-600 bg-tunnel-800 flex-shrink-0"
            />
            <div>
              <h1 className="font-[var(--font-display)] text-2xl font-800 text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Ant&apos;s Tunnel
              </h1>
              <p className="text-sm text-tunnel-300 font-medium">{LOCATION_NAME}</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-lg transition-all ${
                  isActive
                    ? 'bg-tunnel-600 text-white font-bold shadow-sm'
                    : 'text-tunnel-200 font-medium hover:bg-tunnel-800 hover:text-white'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-tunnel-800">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              <Image
                src="/images/ant-head.png"
                alt="Ant"
                width={44}
                height={44}
                className="w-11 h-11 rounded-full border-2 border-tunnel-700 object-cover object-top bg-tunnel-800"
              />
              <Image
                src="/images/vickie-head.png"
                alt="Vickie"
                width={44}
                height={44}
                className="w-11 h-11 rounded-full border-2 border-tunnel-700 object-cover object-top bg-tunnel-800"
              />
            </div>
            <div>
              <p className="text-sm text-tunnel-200 font-semibold">Ant & Vickie</p>
              <p className="text-xs text-tunnel-500 font-medium">{LOCATION_NAME}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
