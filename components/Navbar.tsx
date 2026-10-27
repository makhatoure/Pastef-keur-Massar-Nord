'use client';

import React from 'react';
import { User } from '@/lib/types';
import { LogOut, Shield, User as UserIcon, Package, AlertTriangle } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  remainingStock: number;
  isClosed: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const OFFICIAL_CELL_NAME = 'Cellule Pastef quartiers: S.M.SY 1/ D.S.2.E';

export default function Navbar({
  currentUser,
  onLogout,
  remainingStock,
  isClosed,
  activeTab,
  setActiveTab,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Barre supérieure principale */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/pastef-logo.png"
            alt="Logo Pastef"
            className="h-10 w-10 object-contain rounded-lg flex-shrink-0 bg-white"
          />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
              {OFFICIAL_CELL_NAME}
            </h1>
            <p className="text-[10px] sm:text-xs text-emerald-700 font-medium">
              Plateforme Interne de Gestion — Don de Sang & Podium
            </p>
          </div>
        </div>

        {/* Badges d'état et utilisateur */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Badge Stock restant UNIQUEMENT pour l'Admin */}
          {currentUser?.role === 'ADMIN' && (
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                remainingStock > 20
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : remainingStock > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 animate-pulse'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Stock: {remainingStock}</span>
            </div>
          )}

          {/* Badge Clôture si actif */}
          {isClosed && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white">
              <AlertTriangle className="w-3 h-3" /> Clôturé
            </span>
          )}

          {/* Utilisateur connecté */}
          {currentUser && (
            <div className="flex items-center gap-1.5 bg-slate-100 pl-2 pr-1 py-1 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1 text-xs font-medium text-slate-700">
                {currentUser.role === 'ADMIN' ? (
                  <Shield className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span className="max-w-[70px] sm:max-w-[120px] truncate">{currentUser.name}</span>
                <span className="text-[10px] px-1 py-0.2 bg-slate-200 text-slate-700 rounded font-semibold">
                  {currentUser.role === 'ADMIN' ? 'Admin' : 'Agent'}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Se déconnecter"
                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation par onglets (Desktop et tablettes) */}
      <div className="hidden md:flex border-t border-slate-100 bg-slate-50 px-4">
        <nav className="flex space-x-2 py-1 max-w-7xl mx-auto w-full">
          {(currentUser?.role === 'ADMIN'
            ? [
                { id: 'dashboard', label: 'Bilan & Stock', icon: '📊' },
                { id: 'morning', label: 'Don de Sang (Matin)', icon: '🩸' },
                { id: 'evening', label: 'Podium (Soir)', icon: '🎪' },
                { id: 'stock', label: 'Gestion du Stock', icon: '📦' },
                { id: 'reports', label: 'Rapports & Clôture', icon: '📑' },
                { id: 'admin', label: 'Administration', icon: '🛡️' },
              ]
            : [
                { id: 'dashboard', label: 'Bilan & Statistiques', icon: '📊' },
                { id: 'morning', label: 'Don de Sang (Matin)', icon: '🩸' },
                { id: 'evening', label: 'Distribution Podium (Soir)', icon: '🎪' },
              ]
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === tab.id
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
