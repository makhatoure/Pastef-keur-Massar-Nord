'use client';

import React from 'react';
import { OFFICIAL_CELL_NAME } from './Navbar';
import { HeartHandshake, Users, PackageCheck, AlertCircle, TrendingUp, MapPin } from 'lucide-react';

interface DashboardTabProps {
  stats: any;
  stock: any;
  onNavigateTab: (tab: string) => void;
}

export default function DashboardTab({ stats, stock, onNavigateTab }: DashboardTabProps) {
  const morning = stats?.morning || { beneficiariesServed: 0, mosquitoNetsDistributed: 0, byNeighborhood: {} };
  const evening = stats?.evening || { totalCensus: 0, servedCount: 0, pendingCount: 0, mosquitoNetsDistributed: 0, censusByNeighborhood: {}, servedByNeighborhood: {} };
  const global = stats?.global || { totalMorning: 0, totalEvening: 0, totalDistributed: 0, remainingStock: 0, initialStock: 0, entriesTotal: 0 };

  return (
    <div className="space-y-5 pb-16">
      {/* Bannière d'en-tête */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-700/60 text-emerald-100 border border-emerald-600/50 mb-1">
              Tableau de Bord Officiel
            </span>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">{OFFICIAL_CELL_NAME}</h2>
            <p className="text-xs sm:text-sm text-emerald-200 mt-0.5">
              Suivi en temps réel des deux opérations (Don de Sang & Podium) et du stock de moustiquaires.
            </p>
          </div>
          {stock.isClosed && (
            <div className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-rose-600/90 text-white text-xs font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Opérations Clôturées</span>
            </div>
          )}
        </div>
      </div>

      {/* Cartes Clés - Bilan Général & Stock */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-700" />
          Bilan Général & Situation du Stock
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-slate-500">Stock Restant Réel</span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5">
              {global.remainingStock}
            </div>
            <span className="text-[10px] text-slate-400">
              Sur {global.initialStock + global.entriesTotal} au départ
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-slate-500">Total Distribué Journée</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {global.totalDistributed}
            </div>
            <span className="text-[10px] text-slate-400">Matin + Soir cumulés</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-teal-700">Sorties Matin (Sang)</span>
            <div className="text-2xl font-black text-teal-800 mt-0.5">
              {global.totalMorning}
            </div>
            <span className="text-[10px] text-slate-400">{morning.beneficiariesServed} personnes × 2</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-blue-700">Sorties Soir (Podium)</span>
            <div className="text-2xl font-black text-blue-800 mt-0.5">
              {global.totalEvening}
            </div>
            <span className="text-[10px] text-slate-400">{evening.servedCount} personnes servies</span>
          </div>
        </div>
      </div>

      {/* Circuits Opérationnels Distincts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module Matin : Don de sang */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-teal-700 text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-5 h-5" />
              <div>
                <h4 className="font-bold text-sm">Opération Matin — Don de Sang</h4>
                <p className="text-[11px] text-teal-100">2 moustiquaires par donneur confirmé</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('morning')}
              className="text-xs bg-white text-teal-800 font-bold px-2.5 py-1 rounded-lg hover:bg-teal-50 transition shadow-xs"
            >
              Gérer
            </button>
          </div>

          <div className="p-4 space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-teal-50 border border-teal-100 p-2.5 rounded-xl">
                <span className="text-xs text-teal-900 font-medium">Donneurs Servis</span>
                <div className="text-xl font-bold text-teal-800 mt-0.5">
                  {morning.beneficiariesServed}
                </div>
              </div>
              <div className="bg-teal-50 border border-teal-100 p-2.5 rounded-xl">
                <span className="text-xs text-teal-900 font-medium">Moustiquaires Remises</span>
                <div className="text-xl font-bold text-teal-800 mt-0.5">
                  {morning.mosquitoNetsDistributed}
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                Répartition des Donneurs par Quartier
              </h5>
              {Object.keys(morning.byNeighborhood).length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucun don enregistré pour le moment.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {Object.entries(morning.byNeighborhood).map(([neighborhood, count]) => (
                    <div
                      key={neighborhood}
                      className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"
                    >
                      <span className="font-medium text-slate-700">{neighborhood}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{count as number} donneur(s)</span>
                        <span className="text-[10px] text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded font-semibold">
                          {(count as number) * 2} moust.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Module Soir : Distribution au podium */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-blue-700 text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <div>
                <h4 className="font-bold text-sm">Opération Soir — Podium</h4>
                <p className="text-[11px] text-blue-100">Bénéficiaires recensés par les chefs de quartier</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('evening')}
              className="text-xs bg-white text-blue-800 font-bold px-2.5 py-1 rounded-lg hover:bg-blue-50 transition shadow-xs"
            >
              Gérer
            </button>
          </div>

          <div className="p-4 space-y-4 flex-1">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
                <span className="text-[11px] text-slate-600 font-medium">Recensés</span>
                <div className="text-lg font-bold text-slate-800 mt-0.5">
                  {evening.totalCensus}
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-xl">
                <span className="text-[11px] text-emerald-800 font-medium">Servis</span>
                <div className="text-lg font-bold text-emerald-800 mt-0.5">
                  {evening.servedCount}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-2 rounded-xl">
                <span className="text-[11px] text-amber-800 font-medium">En attente</span>
                <div className="text-lg font-bold text-amber-800 mt-0.5">
                  {evening.pendingCount}
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Suivi Podium par Quartier (Recensés vs Servis)
              </h5>
              {Object.keys(evening.censusByNeighborhood).length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune liste saisie pour le moment.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {Object.entries(evening.censusByNeighborhood).map(([neighborhood, censusCount]) => {
                    const servedCount = evening.servedByNeighborhood[neighborhood] || 0;
                    return (
                      <div
                        key={neighborhood}
                        className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"
                      >
                        <span className="font-medium text-slate-700">{neighborhood}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-bold">{servedCount} servi(s)</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-600">{censusCount as number} recensé(s)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
