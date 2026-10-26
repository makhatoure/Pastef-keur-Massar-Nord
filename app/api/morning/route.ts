import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase, calculateStock, addAuditLog } from '@/lib/db';
import { MorningDonation } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, phone, neighborhood, agentName, forceDuplicate } = body;

    const db = getDatabase();
    const stockStats = calculateStock(db);

    if (stockStats.isClosed) {
      return NextResponse.json({ success: false, message: 'La journée a été clôturée. Les enregistrements sont verrouillés.' }, { status: 403 });
    }

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ success: false, message: 'Le nom et prénom sont obligatoires.' }, { status: 400 });
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json({ success: false, message: 'Le numéro de téléphone est obligatoire.' }, { status: 400 });
    }

    if (!neighborhood || !neighborhood.trim()) {
      return NextResponse.json({ success: false, message: 'Le quartier est obligatoire.' }, { status: 400 });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanName = fullName.trim().toLowerCase();

    // Vérification de doublon
    const existing = db.morningDonations.find(
      d => d.phone.replace(/\s+/g, '') === cleanPhone || d.fullName.trim().toLowerCase() === cleanName
    );

    if (existing && !forceDuplicate) {
      return NextResponse.json({
        success: false,
        isDuplicateWarning: true,
        message: `Doublon détecté : ${existing.fullName} (${existing.phone}) a déjà été enregistré à ${new Date(existing.date).toLocaleTimeString('fr-FR')} par ${existing.agent}.`,
      }, { status: 409 });
    }

    // Vérification du stock
    const requiredQty = 2;
    if (stockStats.remaining < requiredQty) {
      return NextResponse.json({
        success: false,
        message: `Stock insuffisant ! Stock restant : ${stockStats.remaining} moustiquaire(s), requis : ${requiredQty}.`,
      }, { status: 400 });
    }

    const newDonation: MorningDonation = {
      id: `morn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      neighborhood: neighborhood.trim(),
      quantity: 2, // Strictement 2 moustiquaires selon le cahier des charges
      date: new Date().toISOString(),
      agent: agentName || 'Agent Matin',
      confirmed: true,
      history: [
        {
          action: 'CREATION',
          by: agentName || 'Agent Matin',
          date: new Date().toISOString(),
          reason: 'Enregistrement don de sang et remise de 2 moustiquaires',
          previousData: null,
        },
      ],
    };

    db.morningDonations.unshift(newDonation);
    addAuditLog(
      db,
      agentName || 'Agent Matin',
      'REMISE_MATIN',
      `Remise de 2 moustiquaires à ${newDonation.fullName} (${newDonation.phone}, Quartier: ${newDonation.neighborhood})`
    );

    saveDatabase(db);

    const updatedStock = calculateStock(db);

    return NextResponse.json({
      success: true,
      donation: newDonation,
      remainingStock: updatedStock.remaining,
      message: `Enregistrement réussi. 2 moustiquaires remises à ${newDonation.fullName}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Modification réservée à l'administrateur avec motif obligatoire
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, fullName, phone, neighborhood, reason, adminName } = body;

    if (!adminName) {
      return NextResponse.json({ success: false, message: 'Action non autorisée. Réservé à l\'administrateur.' }, { status: 403 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, message: 'Un motif de modification est obligatoire pour la traçabilité.' }, { status: 400 });
    }

    const db = getDatabase();
    const donation = db.morningDonations.find(d => d.id === id);

    if (!donation) {
      return NextResponse.json({ success: false, message: 'Bénéficiaire introuvable.' }, { status: 404 });
    }

    const previousData = { ...donation };

    if (fullName) donation.fullName = fullName.trim();
    if (phone) donation.phone = phone.trim();
    if (neighborhood) donation.neighborhood = neighborhood.trim();

    if (!donation.history) donation.history = [];
    donation.history.push({
      action: 'MODIFICATION_ADMIN',
      by: adminName,
      date: new Date().toISOString(),
      reason: reason.trim(),
      previousData,
    });

    addAuditLog(
      db,
      adminName,
      'MODIF_DONATEUR_MATIN',
      `Modification fiche ${donation.fullName} (${donation.id}). Motif: ${reason.trim()}`
    );

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      donation,
      message: 'Fiche mise à jour avec traçabilité.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
