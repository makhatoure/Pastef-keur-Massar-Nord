'use client';

import React, { useState, useEffect } from 'react';
import { OFFICIAL_CELL_NAME } from './Navbar';
import { HeartHandshake, Users, PackageCheck, AlertCircle, TrendingUp, MapPin, RefreshCw } from 'lucide-react';
import { User } from '@/lib/types';
import { supabaseClient } from '@/lib/supabase-client';

interface DashboardTabProps {
  stats: any;
  stock: any;
  currentUser?: User | null;
  onNavigateTab: (tab: string) => void;
}

export default function DashboardTab({ stats: propStats, stock: propStock, currentUser, onNavigateTab }: DashboardTabProps) {
  const isAdmin = currentUser?.role === 'ADMIN';

  // États dynamiques calculés en temps réel directement depuis Supabase
  const [stats, setStats] = useState<any>(propStats || null);
  const [stock, setStock] = useState<any>(propStock || { remaining: 500, initial: 500, totalDistributed: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fonction de calcul dynamique autonome
  const loadFreshStats = async () => {
    setIsRefreshing(true);
    try {
      const [resStock, resEntries, resMorn, resEve] = await Promise.all([
        supabaseClient.from('stock_state').select('*').eq('id', 1).single(),
        supabaseClient.from('stock_entries').select('*'),
        supabaseClient.from('morning_donations').select('*'),
        supabaseClient.from('evening_beneficiaries').select('*'),
      ]);

      const initial = resStock.data?.initial_stock ?? 500;
      const entriesTotal = (resEntries.data || []).reduce((s: number, e: any) => s + (Number(e.quantity) || 0), 0);
      const mornList = resMorn.data || [];
      const eveList = resEve.data || [];

      const morningDistributed = mornList.length * 2;
      const eveningServed = eveList.filter((b: any) => b.status === 'SERVI');
      const eveningDistributed = eveningServed.reduce((s: number, b: any) => s + (Number(b.quantity_given) || 2), 0);
      const totalDistributed = morningDistributed + eveningDistributed;
      const remainingStock = initial + entriesTotal - totalDistributed;

      // Répartition par quartier Matin
      const morningByNeighborhood: Record<string, number> = {};
      mornList.forEach((d: any) => {
        const q = d.neighborhood?.trim() || 'Non spécifié';
        morningByNeighborhood[q] = (morningByNeighborhood[q] || 0) + 1;
      });

      // Répartition par quartier Soir
      const eveningCensusByNeighborhood: Record<string, number> = {};
      const eveningServedByNeighborhood: Record<string, number> = {};
      eveList.forEach((b: any) => {
        const q = b.neighborhood?.trim() || 'Non spécifié';
        eveningCensusByNeighborhood[q] = (eveningCensusByNeighborhood[q] || 0) + 1;
        if (b.status === 'SERVI') {
          eveningServedByNeighborhood[q] = (eveningServedByNeighborhood[q] || 0) + 1;
        }
      });

      setStock({
        initial,
        initialStock: initial,
        entriesTotal,
        morningDistributed,
        eveningDistributed,
        totalDistributed,
        remaining: remainingStock,
        isClosed: Boolean(resStock.data?.is_closed),
      });

      setStats({
        morning: {
          beneficiariesServed: mornList.length,
          mosquitoNetsDistributed: morningDistributed,
          byNeighborhood: morningByNeighborhood,
        },
        evening: {
          totalCensus: eveList.length,
          servedCount: eveningServed.length,
          pendingCount: eveList.length - eveningServed.length,
          mosquitoNetsDistributed: eveningDistributed,
          censusByNeighborhood: eveningCensusByNeighborhood,
          servedByNeighborhood: eveningServedByNeighborhood,
        },
        global: {
          totalMorning: morningDistributed,
          totalEvening: eveningDistributed,
          totalDistributed,
          remainingStock,
          initialStock: initial,
          entriesTotal,
        },
      });
    } catch (err) {
      console.error('Erreur rafraîchissement stats directes:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFreshStats();
  }, []);

  useEffect(() => {
    if (propStats) setStats(propStats);
  }, [propStats]);

  useEffect(() => {
    if (propStock) setStock(propStock);
  }, [propStock]);

  const morning = stats?.morning || { beneficiariesServed: 0, mosquitoNetsDistributed: 0, byNeighborhood: {} };
  const evening = stats?.evening || { totalCensus: 0, servedCount: 0, pendingCount: 0, mosquitoNetsDistributed: 0, censusByNeighborhood: {}, servedByNeighborhood: {} };
  const global = stats?.global || { totalMorning: 0, totalEvening: 0, totalDistributed: 0, remainingStock: stock.remaining || 0, initialStock: 500, entriesTotal: 0 };

  return (
    <div className="space-y-5 pb-16">
      {stock.isClosed && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>Opérations de distribution clôturées.</span>
        </div>
      )}

      {/* Cartes Clés - Bilan Général & Stock */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            Bilan Général des Distributions
          </h3>
          <button
            onClick={loadFreshStats}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
        <div className={`grid gap-2.5 sm:gap-3.5 ${isAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {isAdmin && (
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500">Stock Restant Réel</span>
              <div className="text-2xl font-black text-emerald-700 mt-0.5">
                {global.remainingStock}
              </div>
              <span className="text-[10px] text-slate-400">
                Sur {global.initialStock + global.entriesTotal} au départ
              </span>
            </div>
          )}

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

      {/* Circuits Opérationnels Distincts (Visible UNIQUEMENT côté ADMIN) */}
      {isAdmin && (
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
      )}
    </div>
  );
}
