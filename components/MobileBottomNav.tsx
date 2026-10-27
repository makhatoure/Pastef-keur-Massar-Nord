'use client';

import React from 'react';
import { User } from '@/lib/types';
import { BarChart3, HeartHandshake, Users, Boxes, FileSpreadsheet, Settings } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
}

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  currentUser,
}: MobileBottomNavProps) {
  const tabs = currentUser?.role === 'ADMIN'
    ? [
        { id: 'dashboard', label: 'Bilan', icon: BarChart3 },
        { id: 'morning', label: 'Matin (Sang)', icon: HeartHandshake },
        { id: 'evening', label: 'Soir (Podium)', icon: Users },
        { id: 'stock', label: 'Stock', icon: Boxes },
        { id: 'reports', label: 'Rapports', icon: FileSpreadsheet },
      ]
    : [
        { id: 'dashboard', label: 'Bilan', icon: BarChart3 },
        { id: 'morning', label: 'Matin (Sang)', icon: HeartHandshake },
        { id: 'evening', label: 'Soir (Podium)', icon: Users },
      ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-1 py-1 safe-bottom">
      <nav className="flex justify-around items-center">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg text-[10px] font-medium transition flex-1 ${
                isActive
                  ? 'text-emerald-700 font-bold bg-emerald-50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
              <span className="truncate w-full text-center">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
