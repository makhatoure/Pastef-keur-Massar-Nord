'use client';

import React, { useState } from 'react';
import { User, AuditLog } from '@/lib/types';
import { Shield, Users, History, KeyRound, Search, Clock, FileText, AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface AdminTabProps {
  users: Omit<User, 'pin'>[];
  auditLogs: AuditLog[];
  currentUser: User | null;
  onRefresh: () => void;
}

export default function AdminTab({
  users,
  auditLogs,
  currentUser,
  onRefresh,
}: AdminTabProps) {
  const [searchAudit, setSearchAudit] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleTotalReset = async () => {
    const confirmation = window.confirm(
      "ATTENTION ZONE DANGER :\n\nÊtes-vous absolument sûr de vouloir réinitialiser TOUS les compteurs, vider les données de test et remettre le stock à 800 ?"
    );
    if (!confirmation) return;

    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: currentUser?.name || 'Administrateur',
          initialStock: 800,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResetMsg(data.message);
        onRefresh();
      } else {
        alert("Erreur lors de la réinitialisation : " + data.message);
      }
    } catch (err: any) {
      alert("Erreur réseau : " + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchAudit.toLowerCase()) ||
      log.action.toLowerCase().includes(searchAudit.toLowerCase()) ||
      log.details.toLowerCase().includes(searchAudit.toLowerCase());
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(auditLogs.map(l => l.action)));

  return (
    <div className="space-y-4 pb-16">
      {/* En-tête */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          <div>
            <h2 className="text-base sm:text-lg font-bold">Panneau d'Administration & Traçabilité</h2>
            <p className="text-xs text-slate-400">
              Gestion des permissions et journal d'audit certifié non modifiable.
            </p>
          </div>
        </div>
      </div>

      {/* Rôles et Utilisateurs autorisés */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-4 h-4 text-emerald-700" />
          Comptes & Permissions configurés
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {users.map(u => (
            <div
              key={u.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{u.name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    u.role === 'ADMIN'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {u.role}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Identifiant: <strong>{u.username}</strong></span>
                <span className="text-slate-400">
                  {u.role === 'ADMIN' ? 'Accès total' : 'Saisie & Service'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zone Danger : Remise à Zéro des Données de Test */}
      <div className="bg-rose-50/70 rounded-2xl border-2 border-rose-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Zone Critique : Remise à Zéro Officielle
            </h3>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Efface tous les dons de test, vide la liste du soir et rétablit le stock officiel à <strong>800 moustiquaires</strong>.
            </p>
          </div>

          <button
            onClick={handleTotalReset}
            disabled={resetLoading}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 flex-shrink-0"
          >
            {resetLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Nettoyage en cours...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Remettre à Zéro (Stock 800)</span>
              </>
            )}
          </button>
        </div>

        {resetMsg && (
          <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold">
            ✓ {resetMsg}
          </div>
        )}
      </div>

      {/* Journal d'audit complet */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-emerald-700" />
            Journal d'Audit & Historique des Opérations ({filteredLogs.length})
          </h3>

          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none"
          >
            <option value="ALL">Toutes les actions</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <input
            type="text"
            value={searchAudit}
            onChange={e => setSearchAudit(e.target.value)}
            placeholder="Filtrer par utilisateur, action ou détail..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Liste des logs */}
        {filteredLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            Aucun événement d'audit ne correspond à la recherche.
          </p>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredLogs.map(log => (
              <div
                key={log.id}
                className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-slate-100 transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-800 text-[11px] bg-emerald-100 px-1.5 py-0.2 rounded font-mono">
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-800">{log.user}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{log.details}</p>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 self-end sm:self-center font-mono">
                  <Clock className="w-3 h-3" />
                  {new Date(log.timestamp).toLocaleString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
