import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase, calculateStock, addAuditLog } from '@/lib/db';
import { StockEntry } from '@/lib/types';

// Ajout d'une nouvelle entrée de stock
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quantity, reason, adminName } = body;

    if (!adminName) {
      return NextResponse.json({ success: false, message: 'Action réservée à l\'administrateur.' }, { status: 403 });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ success: false, message: 'La quantité doit être un nombre positif.' }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, message: 'Un motif ou bon de livraison est requis.' }, { status: 400 });
    }

    const db = getDatabase();

    const newEntry: StockEntry = {
      id: `entry-${Date.now()}`,
      date: new Date().toISOString(),
      quantity: qty,
      reason: reason.trim(),
      addedBy: adminName,
    };

    db.stock.entries.push(newEntry);
    addAuditLog(
      db,
      adminName,
      'ENTREE_STOCK',
      `Ajout de ${qty} moustiquaires au stock. Motif: ${reason.trim()}`
    );

    saveDatabase(db);
    const stockStats = calculateStock(db);

    return NextResponse.json({
      success: true,
      entry: newEntry,
      stockStats,
      message: `${qty} moustiquaire(s) ajoutée(s) au stock avec succès.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Mise à jour de la configuration de base (Stock initial ou quantité par défaut podium)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { initialStock, defaultEveningQty, adminName, reason } = body;

    if (!adminName) {
      return NextResponse.json({ success: false, message: 'Action réservée à l\'administrateur.' }, { status: 403 });
    }

    const db = getDatabase();

    if (initialStock !== undefined) {
      const initQty = parseInt(initialStock, 10);
      if (isNaN(initQty) || initQty < 0) {
        return NextResponse.json({ success: false, message: 'Le stock initial doit être un nombre positif.' }, { status: 400 });
      }

      // Vérifier que le stock restant ne devienne pas négatif
      const oldInitial = db.stock.initialStock;
      db.stock.initialStock = initQty;
      const newCalc = calculateStock(db);

      if (newCalc.remaining < 0) {
        db.stock.initialStock = oldInitial;
        return NextResponse.json({
          success: false,
          message: `Impossible de réduire le stock initial à ${initQty} car le stock restant deviendrait négatif (${newCalc.remaining}).`,
        }, { status: 400 });
      }

      addAuditLog(
        db,
        adminName,
        'MODIF_STOCK_INITIAL',
        `Stock initial modifié de ${oldInitial} à ${initQty}. Motif: ${reason || 'Ajustement organisationnel'}`
      );
    }

    if (defaultEveningQty !== undefined) {
      const defQty = parseInt(defaultEveningQty, 10);
      if (defQty > 0) {
        db.defaultEveningQty = defQty;
        addAuditLog(db, adminName, 'CONFIG_QUANTITE_SOIR', `Quantité par défaut par bénéficiaire du soir fixée à ${defQty}`);
      }
    }

    saveDatabase(db);
    const stockStats = calculateStock(db);

    return NextResponse.json({
      success: true,
      stockStats,
      defaultEveningQty: db.defaultEveningQty,
      message: 'Paramètres du stock mis à jour.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
