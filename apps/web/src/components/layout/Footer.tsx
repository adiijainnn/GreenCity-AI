'use client';

import React from 'react';
import Link from 'next/link';
import { 
  TreePine, 
  MapPin, 
  CheckCircle2, 
  Mail, 
  Phone,
  AlertCircle
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-100 text-slate-600 text-sm mt-auto">
      {/* Footer divider line */}
      <div className="w-full h-px bg-slate-200/80" />
      
      {/* 4-5 Crucial Important Points Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-200">
          
          {/* Point 1: About the Mission */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <TreePine className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-slate-900 text-base">GreenCity Solapur</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Making Solapur greener and cleaner by helping citizens find nearby parks, track tree health, and report maintenance needs.
            </p>
          </div>

          {/* Point 2: Quick Services for Citizens */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Crucial Services</h4>
            <ul className="text-xs space-y-1.5 text-slate-600">
              <li>
                <Link href="/map" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span> Live Map & GPS Navigation
                </Link>
              </li>
              <li>
                <Link href="/environment" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span> Live AQI & Festival Monitor
                </Link>
              </li>
              <li>
                <Link href="/explore" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span> Nearby Discovery & Compare
                </Link>
              </li>
              <li>
                <Link href="/assistant" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span> Multilingual Voice Assistant
                </Link>
              </li>
              <li>
                <Link href="/report" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span> Report Civic Issue
                </Link>
              </li>
            </ul>
          </div>

          {/* Point 3: City Coverage */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">City Coverage</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Covering 5 Solapur Municipal Corporation (SMC) zones: Central, North, South, East, and West Solapur.
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>All 5 City Zones Active</span>
            </div>
          </div>

          {/* Point 4: Municipal Help & Contact */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Municipal Support</h4>
            <div className="text-xs space-y-1.5 text-slate-600">
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>SMC Headquarters, Solapur, MH</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>greencity@solapur.gov.in</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Helpline: 0217-2740300</span>
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Line */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 GreenCity Solapur. Solapur Municipal Corporation Environmental Cell.</p>
          <div className="flex items-center gap-4">
            <Link href="/map" className="hover:text-emerald-700">Map & GPS</Link>
            <span>•</span>
            <Link href="/report" className="hover:text-emerald-700">Report an Issue</Link>
            <span>•</span>
            <Link href="/analytics" className="hover:text-emerald-700">City Analytics</Link>
          </div>
        </div>

      </div>

    </footer>
  );
};
