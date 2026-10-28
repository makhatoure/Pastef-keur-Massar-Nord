import * as XLSX from 'xlsx';
import { MorningDonation, EveningBeneficiary, AuditLog } from './types';

export function exportToExcel(
  stockSummary: any,
  morningDonations: MorningDonation[],
  eveningBeneficiaries: EveningBeneficiary[],
  auditLogs: AuditLog[]
) {
  const wb = XLSX.utils.book_new();

  // 1. Feuille Bilan & Stock
  const stockRows = [
    { Indicateur: 'Cellule', Valeur: 'Pastef keur Massar nord' },
    { Indicateur: 'Date du rapport', Valeur: new Date().toLocaleDateString('fr-FR') },
    { Indicateur: 'Statut de clôture', Valeur: stockSummary.isClosed ? 'CLÔTURÉ' : 'EN COURS' },
    { Indicateur: 'Stock Initial', Valeur: stockSummary.initial },
    { Indicateur: 'Entrées supplémentaires', Valeur: stockSummary.entriesTotal },
    { Indicateur: 'Total Distribué Matin (Don de sang)', Valeur: stockSummary.morningDistributed },
    { Indicateur: 'Total Distribué Soir (Podium)', Valeur: stockSummary.eveningDistributed },
    { Indicateur: 'TOTAL CUMULÉ DISTRIBUÉ', Valeur: stockSummary.totalDistributed },
    { Indicateur: 'STOCK FINAL RESTANT', Valeur: stockSummary.remaining },
  ];
  const wsStock = XLSX.utils.json_to_sheet(stockRows);
  XLSX.utils.book_append_sheet(wb, wsStock, 'Bilan_Stock');

  // 2. Feuille Don de Sang (Matin)
  const morningRows = morningDonations.map((d, index) => ({
    'N°': index + 1,
    'Nom & Prénom': d.fullName,
    'Téléphone': d.phone,
    'Quartier': d.neighborhood,
    'Quantité remise': d.quantity,
    'Date & Heure': new Date(d.date).toLocaleString('fr-FR'),
    'Agent': d.agent,
    'Confirmé': d.confirmed ? 'OUI' : 'NON',
    'Historique modifications': d.history?.length ? d.history.map(h => `[${h.action}] ${h.reason}`).join(' | ') : 'Aucune',
  }));
  const wsMorning = XLSX.utils.json_to_sheet(morningRows);
  XLSX.utils.book_append_sheet(wb, wsMorning, 'Don_De_Sang_Matin');

  // 3. Feuille Podium (Soir)
  const eveningRows = eveningBeneficiaries.map((b, index) => ({
    'N°': index + 1,
    'Nom & Prénom': b.fullName,
    'Téléphone': b.phone,
    'Quartier': b.neighborhood,
    'Liste / Chef d\'origine': b.originChiefOrList,
    'Statut': b.status === 'SERVI' ? 'SERVI' : 'EN ATTENTE',
    'Quantité remise': b.quantityGiven,
    'Date de service': b.servedAt ? new Date(b.servedAt).toLocaleString('fr-FR') : '-',
    'Agent ayant servi': b.servedBy || '-',
    'Ajout exceptionnel': b.isExceptionalAdd ? 'OUI' : 'NON',
    'Enregistré le': new Date(b.createdAt).toLocaleString('fr-FR'),
    'Enregistré par': b.createdBy,
  }));
  const wsEvening = XLSX.utils.json_to_sheet(eveningRows);
  XLSX.utils.book_append_sheet(wb, wsEvening, 'Podium_Soir');

  // 4. Feuille Journal d'audit
  const auditRows = auditLogs.map(l => ({
    'Horodatage': new Date(l.timestamp).toLocaleString('fr-FR'),
    'Utilisateur': l.user,
    'Action': l.action,
    'Détails': l.details,
  }));
  const wsAudit = XLSX.utils.json_to_sheet(auditRows);
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Journal_Audit');

  // Sauvegarder fichier
  XLSX.writeFile(wb, `Export_Pastef_${new Date().toISOString().split('T')[0]}.xlsx`);
}
