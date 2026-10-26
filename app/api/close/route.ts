import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase, addAuditLog, calculateStock } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { adminName, reason } = await request.json();

    if (!adminName) {
      return NextResponse.json({ success: false, message: 'Seul l\'administrateur peut clôturer les opérations.' }, { status: 403 });
    }

    const db = getDatabase();
    db.stock.isClosed = true;
    db.stock.closedAt = new Date().toISOString();
    db.stock.closedBy = adminName;

    const stats = calculateStock(db);

    addAuditLog(
      db,
      adminName,
      'CLOTURE_JOURNEE',
      `Clôture définitive de la journée par ${adminName}. Total distribué : ${stats.totalDistributed} moustiquaires. Stock final : ${stats.remaining}. Motif: ${reason || 'Fin normale des activités'}`
    );

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      isClosed: true,
      message: 'La journée a été clôturée avec succès. Les opérations sont désormais verrouillées.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { adminName, reason } = await request.json();

    if (!adminName) {
      return NextResponse.json({ success: false, message: 'Action réservée à l\'administrateur.' }, { status: 403 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, message: 'Un motif d\'ouverture exceptionnelle est obligatoire.' }, { status: 400 });
    }

    const db = getDatabase();
    db.stock.isClosed = false;

    addAuditLog(
      db,
      adminName,
      'REOUVERTURE_EXCEPTIONNELLE',
      `Réouverture des opérations par ${adminName}. Justification: ${reason.trim()}`
    );

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      isClosed: false,
      message: 'Les opérations ont été déverrouillées avec mention dans l\'historique d\'audit.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
