import { NextResponse } from 'next/server';
import { supabase, getSupabaseState } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Ajout par lot ou unitaire
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { beneficiaries, single, adminName } = body;

    const itemsToAdd = single ? [single] : (beneficiaries || []);
    if (!itemsToAdd.length) {
      return NextResponse.json({ success: false, message: 'Aucune donnée à enregistrer.' }, { status: 400 });
    }

    const records = itemsToAdd.map((it: any) => ({
      full_name: it.fullName ? it.fullName.trim() : 'Bénéficiaire sans nom',
      phone: it.phone ? it.phone.trim() : 'Non renseigné',
      neighborhood: it.neighborhood ? it.neighborhood.trim() : 'Serigne Mansour Sy 1',
      origin_chief_or_list: it.originChiefOrList ? it.originChiefOrList.trim() : (it.chiefName ? `Chef: ${it.chiefName.trim()}` : 'Liste chef de quartier'),
      status: 'EN_ATTENTE',
      quantity_given: 0,
      created_by: adminName || 'Agent',
      is_exceptional_add: Boolean(it.isExceptionalAdd),
    }));

    const { data, error } = await supabase.from('evening_beneficiaries').insert(records).select();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    await supabase.from('audit_logs').insert([{
      user_name: adminName || 'Administrateur',
      action: 'RECENSEMENT_SOIR',
      details: `${records.length} personne(s) ajoutée(s) à la liste du soir`,
    }]);

    return NextResponse.json({
      success: true,
      addedCount: records.length,
      message: `${records.length} bénéficiaire(s) enregistré(s) avec succès.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Distribution au podium
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, quantity, agentName } = body;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ success: false, message: 'Quantité invalide.' }, { status: 400 });
    }

    const state = await getSupabaseState();
    if (state && state.stock.remaining < qty) {
      return NextResponse.json({ success: false, message: `Stock insuffisant (${state.stock.remaining} disponible).` }, { status: 400 });
    }

    const { data: b, error: fetchErr } = await supabase
      .from('evening_beneficiaries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !b) {
      return NextResponse.json({ success: false, message: 'Bénéficiaire introuvable.' }, { status: 404 });
    }

    if (b.status === 'SERVI') {
      return NextResponse.json({
        success: false,
        message: `ATTENTION : ${b.full_name} a DÉJÀ ÉTÉ SERVI(E) le ${new Date(b.served_at).toLocaleTimeString('fr-FR')} !`,
      }, { status: 400 });
    }

    const { error: updErr } = await supabase
      .from('evening_beneficiaries')
      .update({
        status: 'SERVI',
        quantity_given: qty,
        served_at: new Date().toISOString(),
        served_by: agentName || 'Agent Podium',
      })
      .eq('id', id);

    if (updErr) {
      return NextResponse.json({ success: false, message: updErr.message }, { status: 500 });
    }

    await supabase.from('audit_logs').insert([{
      user_name: agentName || 'Agent Podium',
      action: 'REMISE_SOIR',
      details: `Remise de ${qty} moustiquaire(s) à ${b.full_name} (${b.phone})`,
    }]);

    return NextResponse.json({
      success: true,
      message: `Distribution confirmée ! ${qty} moustiquaires remises à ${b.full_name}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Correction administrative d'une fiche (Admin)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, fullName, phone, neighborhood, originChiefOrList, status, quantityGiven, reason, adminName } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID manquant.' }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, message: 'Le motif de modification est obligatoire pour l\'audit.' }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('evening_beneficiaries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ success: false, message: 'Bénéficiaire introuvable.' }, { status: 404 });
    }

    const isResettingToPending = status === 'EN_ATTENTE';
    const finalQuantity = isResettingToPending ? 0 : (parseInt(quantityGiven, 10) || 0);

    const updatePayload: any = {
      full_name: (fullName || existing.full_name).trim(),
      phone: (phone || existing.phone).trim(),
      neighborhood: (neighborhood || existing.neighborhood).trim(),
      origin_chief_or_list: (originChiefOrList || existing.origin_chief_or_list).trim(),
      status: status || existing.status,
      quantity_given: finalQuantity,
    };

    if (isResettingToPending) {
      updatePayload.served_at = null;
      updatePayload.served_by = null;
    }

    const { error: updateErr } = await supabase
      .from('evening_beneficiaries')
      .update(updatePayload)
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
    }

    // Traçabilité obligatoire dans le journal d'audit
    await supabase.from('audit_logs').insert([{
      user_name: adminName || 'Administrateur',
      action: 'CORRECTION_SOIR',
      details: `Correction fiche ${existing.full_name} (${existing.phone}) -> Statut: ${status}, Quantité: ${finalQuantity}. Motif : ${reason.trim()}`,
    }]);

    return NextResponse.json({
      success: true,
      message: `Fiche mise à jour avec succès : ${isResettingToPending ? 'Remis en attente (stock restitué)' : 'Modifications enregistrées'}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
