import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { I18nProvider } from '@/lib/i18n';
import Link from 'next/link';
import { Mic, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'GreenCity AI — Urban Green Space Intelligence & Ecosystem Analysis Platform',
  description: 'AI-powered GIS-based urban environmental intelligence platform for citizens, municipal authorities, and urban planners.',
  keywords: 'Urban Green Space, GIS, Ecosystem Services, Carbon Sequestration, Smart Cities, PostGIS, GovTech, Urban Forestry',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
      </head>
      <body className="bg-slate-50 text-slate-900 flex flex-col min-h-screen antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <I18nProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          
          {/* Global Floating AI Voice Assistant Quick Action */}
          <Link
            href="/assistant"
            className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold py-3 px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
            title="Open GreenCity AI Multilingual Voice Assistant"
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
              <Mic className="w-5 h-5 relative z-10" />
            </div>
            <span className="text-sm tracking-wide hidden sm:inline">AI Voice Assistant</span>
            <Sparkles className="w-4 h-4 text-emerald-200" />
          </Link>

          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}

