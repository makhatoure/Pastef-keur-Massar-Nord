'use client';

import React, { useState, useEffect } from 'react';
import { User, StockEntry } from '@/lib/types';
import { Boxes, PlusCircle, History, AlertTriangle, ShieldCheck, TrendingDown, TrendingUp, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase-client';

interface StockTabProps {
  stock: any;
  defaultEveningQty: number;
  currentUser: User | null;
  onRefresh: () => void;
}

export default function StockTab({
  stock: propStock,
  defaultEveningQty: propDefaultEveningQty,
  currentUser,
  onRefresh,
}: StockTabProps) {
  // États dynamiques synchronisés directement avec Supabase
  const [stock, setStock] = useState<any>(propStock || {
    initial: 500,
    entriesTotal: 0,
    morningDistributed: 0,
    eveningDistributed: 0,
    totalDistributed: 0,
    remaining: 500,
    entries: [],
  });
  const [defaultEveningQty, setDefaultEveningQty] = useState(propDefaultEveningQty || 2);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fonction de calcul direct et temps réel
  const fetchLiveStock = async () => {
    try {
      const [resStock, resEntries, resMorn, resEve] = await Promise.all([
        supabaseClient.from('stock_state').select('*').limit(1),
        supabaseClient.from('stock_entries').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('morning_donations').select('*'),
        supabaseClient.from('evening_beneficiaries').select('*'),
      ]);

      const stateData = (resStock && resStock.data && resStock.data.length > 0) ? resStock.data[0] : null;
      const initial = stateData?.initial_stock ?? 500;
      const dQty = stateData?.default_evening_qty ?? 2;
      setDefaultEveningQty(dQty);

      const entriesList = resEntries.data || [];
      const entriesTotal = entriesList.reduce((s: number, e: any) => s + (Number(e.quantity) || 0), 0);
      const mornList = resMorn.data || [];
      const eveList = resEve.data || [];

      const morningDistributed = mornList.length * 2;
      const eveningServed = eveList.filter((b: any) => b.status === 'SERVI');
      const eveningDistributed = eveningServed.reduce((s: number, b: any) => s + (Number(b.quantity_given) || 2), 0);
      const totalDistributed = morningDistributed + eveningDistributed;
      const remaining = initial + entriesTotal - totalDistributed;

      setStock({
        initial,
        initialStock: initial,
        entriesTotal,
        morningDistributed,
        eveningDistributed,
        totalDistributed,
        remaining,
        isClosed: Boolean(stateData?.is_closed),
        entries: entriesList.map((e: any) => ({
          id: e.id,
          date: e.created_at,
          quantity: e.quantity,
          reason: e.reason,
          addedBy: e.added_by,
        })),
      });
    } catch (err) {
      console.error('Erreur chargement direct stock:', err);
    }
  };

  useEffect(() => {
    fetchLiveStock();
    // Actualisation silencieuse toutes les 4 secondes
    const interval = setInterval(fetchLiveStock, 4000);
    return () => clearInterval(interval);
  }, []);
  // Saisie d'une nouvelle entrée de stock
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [entryQty, setEntryQty] = useState('');
  const [entryReason, setEntryReason] = useState('');

  // Modification du stock initial (Admin)
  const [showEditInitialModal, setShowEditInitialModal] = useState(false);
  const [newInitialStock, setNewInitialStock] = useState(stock.initial || 500);
  const [initialReason, setInitialReason] = useState('');

  // Configuration de la quantité par défaut soir
  const [showConfigQtyModal, setShowConfigQtyModal] = useState(false);
  const [newDefaultQty, setNewDefaultQty] = useState(defaultEveningQty || 2);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Ajouter une livraison / entrée
  const handleAddStockEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(entryQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Veuillez spécifier une quantité valide supérieure à 0.');
      return;
    }

    if (!entryReason.trim()) {
      setErrorMsg('Le motif ou numéro de bon de livraison est obligatoire.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: qty,
          reason: entryReason.trim(),
          adminName: currentUser?.name || 'Administrateur',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setShowAddEntryModal(false);
        setEntryQty('');
        setEntryReason('');
        await fetchLiveStock();
        onRefresh();
      } else {
        setErrorMsg(data.message || 'Erreur lors de l\'enregistrement.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  // Modifier le stock initial
  const handleUpdateInitial = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialStock: parseInt(String(newInitialStock), 10),
          reason: initialReason.trim(),
          adminName: currentUser?.name || 'Administrateur',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setShowEditInitialModal(false);
        await fetchLiveStock();
        onRefresh();
      } else {
        setErrorMsg(data.message || 'Erreur modification');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // Modifier la quantité par défaut du soir
  const handleUpdateDefaultQty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultEveningQty: parseInt(String(newDefaultQty), 10),
          adminName: currentUser?.name || 'Administrateur',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Quantité par défaut mise à jour.');
        setShowConfigQtyModal(false);
        onRefresh();
      } else {
        setErrorMsg(data.message || 'Erreur');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* En-tête */}
      <div className="bg-emerald-800 text-white p-4 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 flex-shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-bold">Gestion Centrale du Stock</h2>
              <p className="text-xs text-emerald-100">
                Stock unique et commun aux deux circuits (Matin et Soir).
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={fetchLiveStock}
                className="px-2.5 py-1.5 bg-emerald-900/60 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs transition flex items-center gap-1 border border-emerald-600"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualiser</span>
              </button>
              <button
                onClick={() => setShowAddEntryModal(true)}
                className="px-3 py-1.5 bg-white text-emerald-900 rounded-xl font-bold text-xs hover:bg-emerald-50 transition flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-4 h-4 text-emerald-700" />
                <span>Ajouter livraison / entrée</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>
      )}

      {/* Formule de calcul du stock en temps réel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Équation & Bilan Comptable du Stock
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            Formule : Initial + Entrées − Sorties Matin − Sorties Soir
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium">Stock Initial</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{stock.initial}</div>
            {isAdmin && (
              <button
                onClick={() => {
                  setNewInitialStock(stock.initial);
                  setShowEditInitialModal(true);
                }}
                className="mt-1 text-[10px] text-emerald-700 font-bold hover:underline"
              >
                Modifier
              </button>
            )}
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
            <span className="text-[11px] text-emerald-700 font-medium">+ Entrées Validées</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">+{stock.entriesTotal}</div>
            <span className="text-[10px] text-slate-400">{stock.entries?.length || 0} livraison(s)</span>
          </div>

          <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-200">
            <span className="text-[11px] text-teal-700 font-medium">− Sorties Matin</span>
            <div className="text-xl font-bold text-teal-800 mt-1">−{stock.morningDistributed}</div>
            <span className="text-[10px] text-slate-400">Don de sang</span>
          </div>

          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
            <span className="text-[11px] text-blue-700 font-medium">− Sorties Soir</span>
            <div className="text-xl font-bold text-blue-800 mt-1">−{stock.eveningDistributed}</div>
            <span className="text-[10px] text-slate-400">Podium</span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-emerald-700 text-white p-3 rounded-xl shadow-xs">
            <span className="text-[11px] text-emerald-100 font-medium">= STOCK RESTANT</span>
            <div className="text-2xl font-black mt-0.5">{stock.remaining}</div>
            <span className="text-[10px] text-emerald-200">Moustiquaires</span>
          </div>
        </div>
      </div>

      {/* Paramètres & Directives */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
          Paramètres Opérationnels
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800">Ration Matin (Don de sang)</div>
              <div className="text-slate-500">Fixée selon le cahier des charges</div>
            </div>
            <span className="font-black text-sm text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
              2 fixes / donneur
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800">Ration Soir (Podium)</div>
              <div className="text-slate-500">Configurable selon la décision</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                {defaultEveningQty} par défaut
              </span>
              {isAdmin && (
                <button
                  onClick={() => {
                    setNewDefaultQty(defaultEveningQty);
                    setShowConfigQtyModal(true);
                  }}
                  className="text-[10px] bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold hover:bg-slate-300"
                >
                  Régler
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historique des entrées / livraisons de stock */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <History className="w-4 h-4 text-emerald-700" />
          Historique des Entrées et Réapprovisionnements
        </h3>

        {(!stock.entries || stock.entries.length === 0) ? (
          <p className="text-xs text-slate-400 italic py-2">
            Aucune nouvelle livraison enregistrée en cours de journée.
          </p>
        ) : (
          <div className="space-y-2">
            {stock.entries.map((entry: StockEntry) => (
              <div
                key={entry.id}
                className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="text-emerald-700">+{entry.quantity} moustiquaires</span>
                    <span className="text-slate-400">—</span>
                    <span>{entry.reason}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Enregistré par {entry.addedBy} le {new Date(entry.date).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale d'ajout d'entrée */}
      {showAddEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              Ajouter une livraison de moustiquaires
            </h4>

            <form onSubmit={handleAddStockEntry} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Quantité de moustiquaires reçues *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={entryQty}
                  onChange={e => setEntryQty(e.target.value)}
                  placeholder="ex: 200"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Motif / Numéro de bon de livraison / Donateur *
                </label>
                <input
                  type="text"
                  required
                  value={entryReason}
                  onChange={e => setEntryReason(e.target.value)}
                  placeholder="ex: Livraison Ministère de la Santé lot B"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEntryModal(false)}
                  className="py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800"
                >
                  {loading ? 'Validation...' : 'Ajouter au Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Modification Stock Initial */}
      {showEditInitialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Modifier le stock initial</h4>

            <form onSubmit={handleUpdateInitial} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nouveau stock initial</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newInitialStock}
                  onChange={e => setNewInitialStock(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-rose-700 mb-1">
                  Motif d'ajustement obligatoire *
                </label>
                <input
                  type="text"
                  required
                  value={initialReason}
                  onChange={e => setInitialReason(e.target.value)}
                  placeholder="Justification du recalcul initial..."
                  className="w-full px-3 py-2 border border-rose-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditInitialModal(false)}
                  className="py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 bg-emerald-700 text-white font-bold rounded-xl"
                >
                  {loading ? 'En cours...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Régler quantité par défaut podium */}
      {showConfigQtyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Ration par défaut au Podium</h4>

            <form onSubmit={handleUpdateDefaultQty} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nombre de moustiquaires attribuées par défaut
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newDefaultQty}
                  onChange={e => setNewDefaultQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-center text-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigQtyModal(false)}
                  className="py-2 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 bg-blue-700 text-white font-bold rounded-lg"
                >
                  Appliquer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
