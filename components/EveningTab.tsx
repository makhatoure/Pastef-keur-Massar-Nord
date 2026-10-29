'use client';

import React, { useState } from 'react';
import { EveningBeneficiary, User } from '@/lib/types';
import { Users, UserPlus, Search, CheckCircle, Clock, AlertCircle, Phone, MapPin, UserCheck, ShieldAlert, Edit, PlusCircle, Filter, X, Zap } from 'lucide-react';

import { supabaseClient } from '@/lib/supabase-client';
import { PRESET_NEIGHBORHOODS, NEIGHBORHOOD_CHIEFS, DEFAULT_EVENING_QTY } from '@/lib/constants';

export const EVENING_CHIEFS = NEIGHBORHOOD_CHIEFS;

interface EveningTabProps {
  beneficiaries: EveningBeneficiary[];
  currentUser: User | null;
  remainingStock: number;
  isClosed: boolean;
  defaultQty: number;
  onRefresh: () => void;
}

export default function EveningTab({
  beneficiaries: propBeneficiaries,
  currentUser,
  remainingStock,
  isClosed,
  defaultQty = 2,
  onRefresh,
}: EveningTabProps) {
  // Liste locale synchronisée directement avec Supabase
  const [localBeneficiaries, setLocalBeneficiaries] = React.useState<EveningBeneficiary[]>(propBeneficiaries || []);

  const fetchLiveBeneficiaries = React.useCallback(async () => {
    try {
      const { data, error } = await supabaseClient
        .from('evening_beneficiaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: EveningBeneficiary[] = data.map((b: any) => ({
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
          isExceptionalAdd: Boolean(b.is_exceptional_add),
        }));
        setLocalBeneficiaries(mapped);
      }
    } catch (e) {
      console.error('Erreur chargement podium live:', e);
    }
  }, []);

  // Chargement immédiat au montage et synchronisation avec les props
  React.useEffect(() => {
    fetchLiveBeneficiaries();
  }, [fetchLiveBeneficiaries]);

  React.useEffect(() => {
    if (propBeneficiaries && propBeneficiaries.length > 0) {
      setLocalBeneficiaries(propBeneficiaries);
    }
  }, [propBeneficiaries]);

  // Auto-refresh silencieux toutes les 4s au podium
  React.useEffect(() => {
    const timer = setInterval(fetchLiveBeneficiaries, 4000);
    return () => clearInterval(timer);
  }, [fetchLiveBeneficiaries]);

  const beneficiaries = localBeneficiaries;

  // États de recherche et filtrage
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EN_ATTENTE' | 'SERVI'>('ALL');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('ALL');

  // Saisie / Préparation des listes
  const [showAddModal, setShowAddModal] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singlePhone, setSinglePhone] = useState('');
  const [singleNeighborhood, setSingleNeighborhood] = useState('Serigne Mansour Sy 1');
  const [singleChief, setSingleChief] = useState('Maodo Ka');

  // Modale de service au podium
  const [servingBeneficiary, setServingBeneficiary] = useState<EveningBeneficiary | null>(null);
  const [quantityToGive, setQuantityToGive] = useState(defaultQty || 2);

  // Modale d'ajout exceptionnel sur place (Non inscrit)
  const [showExceptionalAddModal, setShowExceptionalAddModal] = useState(false);
  const [exceptionalReason, setExceptionalReason] = useState('');

  // Modale d'édition administrative
  const [editingBeneficiary, setEditingBeneficiary] = useState<EveningBeneficiary | null>(null);
  const [editReason, setEditReason] = useState('');

  // États de requête
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtrage des bénéficiaires
  const filteredBeneficiaries = beneficiaries.filter(b => {
    const matchesSearch =
      b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.phone.includes(searchTerm) ||
      b.originChiefOrList.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesNeighborhood = neighborhoodFilter === 'ALL' || b.neighborhood === neighborhoodFilter;
    return matchesSearch && matchesStatus && matchesNeighborhood;
  });

  const totalCensus = beneficiaries.length;
  const totalServed = beneficiaries.filter(b => b.status === 'SERVI').length;
  const totalPending = beneficiaries.filter(b => b.status === 'EN_ATTENTE').length;

  // Validation de la distribution au podium
  const handleConfirmDistribution = async () => {
    if (!servingBeneficiary) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const qty = parseInt(String(quantityToGive), 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Veuillez entrer une quantité valide supérieure à 0.');
      return;
    }

    if (qty > remainingStock) {
      setErrorMsg(`Stock insuffisant ! Disponible: ${remainingStock}, demandé: ${qty}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/evening', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: servingBeneficiary.id,
          quantity: qty,
          agentName: currentUser?.name || 'Agent Podium',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.message || 'Erreur lors de la distribution.');
      } else {
        setSuccessMsg(data.message);
        setServingBeneficiary(null);
        fetchLiveBeneficiaries();
        onRefresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  // Distribution rapide en 1 clic (2 moustiquaires par défaut)
  const handleQuickServe = async (beneficiary: EveningBeneficiary) => {
    if (isClosed) return;
    const qty = defaultQty || 2;
    if (qty > remainingStock) {
      setErrorMsg(`Stock insuffisant ! Disponible: ${remainingStock}, demandé: ${qty}`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/evening', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: beneficiary.id,
          quantity: qty,
          agentName: currentUser?.name || 'Agent Podium',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.message || 'Erreur lors de la distribution.');
      } else {
        setSuccessMsg(`✓ ${beneficiary.fullName} servi (${qty} moustiquaires)`);
        fetchLiveBeneficiaries();
        onRefresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  // Ajout par l'administrateur (individuel ou en lot)
  const handleAddBeneficiaries = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      let payload: any = { adminName: currentUser?.name || 'Administrateur' };

      if (isBulkMode) {
        // Lignes formatées : Nom, Téléphone, Quartier, Chef
        const lines = bulkText.split('\n').filter(l => l.trim().length > 0);
        const beneficiariesList = lines.map(line => {
          const parts = line.split(',').map(p => p.trim());
          return {
            fullName: parts[0] || 'Bénéficiaire sans nom',
            phone: parts[1] || 'Non renseigné',
            neighborhood: parts[2] || 'Serigne Mansour Sy 1',
            originChiefOrList: parts[3] || 'Liste Chef de quartier',
          };
        });
        payload.beneficiaries = beneficiariesList;
      } else {
        payload.single = {
          fullName: singleName.trim() || 'Bénéficiaire sans nom',
          phone: singlePhone.trim() || 'Non renseigné',
          neighborhood: singleNeighborhood.trim() || 'Serigne Mansour Sy 1',
          originChiefOrList: singleChief.trim() || 'Liste Chef de quartier',
        };
      }

      const res = await fetch('/api/evening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setShowAddModal(false);
        setBulkText('');
        setSingleName('');
        setSinglePhone('');
        fetchLiveBeneficiaries();
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

  // Ajout exceptionnel sur place par l'Admin
  const handleExceptionalAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim() || !singlePhone.trim()) {
      setErrorMsg('Nom et téléphone obligatoires.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/evening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: currentUser?.name || 'Administrateur',
          single: {
            fullName: singleName.trim(),
            phone: singlePhone.trim(),
            neighborhood: singleNeighborhood.trim(),
            originChiefOrList: `Ajout exceptionnel (${exceptionalReason.trim()})`,
            isExceptionalAdd: true,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Personne non recensée ajoutée exceptionnellement avec autorisation.');
        setShowExceptionalAddModal(false);
        setSingleName('');
        setSinglePhone('');
        setExceptionalReason('');
        onRefresh();
      } else {
        setErrorMsg(data.message || 'Erreur');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  // Modification corrective (Admin)
  const handleAdminCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBeneficiary || !editReason.trim()) {
      setErrorMsg('Le motif de correction est obligatoire pour l\'audit.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/evening', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBeneficiary.id,
          fullName: editingBeneficiary.fullName,
          phone: editingBeneficiary.phone,
          neighborhood: editingBeneficiary.neighborhood,
          originChiefOrList: editingBeneficiary.originChiefOrList,
          status: editingBeneficiary.status,
          quantityGiven: editingBeneficiary.quantityGiven,
          reason: editReason.trim(),
          adminName: currentUser?.name || 'Administrateur',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Fiche mise à jour et tracée dans le journal.');
        setEditingBeneficiary(null);
        setEditReason('');
        fetchLiveBeneficiaries();
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

  return (
    <div className="space-y-4 pb-16">
      {/* En-tête du module */}
      <div className="bg-blue-800 text-white p-4 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 flex-shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-bold">Module du Soir — Podium</h2>
              <p className="text-xs text-blue-100">
                Distribution aux bénéficiaires recensés par les chefs de quartier.
              </p>
            </div>
          </div>

          {/* Boutons d'action selon le rôle */}
          <div className="flex flex-wrap items-center gap-2">
            {currentUser?.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 bg-white text-blue-900 rounded-xl font-bold text-xs hover:bg-blue-50 transition flex items-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-4 h-4 text-blue-700" />
                  <span>Saisir listes chefs</span>
                </button>
                <button
                  onClick={() => setShowExceptionalAddModal(true)}
                  className="px-2.5 py-1.5 bg-blue-900/60 text-blue-100 border border-blue-400/40 rounded-xl font-medium text-xs hover:bg-blue-900 transition flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Ajout exceptionnel</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>
      )}

      {/* Mini statistiques du soir */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center shadow-2xs">
          <span className="text-[10px] text-slate-500 font-medium">Total Recensés</span>
          <div className="text-lg font-black text-slate-800">{totalCensus}</div>
        </div>
        <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-center shadow-2xs">
          <span className="text-[10px] text-emerald-700 font-medium">Déjà Servis</span>
          <div className="text-lg font-black text-emerald-700">{totalServed}</div>
        </div>
        <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 text-center shadow-2xs">
          <span className="text-[10px] text-amber-700 font-medium">En Attente</span>
          <div className="text-lg font-black text-amber-700">{totalPending}</div>
        </div>
      </div>

      {/* Section Recherche Rapide au Podium (Cœur de l'opération) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-4 h-4 text-blue-700" />
            Recherche Rapide au Podium (Nom ou Téléphone)
          </h3>
        </div>

        {/* Champ de recherche avec loupe et bouton effacer */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tapez le nom ou le numéro de téléphone..."
            className="w-full pl-9 pr-10 py-2.5 text-sm border-2 border-blue-200 rounded-xl focus:border-blue-600 focus:outline-none shadow-xs font-medium"
          />
          <Search className="w-5 h-5 text-blue-600 absolute left-2.5 top-2.5" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtres par statut et quartier */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2 py-0.5 rounded-md font-medium ${statusFilter === 'ALL' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'}`}
            >
              Tous ({beneficiaries.length})
            </button>
            <button
              onClick={() => setStatusFilter('EN_ATTENTE')}
              className={`px-2 py-0.5 rounded-md font-medium ${statusFilter === 'EN_ATTENTE' ? 'bg-amber-500 text-white font-bold' : 'text-amber-800'}`}
            >
              En attente ({totalPending})
            </button>
            <button
              onClick={() => setStatusFilter('SERVI')}
              className={`px-2 py-0.5 rounded-md font-medium ${statusFilter === 'SERVI' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-800'}`}
            >
              Servis ({totalServed})
            </button>
          </div>

          <select
            value={neighborhoodFilter}
            onChange={e => setNeighborhoodFilter(e.target.value)}
            className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:outline-none"
          >
            <option value="ALL">Tous les quartiers</option>
            {PRESET_NEIGHBORHOODS.filter(n => n !== 'Autre quartier').map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Liste des résultats */}
        {filteredBeneficiaries.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Aucun bénéficiaire trouvé pour ces critères de recherche.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredBeneficiaries.map(item => {
              const isServed = item.status === 'SERVI';
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isServed
                      ? 'bg-slate-50 border-slate-200 opacity-90'
                      : 'bg-white border-blue-200 hover:border-blue-400 shadow-xs'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{item.fullName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isServed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {isServed ? `✓ SERVI (${item.quantityGiven} moust.)` : '⏳ EN ATTENTE'}
                      </span>
                      {item.isExceptionalAdd && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-semibold">
                          Ajout sur place
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {item.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        {item.neighborhood}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Liste: <strong>{item.originChiefOrList}</strong>
                      </span>
                      {isServed && item.servedAt && (
                        <span className="text-[11px] text-emerald-700 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Servi à {new Date(item.servedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} par {item.servedBy}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {!isServed ? (
                      <div className="flex items-center gap-1.5">
                        {/* Bouton rapide 1-clic */}
                        <button
                          disabled={isClosed || loading}
                          onClick={() => handleQuickServe(item)}
                          title={`Servir directement ${defaultQty || 2} moustiquaires`}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Servir ({defaultQty || 2})</span>
                        </button>
                        {/* Bouton choix quantité personnalisé */}
                        <button
                          disabled={isClosed || loading}
                          onClick={() => {
                            setServingBeneficiary(item);
                            setQuantityToGive(defaultQty || 2);
                          }}
                          title="Modifier la quantité ou vérifier avant de servir"
                          className="px-2.5 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-xl text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Autre</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
                        <span>Déjà servi</span>
                      </div>
                    )}

                    {currentUser?.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setEditingBeneficiary(item);
                          setEditReason('');
                        }}
                        title="Corriger la fiche"
                        className="p-1.5 bg-slate-100 text-slate-600 hover:text-blue-700 rounded-lg text-xs"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modale de Service au Podium (Confirmation & choix quantité) */}
      {servingBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-2">
                <Users className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Distribution au Podium</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Vérifiez l'identité du bénéficiaire avant de confirmer la remise.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Nom & Prénom :</span>
                <span className="font-bold text-slate-900">{servingBeneficiary.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Téléphone :</span>
                <span className="font-mono font-bold text-slate-800">{servingBeneficiary.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quartier :</span>
                <span className="font-bold text-blue-700">{servingBeneficiary.neighborhood}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Liste d'origine :</span>
                <span className="text-slate-700">{servingBeneficiary.originChiefOrList}</span>
              </div>
            </div>

            {/* Saisie de la quantité de moustiquaires remise */}
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
              <label className="block text-xs font-bold text-blue-950 mb-1">
                Quantité de moustiquaires à remettre :
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={remainingStock}
                  value={quantityToGive}
                  onChange={e => setQuantityToGive(parseInt(e.target.value, 10) || 1)}
                  className="w-20 px-3 py-1.5 text-center font-bold text-base border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-xs text-blue-800">
                  moustiquaire(s)
                  {currentUser?.role === 'ADMIN' && (
                    <> (Stock dispo: <strong>{remainingStock}</strong>)</>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setServingBeneficiary(null)}
                className="py-2.5 px-3 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={loading || remainingStock < quantityToGive}
                onClick={handleConfirmDistribution}
                className="py-2.5 px-3 bg-blue-700 text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition shadow-sm"
              >
                {loading ? 'Validation...' : 'Confirmer Remise'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'ajout des listes par l'Administrateur */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 border border-slate-200 space-y-3.5">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-blue-700" />
                Saisie des Listes des Chefs de Quartier
              </h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="flex rounded-lg bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setIsBulkMode(false)}
                className={`flex-1 py-1 rounded-md font-medium transition ${!isBulkMode ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'}`}
              >
                Saisie individuelle
              </button>
              <button
                type="button"
                onClick={() => setIsBulkMode(true)}
                className={`flex-1 py-1 rounded-md font-medium transition ${isBulkMode ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'}`}
              >
                Saisie groupée (Copier-coller)
              </button>
            </div>

            <form onSubmit={handleAddBeneficiaries} className="space-y-3 text-xs">
              {!isBulkMode ? (
                <>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Nom et Prénom *</label>
                    <input
                      type="text"
                      required
                      value={singleName}
                      onChange={e => setSingleName(e.target.value)}
                      placeholder="ex: Fatou Ndiaye"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Téléphone *</label>
                    <input
                      type="tel"
                      required
                      value={singlePhone}
                      onChange={e => setSinglePhone(e.target.value)}
                      placeholder="ex: 70 987 65 43"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Quartier *</label>
                      <select
                        value={singleNeighborhood}
                        onChange={e => setSingleNeighborhood(e.target.value)}
                        className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        {PRESET_NEIGHBORHOODS.map(q => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Chef de quartier / Liste</label>
                      <input
                        type="text"
                        value={singleChief}
                        onChange={e => setSingleChief(e.target.value)}
                        placeholder="ex: Liste Chef S.M.SY 1"
                        className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Collez les bénéficiaires (1 par ligne : Nom, Téléphone, Quartier, Chef) :
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder="Moussa Ba, 771112233, S.M.SY 1, Chef Ba&#10;Awa Diop, 782223344, D.S.2.E, Chef Diop"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Séparer chaque champ par une virgule. Les doublons seront automatiquement détectés et signalés.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800"
                >
                  {loading ? 'Enregistrement...' : 'Ajouter à la liste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale d'ajout exceptionnel sur place (Non inscrit autorisé par Admin) */}
      {showExceptionalAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-purple-700" />
              Ajout exceptionnel sur place (Autorisation Admin)
            </h4>
            <p className="text-[11px] text-slate-500">
              Conformément au cahier des charges, une personne non inscrite ne peut être ajoutée qu'avec validation de l'administrateur.
            </p>

            <form onSubmit={handleExceptionalAdd} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-0.5">Nom et Prénom *</label>
                <input
                  type="text"
                  required
                  value={singleName}
                  onChange={e => setSingleName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-0.5">Téléphone *</label>
                <input
                  type="tel"
                  required
                  value={singlePhone}
                  onChange={e => setSinglePhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-0.5">Quartier *</label>
                <select
                  value={singleNeighborhood}
                  onChange={e => setSingleNeighborhood(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {PRESET_NEIGHBORHOODS.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-purple-900 mb-0.5">
                  Motif d'autorisation par l'admin *
                </label>
                <input
                  type="text"
                  required
                  value={exceptionalReason}
                  onChange={e => setExceptionalReason(e.target.value)}
                  placeholder="ex: Cas social urgent validé par chef..."
                  className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExceptionalAddModal(false)}
                  className="py-2 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 bg-purple-700 text-white font-bold rounded-lg"
                >
                  {loading ? 'Validation...' : 'Autoriser & Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de correction d'une fiche (Admin) */}
      {editingBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Edit className="w-4 h-4 text-blue-700" />
              Correction de la fiche Podium (Admin)
            </h4>

            <form onSubmit={handleAdminCorrection} className="space-y-2 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-0.5">Nom et Prénom</label>
                <input
                  type="text"
                  value={editingBeneficiary.fullName}
                  onChange={e => setEditingBeneficiary({ ...editingBeneficiary, fullName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-0.5">Téléphone</label>
                <input
                  type="text"
                  value={editingBeneficiary.phone}
                  onChange={e => setEditingBeneficiary({ ...editingBeneficiary, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-0.5">Statut</label>
                  <select
                    value={editingBeneficiary.status}
                    onChange={e => setEditingBeneficiary({ ...editingBeneficiary, status: e.target.value as any })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="EN_ATTENTE">EN ATTENTE</option>
                    <option value="SERVI">SERVI</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-0.5">Quantité remise</label>
                  <input
                    type="number"
                    value={editingBeneficiary.quantityGiven}
                    onChange={e => setEditingBeneficiary({ ...editingBeneficiary, quantityGiven: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-rose-700 mb-0.5">
                  Motif de modification obligatoire (Traçabilité) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  placeholder="Justification de la modification..."
                  className="w-full px-2.5 py-1.5 border border-rose-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBeneficiary(null)}
                  className="py-2 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 bg-blue-700 text-white font-bold rounded-lg"
                >
                  {loading ? 'Enregistrement...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
