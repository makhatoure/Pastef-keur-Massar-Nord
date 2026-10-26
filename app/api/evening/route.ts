import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase, calculateStock, addAuditLog } from '@/lib/db';
import { EveningBeneficiary } from '@/lib/types';

// Enregistrement d'un ou plusieurs bénéficiaires par l'administrateur (Préparation des listes)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { beneficiaries, single, adminName } = body;

    const db = getDatabase();
    const stockStats = calculateStock(db);

    if (stockStats.isClosed) {
      return NextResponse.json({ success: false, message: 'La journée est clôturée. Impossible d\'ajouter des inscriptions.' }, { status: 403 });
    }

    const itemsToAdd: any[] = single ? [single] : (beneficiaries || []);
    if (!itemsToAdd.length) {
      return NextResponse.json({ success: false, message: 'Aucune donnée à enregistrer.' }, { status: 400 });
    }

    const added: EveningBeneficiary[] = [];
    const duplicates: string[] = [];

    for (const item of itemsToAdd) {
      if (!item.fullName?.trim() || !item.phone?.trim() || !item.neighborhood?.trim()) {
        continue;
      }

      const cleanPhone = item.phone.trim().replace(/\s+/g, '');
      const cleanName = item.fullName.trim().toLowerCase();

      // Vérifier doublon potentiel
      const exists = db.eveningBeneficiaries.find(
        b => b.phone.replace(/\s+/g, '') === cleanPhone || b.fullName.trim().toLowerCase() === cleanName
      );

      if (exists && !item.forceAdd) {
        duplicates.push(`${item.fullName} (${item.phone})`);
        continue;
      }

      const newBeneficiary: EveningBeneficiary = {
        id: `eve-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fullName: item.fullName.trim(),
        phone: item.phone.trim(),
        neighborhood: item.neighborhood.trim(),
        originChiefOrList: item.originChiefOrList?.trim() || 'Liste générale',
        status: 'EN_ATTENTE',
        quantityGiven: 0,
        createdAt: new Date().toISOString(),
        createdBy: adminName || 'Administrateur',
        isExceptionalAdd: Boolean(item.isExceptionalAdd),
        history: [
          {
            action: item.isExceptionalAdd ? 'AJOUT_EXCEPTIONNEL_PODIUM' : 'RECENSEMENT_CHEF_QUARTIER',
            by: adminName || 'Administrateur',
            date: new Date().toISOString(),
            reason: item.isExceptionalAdd ? 'Ajout sur place autorisé par admin' : `Liste de: ${item.originChiefOrList || 'Chef de quartier'}`,
            previousData: null,
          },
        ],
      };

      db.eveningBeneficiaries.unshift(newBeneficiary);
      added.push(newBeneficiary);
    }

    if (added.length > 0) {
      addAuditLog(
        db,
        adminName || 'Administrateur',
        'RECENSEMENT_SOIR',
        `${added.length} bénéficiaire(s) recensé(s) pour la distribution au podium.`
      );
      saveDatabase(db);
    }

    return NextResponse.json({
      success: true,
      addedCount: added.length,
      duplicates,
      message: `${added.length} personne(s) ajoutée(s) à la liste du soir.` + (duplicates.length ? ` (${duplicates.length} doublon(s) ignoré(s))` : ''),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Distribution au podium (Service d'un bénéficiaire)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, quantity, agentName } = body;

    const db = getDatabase();
    const stockStats = calculateStock(db);

    if (stockStats.isClosed) {
      return NextResponse.json({ success: false, message: 'La journée a été clôturée. Les distributions sont suspendues.' }, { status: 403 });
    }

    const beneficiary = db.eveningBeneficiaries.find(b => b.id === id);
    if (!beneficiary) {
      return NextResponse.json({ success: false, message: 'Bénéficiaire introuvable sur la liste du soir.' }, { status: 404 });
    }

    if (beneficiary.status === 'SERVI') {
      return NextResponse.json({
        success: false,
        message: `ATTENTION : ${beneficiary.fullName} a DÉJÀ ÉTÉ SERVI(E) le ${new Date(beneficiary.servedAt || '').toLocaleTimeString('fr-FR')} par ${beneficiary.servedBy} (${beneficiary.quantityGiven} moustiquaires). Double remise interdite !`,
      }, { status: 400 });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ success: false, message: 'La quantité doit être un nombre entier supérieur à 0.' }, { status: 400 });
    }

    if (qty > stockStats.remaining) {
      return NextResponse.json({
        success: false,
        message: `Stock insuffisant ! Stock disponible : ${stockStats.remaining}, quantité demandée : ${qty}.`,
      }, { status: 400 });
    }

    const previousData = { ...beneficiary };

    beneficiary.status = 'SERVI';
    beneficiary.quantityGiven = qty;
    beneficiary.servedAt = new Date().toISOString();
    beneficiary.servedBy = agentName || 'Agent Podium';

    if (!beneficiary.history) beneficiary.history = [];
    beneficiary.history.push({
      action: 'DISTRIBUTION_PODIUM',
      by: agentName || 'Agent Podium',
      date: new Date().toISOString(),
      reason: `Distribution de ${qty} moustiquaire(s) au podium`,
      previousData,
    });

    addAuditLog(
      db,
      agentName || 'Agent Podium',
      'REMISE_SOIR',
      `Remise de ${qty} moustiquaire(s) à ${beneficiary.fullName} (${beneficiary.phone}, Quartier: ${beneficiary.neighborhood}, Liste: ${beneficiary.originChiefOrList})`
    );

    saveDatabase(db);
    const updatedStock = calculateStock(db);

    return NextResponse.json({
      success: true,
      beneficiary,
      remainingStock: updatedStock.remaining,
      message: `Distribution confirmée ! ${qty} moustiquaire(s) remise(s) à ${beneficiary.fullName}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Modification ou correction d'une fiche du soir (Admin uniquement avec motif)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, fullName, phone, neighborhood, originChiefOrList, status, quantityGiven, reason, adminName } = body;

    if (!adminName) {
      return NextResponse.json({ success: false, message: 'Action réservée à l\'administrateur.' }, { status: 403 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, message: 'Un motif explicite est obligatoire pour toute correction.' }, { status: 400 });
    }

    const db = getDatabase();
    const beneficiary = db.eveningBeneficiaries.find(b => b.id === id);
    if (!beneficiary) {
      return NextResponse.json({ success: false, message: 'Bénéficiaire introuvable.' }, { status: 404 });
    }

    const previousData = { ...beneficiary };

    if (fullName) beneficiary.fullName = fullName.trim();
    if (phone) beneficiary.phone = phone.trim();
    if (neighborhood) beneficiary.neighborhood = neighborhood.trim();
    if (originChiefOrList) beneficiary.originChiefOrList = originChiefOrList.trim();
    if (status && (status === 'EN_ATTENTE' || status === 'SERVI')) {
      beneficiary.status = status;
      if (status === 'EN_ATTENTE') {
        beneficiary.quantityGiven = 0;
        beneficiary.servedAt = undefined;
        beneficiary.servedBy = undefined;
      }
    }
    if (quantityGiven !== undefined && beneficiary.status === 'SERVI') {
      beneficiary.quantityGiven = parseInt(quantityGiven, 10) || 0;
    }

    if (!beneficiary.history) beneficiary.history = [];
    beneficiary.history.push({
      action: 'MODIFICATION_ADMIN',
      by: adminName,
      date: new Date().toISOString(),
      reason: reason.trim(),
      previousData,
    });

    addAuditLog(
      db,
      adminName,
      'CORRECTION_FICHE_SOIR',
      `Modification bénéficiaire ${beneficiary.fullName}. Motif: ${reason.trim()}`
    );

    saveDatabase(db);
    const updatedStock = calculateStock(db);

    return NextResponse.json({
      success: true,
      beneficiary,
      remainingStock: updatedStock.remaining,
      message: 'Correction enregistrée avec succès dans le journal d\'audit.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
