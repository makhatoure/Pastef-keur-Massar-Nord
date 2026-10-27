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

export const OFFICIAL_CELL_NAME = 'Cellule Pastef quartiers : Serigne Mansour Sy 1 / Darou Salam 2 Extension';

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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src="/pastef-logo.png"
            alt="Logo Pastef"
            className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-lg flex-shrink-0 bg-white p-0.5 border border-slate-100"
          />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
              Cellule Pastef
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-600 font-medium leading-tight truncate">
              Serigne Mansour Sy 1 · Darou Salam 2 Ext.
            </p>
          </div>
        </div>

        {/* Badges d'état et utilisateur */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Badge Stock restant UNIQUEMENT pour l'Admin */}
          {currentUser?.role === 'ADMIN' && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                remainingStock > 20
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : remainingStock > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 animate-pulse'
              }`}
            >
              <Package className="w-3 h-3" />
              <span>{remainingStock}</span>
            </div>
          )}

          {/* Badge Clôture si actif */}
          {isClosed && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
              <AlertTriangle className="w-3 h-3" /> Clôturé
            </span>
          )}

          {/* Utilisateur connecté compact */}
          {currentUser && (
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                {currentUser.role === 'ADMIN' ? (
                  <Shield className="w-3 h-3 text-emerald-700" />
                ) : (
                  <UserIcon className="w-3 h-3 text-blue-600" />
                )}
                <span>{currentUser.role === 'ADMIN' ? 'Admin' : 'Agent'}</span>
              </div>
              <button
                onClick={onLogout}
                title="Se déconnecter"
                className="ml-1 p-0.5 text-slate-400 hover:text-rose-600 rounded transition"
              >
                <LogOut className="w-3.5 h-3.5" />
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
                { id: 'morning', label: 'Don de Sang (Matin)', icon: '🩸' },
                { id: 'evening', label: 'Podium (Soir)', icon: '🎪' },
                { id: 'stock', label: 'Gestion du Stock', icon: '📦' },
                { id: 'reports', label: 'Rapports & Clôture', icon: '📑' },
                { id: 'dashboard', label: 'Bilan & Stock', icon: '📊' },
                { id: 'admin', label: 'Administration', icon: '🛡️' },
              ]
            : [
                { id: 'morning', label: 'Don de Sang (Matin)', icon: '🩸' },
                { id: 'evening', label: 'Distribution Podium (Soir)', icon: '🎪' },
                { id: 'dashboard', label: 'Bilan & Statistiques', icon: '📊' },
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
