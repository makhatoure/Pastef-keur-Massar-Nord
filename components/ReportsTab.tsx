'use client';

import React, { useState } from 'react';
import { User, MorningDonation, EveningBeneficiary, AuditLog } from '@/lib/types';
import { OFFICIAL_CELL_NAME } from './Navbar';
import { generateOfficialPDF } from '@/lib/pdfGenerator';
import { exportToExcel } from '@/lib/excelExport';
import { FileDown, FileSpreadsheet, Lock, Unlock, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';

import { supabaseClient } from '@/lib/supabase-client';

interface ReportsTabProps {
  stats: any;
  stock: any;
  morningDonations: MorningDonation[];
  eveningBeneficiaries: EveningBeneficiary[];
  auditLogs: AuditLog[];
  currentUser: User | null;
  onRefresh: () => void;
}

export default function ReportsTab({
  stats: propStats,
  stock: propStock,
  morningDonations: propMorningDonations,
  eveningBeneficiaries: propEveningBeneficiaries,
  auditLogs: propAuditLogs,
  currentUser,
  onRefresh,
}: ReportsTabProps) {
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Fonction pour extraire l'état réel et exact directement de Supabase
  const getFreshReportData = async () => {
    const [resStock, resEntries, resMorn, resEve, resLogs] = await Promise.all([
      supabaseClient.from('stock_state').select('*').limit(1),
      supabaseClient.from('stock_entries').select('*').order('created_at', { ascending: false }),
      supabaseClient.from('morning_donations').select('*').order('created_at', { ascending: false }),
      supabaseClient.from('evening_beneficiaries').select('*').order('created_at', { ascending: false }),
      supabaseClient.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    const stateData = (resStock.data && resStock.data.length > 0) ? resStock.data[0] : null;
    const initial = stateData?.initial_stock ?? 500;
    const entriesList = resEntries.data || [];
    const entriesTotal = entriesList.reduce((s: number, e: any) => s + (Number(e.quantity) || 0), 0);
    const mornList = resMorn.data || [];
    const eveList = resEve.data || [];

    const morningDistributed = mornList.length * 2;
    const eveningServed = eveList.filter((b: any) => b.status === 'SERVI');
    const eveningDistributed = eveningServed.reduce((s: number, b: any) => s + (Number(b.quantity_given) || 2), 0);
    const totalDistributed = morningDistributed + eveningDistributed;
    const remaining = initial + entriesTotal - totalDistributed;

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

    return {
      stock: {
        initial,
        entriesTotal,
        morningDistributed,
        eveningDistributed,
        totalDistributed,
        remaining,
        isClosed: Boolean(stateData?.is_closed),
        closedAt: stateData?.closed_at,
        closedBy: stateData?.closed_by,
      },
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
      morningDonations: mornList.map((d: any) => ({
        id: d.id,
        fullName: d.full_name,
        phone: d.phone,
        neighborhood: d.neighborhood,
        quantity: d.quantity || 2,
        date: d.created_at,
        agent: d.agent,
        confirmed: true,
      })),
      eveningBeneficiaries: eveList.map((b: any) => ({
        id: b.id,
        fullName: b.full_name,
        phone: b.phone,
        neighborhood: b.neighborhood,
        originChiefOrList: b.origin_chief_or_list,
        status: b.status,
        quantityGiven: b.quantity_given || 0,
        createdAt: b.created_at,
        createdBy: b.created_by,
        servedAt: b.served_at,
        servedBy: b.served_by,
      })),
      auditLogs: (resLogs.data || []).map((l: any) => ({
        id: l.id,
        date: l.created_at,
        user: l.user_name,
        action: l.action,
        details: l.details,
      })),
    };
  };

  const handleDownloadPDF = async () => {
    setLoading(true);
    try {
      const live = await getFreshReportData();
      generateOfficialPDF({
        cellName: 'Pastef keur Massar nord',
        date: new Date().toLocaleDateString('fr-FR'),
        isClosed: live.stock.isClosed,
        closedAt: live.stock.closedAt,
        stock: live.stock,
        morning: live.morning,
        evening: live.evening,
      });
    } catch (e: any) {
      console.error('Erreur génération PDF:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    setLoading(true);
    try {
      const live = await getFreshReportData();
      exportToExcel(
        live.stock,
        live.morningDonations,
        live.eveningBeneficiaries,
        live.auditLogs
      );
    } catch (e: any) {
      console.error('Erreur export Excel:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseOperations = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: currentUser?.name || 'Administrateur',
          reason: closeReason.trim() || 'Fin officielle des activités de distribution',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ text: 'Opérations clôturées avec succès. Les saisies ordinaires sont verrouillées.', type: 'success' });
        setShowCloseModal(false);
        onRefresh();
      } else {
        setMsg({ text: data.message || 'Erreur clôture', type: 'error' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Erreur', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReopenOperations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) {
      setMsg({ text: 'Un motif explicite est requis pour réouvrir les opérations.', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/close', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: currentUser?.name || 'Administrateur',
          reason: reopenReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ text: 'Opérations réouvertes avec enregistrement d\'audit.', type: 'success' });
        setShowReopenModal(false);
        onRefresh();
      } else {
        setMsg({ text: data.message || 'Erreur', type: 'error' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Erreur', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* En-tête */}
      <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-sm">
        <h2 className="text-base sm:text-lg font-bold">Rapports Officiels & Clôture</h2>
        <p className="text-xs text-slate-300">
          Génération de rapports certifiés pour la {OFFICIAL_CELL_NAME}.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Cartes d'export */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Rapport PDF */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
              <FileDown className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Rapport Récapitulatif PDF Officiel</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Document officiel complet comprenant le nom de la cellule, les statistiques distinctes du matin et du soir, la situation du stock et les signatures de validation.
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs"
          >
            <FileDown className="w-4 h-4" />
            <span>Télécharger le Rapport PDF</span>
          </button>
        </div>

        {/* Export Excel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Export Complet des Données Excel (.xlsx)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Fichier Excel détaillé comprenant 4 feuilles : Synthèse du stock, liste nominative du don de sang, liste du podium, et le journal d'audit complet.
            </p>
          </div>
          <button
            onClick={handleDownloadExcel}
            className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exporter le Classeur Excel</span>
          </button>
        </div>
      </div>

      {/* Section Clôture Définitive */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-600" />
          Statut des Opérations & Verrouillage
        </h3>

        <div className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Statut actuel :</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  stock.isClosed
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {stock.isClosed ? 'CLÔTURÉ' : 'OPÉRATIONS EN COURS'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stock.isClosed
                ? `Clôturé par ${stock.closedBy || 'Admin'} le ${new Date(stock.closedAt || '').toLocaleString('fr-FR')}. Les distributions ordinaires sont bloquées.`
                : 'Les agents peuvent actuellement enregistrer les donneurs du matin et distribuer au podium.'}
            </p>
          </div>

          {isAdmin && (
            <div className="self-end sm:self-center">
              {!stock.isClosed ? (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Lock className="w-4 h-4" />
                  <span>Clôturer la Journée</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowReopenModal(true)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Réouverture Exceptionnelle</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modale Clôture */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-rose-600" />
              Confirmer la Clôture Définitive
            </h4>
            <p className="text-xs text-slate-500">
              La clôture verrouille les saisies et fige les statistiques finales de la journée.
            </p>

            <form onSubmit={handleCloseOperations} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Motif de fin des opérations (optionnel)
                </label>
                <input
                  type="text"
                  value={closeReason}
                  onChange={e => setCloseReason(e.target.value)}
                  placeholder="ex: Fin des opérations du podium à 20h00"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="py-2 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700"
                >
                  {loading ? 'Clôture...' : 'Confirmer Clôture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Réouverture */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Unlock className="w-4 h-4 text-amber-600" />
              Réouverture Exceptionnelle des Opérations
            </h4>

            <form onSubmit={handleReopenOperations} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-rose-700 mb-1">
                  Justification impérative (Inscrite au journal d'audit) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  placeholder="Justification de la réouverture exceptionnelle..."
                  className="w-full p-2 border border-rose-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="py-2 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700"
                >
                  {loading ? 'Validation...' : 'Réouvrir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
