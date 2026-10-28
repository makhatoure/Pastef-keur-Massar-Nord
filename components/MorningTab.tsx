'use client';

import React, { useState } from 'react';
import { MorningDonation, User } from '@/lib/types';
import { HeartHandshake, UserPlus, Search, CheckCircle2, AlertTriangle, Clock, MapPin, Phone, User as UserIcon, Edit3, ShieldAlert } from 'lucide-react';

interface MorningTabProps {
  donations: MorningDonation[];
  currentUser: User | null;
  remainingStock: number;
  isClosed: boolean;
  onRefresh: () => void;
}

const PRESET_NEIGHBORHOODS = [
  'Serigne Mansour Sy 1',
  'Darou Salam 2 Extension',
  'Serigne Mansour Sy 2',
  'Autre quartier',
];

export const NEIGHBORHOOD_CHIEFS: Record<string, string> = {
  'Serigne Mansour Sy 1': 'Maodo Ka',
  'Darou Salam 2 Extension': '',
  'Serigne Mansour Sy 2': '',
};

export default function MorningTab({
  donations,
  currentUser,
  remainingStock,
  isClosed,
  onRefresh,
}: MorningTabProps) {
  // Liste locale synchronisée pour affichage immédiat
  const [localDonations, setLocalDonations] = useState<MorningDonation[]>(donations);

  React.useEffect(() => {
    setLocalDonations(donations);
  }, [donations]);

  // Formulaire de saisie
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [neighborhood, setNeighborhood] = useState('Serigne Mansour Sy 1');
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [chiefName, setChiefName] = useState(NEIGHBORHOOD_CHIEFS['Serigne Mansour Sy 1'] || '');
  
  // États de l'interface
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNeighborhood, setFilterNeighborhood] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modale de confirmation de remise
  const [confirmModalData, setConfirmModalData] = useState<{
    fullName: string;
    phone: string;
    neighborhood: string;
    chiefName?: string;
    forceDuplicate?: boolean;
  } | null>(null);

  // Modale d'édition administrative
  const [editingItem, setEditingItem] = useState<MorningDonation | null>(null);
  const [editReason, setEditReason] = useState('');

  const targetNeighborhood = neighborhood === 'Autre quartier' ? (customNeighborhood.trim() || 'Autre quartier') : neighborhood;

  const handleSelectNeighborhood = (q: string) => {
    setNeighborhood(q);
    if (NEIGHBORHOOD_CHIEFS[q] !== undefined) {
      setChiefName(NEIGHBORHOOD_CHIEFS[q]);
    }
  };

  // Pré-validation du formulaire : AUCUN CHAMP N'EST BLOQUANT
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Ouvrir la modale de confirmation avec des valeurs par défaut si vide
    setConfirmModalData({
      fullName: fullName.trim() || 'Donneur anonyme',
      phone: phone.trim() || 'Non renseigné',
      neighborhood: targetNeighborhood,
      chiefName: chiefName.trim(),
    });
  };

  // Validation effective côté serveur
  const executeDonation = async (forceDuplicate = false) => {
    if (!confirmModalData) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/morning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: confirmModalData.fullName,
          phone: confirmModalData.phone,
          neighborhood: confirmModalData.neighborhood,
          agentName: currentUser?.name || 'Agent',
          forceDuplicate,
        }),
      });

      const data = await res.json();

      if (data.isDuplicateWarning && !forceDuplicate) {
        // Alerte doublon : demander confirmation forcée si autorisé
        setErrorMsg(data.message);
        setConfirmModalData(prev => (prev ? { ...prev, forceDuplicate: true } : null));
        setLoading(false);
        return;
      }

      if (!data.success) {
        setErrorMsg(data.message || 'Erreur lors de l\'enregistrement.');
        setConfirmModalData(null);
      } else {
        // Injection immédiate dans l'état local pour affichage instantané
        if (data.donation) {
          const newEntry: MorningDonation = {
            id: data.donation.id || String(Date.now()),
            fullName: data.donation.full_name,
            phone: data.donation.phone,
            neighborhood: data.donation.neighborhood,
            quantity: data.donation.quantity || 2,
            date: data.donation.created_at || new Date().toISOString(),
            agent: data.donation.agent || currentUser?.name || 'Agent',
            confirmed: true,
          };
          setLocalDonations(prev => [newEntry, ...prev.filter(d => d.id !== newEntry.id)]);
        }

        setSuccessMsg(data.message);
        setFullName('');
        setPhone('');
        setCustomNeighborhood('');
        setConfirmModalData(null);
        onRefresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  // Modification réservée à l'administrateur
  const handleAdminUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editReason.trim()) {
      setErrorMsg('Le motif de modification est obligatoire.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/morning', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          fullName: editingItem.fullName,
          phone: editingItem.phone,
          neighborhood: editingItem.neighborhood,
          reason: editReason.trim(),
          adminName: currentUser?.name || 'Administrateur',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Fiche modifiée avec succès dans le journal d\'audit.');
        setEditingItem(null);
        setEditReason('');
        onRefresh();
      } else {
        setErrorMsg(data.message || 'Erreur modification');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  // Filtrage et recherche rapide
  const filteredDonations = localDonations.filter(item => {
    const nameMatch = (item.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = (item.phone || '').includes(searchTerm);
    const matchesSearch = !searchTerm || nameMatch || phoneMatch;

    const matchesNeighborhood =
      filterNeighborhood === 'ALL' ||
      (item.neighborhood || '').includes(filterNeighborhood) ||
      (filterNeighborhood.includes('Mansour Sy 1') && (item.neighborhood || '').includes('S.M.SY 1'));

    return matchesSearch && matchesNeighborhood;
  });

  return (
    <div className="space-y-4 pb-16">
      {/* Messages d'alerte / succès */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>
      )}

      {/* Formulaire de saisie rapide adapté téléphone */}
      <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-teal-700 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <HeartHandshake className="w-5 h-5 text-teal-700 flex-shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">Don de Sang — Matin</h2>
            <p className="text-[11px] text-slate-400">2 moustiquaires remises par donneur</p>
          </div>
        </div>

        <form onSubmit={handlePreSubmit} className="space-y-2.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nom et Prénom <span className="text-slate-400 font-normal">· optionnel</span>
            </label>
            <input
              type="text"
              disabled={isClosed}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="ex: Amadou Diallo"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Téléphone <span className="text-slate-400 font-normal">· optionnel</span>
            </label>
            <input
              type="tel"
              disabled={isClosed}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="ex: 77 123 45 67"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Quartier</label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {PRESET_NEIGHBORHOODS.map(q => (
                <button
                  type="button"
                  key={q}
                  disabled={isClosed}
                  onClick={() => handleSelectNeighborhood(q)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition ${
                    neighborhood === q
                      ? 'border-teal-700 bg-teal-50 text-teal-900 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            {neighborhood === 'Autre quartier' && (
              <input
                type="text"
                disabled={isClosed}
                value={customNeighborhood}
                onChange={e => setCustomNeighborhood(e.target.value)}
                placeholder="Préciser le quartier..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none mb-2"
              />
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Chef de Quartier <span className="text-slate-400 font-normal">· optionnel</span>
              </label>
              <input
                type="text"
                disabled={isClosed}
                value={chiefName}
                onChange={e => setChiefName(e.target.value)}
                placeholder="ex: Maodo Ka"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:outline-none bg-slate-50"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>✓ Enregistrer le Don</span>
          </button>
        </form>
      </div>

      {/* Liste des donneurs enregistrés et recherche */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Donneurs Enregistrés ({filteredDonations.length} / {localDonations.length})
            </h3>
            <span className="text-[11px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
              {localDonations.length * 2} moustiquaires remises
            </span>
          </div>

          {/* Filtre par quartier */}
          <select
            value={filterNeighborhood}
            onChange={e => setFilterNeighborhood(e.target.value)}
            className="text-xs px-2 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:outline-none"
          >
            <option value="ALL">Tous les quartiers</option>
            {PRESET_NEIGHBORHOODS.filter(n => n !== 'Autre quartier').map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Barre de recherche rapide */}
        <div className="relative mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom ou numéro de téléphone..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Tableau / Liste mobile */}
        {filteredDonations.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Aucun donneur correspondant trouvé.
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredDonations.map(item => (
              <div
                key={item.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-100/70 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{item.fullName}</span>
                    <span className="text-[10px] bg-teal-600 text-white font-bold px-1.5 py-0.2 rounded">
                      2 Moustiquaires
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {item.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-teal-600" />
                      {item.neighborhood}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(item.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-slate-500">Par: {item.agent}</span>
                  </div>
                </div>

                {/* Bouton de correction admin */}
                {currentUser?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setEditReason('');
                    }}
                    className="self-end sm:self-center px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-teal-700 hover:border-teal-400 text-[11px] font-medium flex items-center gap-1 shadow-2xs"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Corriger</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale de Confirmation OBLIGATOIRE avant déduction du stock */}
      {confirmModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Confirmer la remise</h4>
              <p className="text-xs text-slate-500 mt-1">
                Le don de sang est-il validé et les 2 moustiquaires ont-elles été remises en main propre ?
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Bénéficiaire :</span>
                <span className="font-bold text-slate-800">{confirmModalData.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Téléphone :</span>
                <span className="font-mono font-bold text-slate-800">{confirmModalData.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quartier :</span>
                <span className="font-bold text-teal-700">{confirmModalData.neighborhood}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500">Quantité :</span>
                <span className="font-black text-emerald-700">2 moustiquaires</span>
              </div>
            </div>

            {confirmModalData.forceDuplicate && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-[11px] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>Attention : cette personne semble déjà enregistrée. Forcer tout de même ?</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                className="py-2.5 px-3 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => executeDonation(Boolean(confirmModalData.forceDuplicate))}
                className="py-2.5 px-3 bg-teal-700 text-white text-xs font-bold rounded-xl hover:bg-teal-800 transition shadow-sm"
              >
                {loading ? 'Confirmation...' : 'Oui, Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'Édition Admin avec Motif obligatoire */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-3.5">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-teal-700" />
              Correction de la fiche (Admin)
            </h4>

            <form onSubmit={handleAdminUpdate} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-0.5">Nom et Prénom</label>
                <input
                  type="text"
                  required
                  value={editingItem.fullName}
                  onChange={e => setEditingItem({ ...editingItem, fullName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-0.5">Téléphone</label>
                <input
                  type="text"
                  required
                  value={editingItem.phone}
                  onChange={e => setEditingItem({ ...editingItem, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-0.5">Quartier</label>
                <input
                  type="text"
                  required
                  value={editingItem.neighborhood}
                  onChange={e => setEditingItem({ ...editingItem, neighborhood: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-0.5 text-rose-700">
                  Motif de correction obligatoire (Journal d'audit) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  placeholder="ex: Rectification de l'orthographe du nom..."
                  className="w-full px-2.5 py-1.5 border border-rose-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="py-2 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 bg-teal-700 text-white font-bold rounded-lg"
                >
                  {loading ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
