import { NextResponse } from 'next/server';
import { getSupabaseState, getDatabase, calculateStock } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseData = await getSupabaseState();
    if (supabaseData) {
      // Calcul des répartitions par quartier
      const morningByNeighborhood: Record<string, number> = {};
      supabaseData.morningDonations.forEach((d: any) => {
        const q = d.neighborhood?.trim() || 'Non spécifié';
        morningByNeighborhood[q] = (morningByNeighborhood[q] || 0) + 1;
      });

      const eveningCensusByNeighborhood: Record<string, number> = {};
      const eveningServedByNeighborhood: Record<string, number> = {};
      supabaseData.eveningBeneficiaries.forEach((b: any) => {
        const q = b.neighborhood?.trim() || 'Non spécifié';
        eveningCensusByNeighborhood[q] = (eveningCensusByNeighborhood[q] || 0) + 1;
        if (b.status === 'SERVI') {
          eveningServedByNeighborhood[q] = (eveningServedByNeighborhood[q] || 0) + 1;
        }
      });

      const totalCensus = supabaseData.eveningBeneficiaries.length;
      const servedCount = supabaseData.eveningBeneficiaries.filter((b: any) => b.status === 'SERVI').length;

      return NextResponse.json({
        success: true,
        stock: supabaseData.stock,
        stats: {
          morning: {
            beneficiariesServed: supabaseData.morningDonations.length,
            mosquitoNetsDistributed: supabaseData.stock.morningDistributed,
            byNeighborhood: morningByNeighborhood,
          },
          evening: {
            totalCensus,
            servedCount,
            pendingCount: totalCensus - servedCount,
            mosquitoNetsDistributed: supabaseData.stock.eveningDistributed,
            censusByNeighborhood: eveningCensusByNeighborhood,
            servedByNeighborhood: eveningServedByNeighborhood,
          },
          global: {
            totalMorning: supabaseData.stock.morningDistributed,
            totalEvening: supabaseData.stock.eveningDistributed,
            totalDistributed: supabaseData.stock.totalDistributed,
            remainingStock: supabaseData.stock.remaining,
            initialStock: supabaseData.stock.initial,
            entriesTotal: supabaseData.stock.entriesTotal,
            isClosed: supabaseData.stock.isClosed,
          },
        },
        morningDonations: supabaseData.morningDonations,
        eveningBeneficiaries: supabaseData.eveningBeneficiaries,
        auditLogs: supabaseData.auditLogs,
        users: supabaseData.users,
        defaultEveningQty: supabaseData.defaultEveningQty,
      });
    }

    // Fallback local
    const db = getDatabase();
    const stockStats = calculateStock(db);
    return NextResponse.json({
      success: true,
      stock: { ...db.stock, ...stockStats },
      morningDonations: db.morningDonations,
      eveningBeneficiaries: db.eveningBeneficiaries,
      auditLogs: db.auditLogs,
      users: db.users.map(({ pin, ...safe }) => safe),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
