import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportData {
  cellName: string;
  date: string;
  isClosed: boolean;
  closedAt?: string;
  stock: {
    initial: number;
    entriesTotal: number;
    morningDistributed: number;
    eveningDistributed: number;
    totalDistributed: number;
    remaining: number;
  };
  morning: {
    beneficiariesServed: number;
    mosquitoNetsDistributed: number;
    byNeighborhood: Record<string, number>;
  };
  evening: {
    totalCensus: number;
    servedCount: number;
    pendingCount: number;
    mosquitoNetsDistributed: number;
    censusByNeighborhood: Record<string, number>;
    servedByNeighborhood: Record<string, number>;
  };
}

export function generateOfficialPDF(data: ReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // En-tête officiel
  doc.setFillColor(11, 102, 35); // Vert Pastef
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉPUBLIQUE DU SÉNÉGAL', 105, 9, { align: 'center' });
  doc.setFontSize(11);
  doc.text(data.cellName.toUpperCase(), 105, 17, { align: 'center' });

  // Titre du document
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT GÉNÉRAL DE LA JOURNÉE DE DISTRIBUTION', 105, 34, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const statusLabel = data.isClosed ? 'CLÔTURÉ DÉFINITIVEMENT' : 'EN COURS';
  doc.text(`Date de génération : ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 43);
  doc.text(`Statut de l'événement : ${statusLabel}`, 196, 43, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 46, 196, 46);

  // Section 1: Synthèse Globale du Stock
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 102, 35);
  doc.text('1. BILAN GÉNÉRAL ET SITUATION DU STOCK', 14, 54);

  const stockTableData = [
    ['Stock Initial disponible', `${data.stock.initial} moustiquaires`],
    ['Nouvelles entrées / Livraisons enregistrées', `+ ${data.stock.entriesTotal} moustiquaires`],
    ['Total distribué le Matin (Don de sang)', `- ${data.stock.morningDistributed} moustiquaires`],
    ['Total distribué le Soir (Podium)', `- ${data.stock.eveningDistributed} moustiquaires`],
    ['TOTAL CUMULÉ DISTRIBUÉ SUR LA JOURNÉE', `${data.stock.totalDistributed} moustiquaires`],
    ['STOCK FINAL RESTANT EN RÉSERVE', `${data.stock.remaining} moustiquaires`],
  ];

  autoTable(doc, {
    startY: 57,
    head: [['Indicateur de Stock', 'Quantité']],
    body: stockTableData,
    theme: 'grid',
    headStyles: { fillColor: [11, 102, 35], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // Section 2: Opération du Matin - Don de Sang
  let currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 102, 35);
  doc.text('2. OPÉRATION DU MATIN : DON DE SANG', 14, currentY);

  const morningRows = [
    ['Nombre de donneurs / bénéficiaires servis', `${data.morning.beneficiariesServed} personnes`],
    ['Ration par donneur (fixe)', '2 moustiquaires'],
    ['Total moustiquaires remises le matin (Bénéficiaires × 2)', `${data.morning.mosquitoNetsDistributed} moustiquaires`],
  ];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Élément Matin', 'Résultat']],
    body: morningRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right', fontStyle: 'bold' } },
  });

  // Répartition par quartier - Matin
  currentY = (doc as any).lastAutoTable.finalY + 5;
  const morningNeighborhoodEntries = Object.entries(data.morning.byNeighborhood);
  const morningNeighRows = morningNeighborhoodEntries.length > 0
    ? morningNeighborhoodEntries.map(([q, count]) => [q, `${count} donneur(s)`, `${count * 2} moustiquaires`])
    : [['Aucun enregistrement pour le moment', '-', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Quartier (Don de sang)', 'Donneurs Servis', 'Moustiquaires']],
    body: morningNeighRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
  });

  // Page 2 ou suite si nécessaire
  currentY = (doc as any).lastAutoTable.finalY + 8;
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  // Section 3: Opération du Soir - Podium
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 102, 35);
  doc.text('3. OPÉRATION DU SOIR : DISTRIBUTION AU PODIUM', 14, currentY);

  const eveningRows = [
    ['Nombre total de bénéficiaires recensés par les chefs de quartier', `${data.evening.totalCensus} personnes`],
    ['Bénéficiaires effectivement servis au podium', `${data.evening.servedCount} personnes`],
    ['Bénéficiaires encore en attente / absents', `${data.evening.pendingCount} personnes`],
    ['Total moustiquaires distribuées au podium', `${data.evening.mosquitoNetsDistributed} moustiquaires`],
  ];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Élément Soir (Podium)', 'Résultat']],
    body: eveningRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right', fontStyle: 'bold' } },
  });

  // Répartition par quartier - Soir
  currentY = (doc as any).lastAutoTable.finalY + 5;
  const allEveningNeighborhoods = Array.from(
    new Set([...Object.keys(data.evening.censusByNeighborhood), ...Object.keys(data.evening.servedByNeighborhood)])
  );

  const eveningNeighRows = allEveningNeighborhoods.length > 0
    ? allEveningNeighborhoods.map(q => {
        const census = data.evening.censusByNeighborhood[q] || 0;
        const served = data.evening.servedByNeighborhood[q] || 0;
        const pending = Math.max(0, census - served);
        return [q, `${census}`, `${served}`, `${pending}`];
      })
    : [['Aucun enregistrement pour le moment', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Quartier (Podium)', 'Recensés', 'Servis', 'En Attente']],
    body: eveningNeighRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
  });

  // Zone de signature
  currentY = (doc as any).lastAutoTable.finalY + 12;
  if (currentY > 250) {
    doc.addPage();
    currentY = 25;
  }

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'italic');
  doc.text('Ce rapport officiel a été généré informatiquement et fait foi des distributions effectuées.', 14, currentY);

  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Le Coordonnateur de Cellule', 25, currentY);
  doc.text("L'Administrateur de la Plateforme", 130, currentY);

  currentY += 16;
  doc.setDrawColor(148, 163, 184);
  doc.line(20, currentY, 80, currentY);
  doc.line(125, currentY, 185, currentY);

  doc.save(`Rapport_Distribution_Pastef_${new Date().toISOString().split('T')[0]}.pdf`);
}
