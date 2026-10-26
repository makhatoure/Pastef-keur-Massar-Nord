import { NextResponse } from 'next/server';
import { getDatabase, calculateStock } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDatabase();
    const stockStats = calculateStock(db);

    // Statistiques détaillées Matin
    const morningConfirmed = db.morningDonations.filter(d => d.confirmed);
    const morningByNeighborhood: Record<string, number> = {};
    morningConfirmed.forEach(d => {
      const q = d.neighborhood?.trim() || 'Non spécifié';
      morningByNeighborhood[q] = (morningByNeighborhood[q] || 0) + 1;
    });

    // Statistiques détaillées Soir
    const eveningTotalCensus = db.eveningBeneficiaries.length;
    const eveningServed = db.eveningBeneficiaries.filter(b => b.status === 'SERVI');
    const eveningPending = db.eveningBeneficiaries.filter(b => b.status === 'EN_ATTENTE');
    
    const eveningCensusByNeighborhood: Record<string, number> = {};
    const eveningServedByNeighborhood: Record<string, number> = {};
    
    db.eveningBeneficiaries.forEach(b => {
      const q = b.neighborhood?.trim() || 'Non spécifié';
      eveningCensusByNeighborhood[q] = (eveningCensusByNeighborhood[q] || 0) + 1;
      if (b.status === 'SERVI') {
        eveningServedByNeighborhood[q] = (eveningServedByNeighborhood[q] || 0) + 1;
      }
    });

    return NextResponse.json({
      success: true,
      stock: {
        ...db.stock,
        ...stockStats,
      },
      stats: {
        morning: {
          beneficiariesServed: morningConfirmed.length,
          mosquitoNetsDistributed: stockStats.morningDistributed,
          byNeighborhood: morningByNeighborhood,
        },
        evening: {
          totalCensus: eveningTotalCensus,
          servedCount: eveningServed.length,
          pendingCount: eveningPending.length,
          mosquitoNetsDistributed: stockStats.eveningDistributed,
          censusByNeighborhood: eveningCensusByNeighborhood,
          servedByNeighborhood: eveningServedByNeighborhood,
        },
        global: {
          totalMorning: stockStats.morningDistributed,
          totalEvening: stockStats.eveningDistributed,
          totalDistributed: stockStats.totalDistributed,
          remainingStock: stockStats.remaining,
          initialStock: stockStats.initial,
          entriesTotal: stockStats.entriesTotal,
          isClosed: stockStats.isClosed,
        },
      },
      morningDonations: db.morningDonations,
      eveningBeneficiaries: db.eveningBeneficiaries,
      auditLogs: db.auditLogs.slice(0, 100),
      users: db.users.map(({ pin, ...safe }) => safe),
      defaultEveningQty: db.defaultEveningQty || 2,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
