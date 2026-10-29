import { NextResponse } from 'next/server';
import { supabase, getSupabaseState } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, phone, neighborhood, agentName, forceDuplicate } = body;

    const state = await getSupabaseState();
    if (state?.stock?.isClosed) {
      return NextResponse.json({ success: false, message: 'La journée a été clôturée. Les enregistrements sont verrouillés.' }, { status: 403 });
    }

    const safeName = fullName?.trim() || 'Donneur anonyme';
    const safePhone = phone?.trim() || 'Non renseigné';
    const safeNeighborhood = neighborhood?.trim() || 'Non spécifié';

    const cleanPhone = (phone || '').trim().replace(/\s+/g, '');

    // Vérification de doublon dans Supabase uniquement si un téléphone est renseigné
    if (cleanPhone.length >= 6 && !forceDuplicate) {
      const { data: existing } = await supabase
        .from('morning_donations')
        .select('*')
        .ilike('phone', `%${cleanPhone}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        const d = existing[0];
        return NextResponse.json({
          success: false,
          isDuplicateWarning: true,
          message: `Doublon détecté : ${d.full_name} (${d.phone}) a déjà été enregistré à ${new Date(d.created_at).toLocaleTimeString('fr-FR')}.`,
        }, { status: 409 });
      }
    }

    // Insertion Supabase
    const { data: inserted, error } = await supabase
      .from('morning_donations')
      .insert([{
        full_name: safeName,
        phone: safePhone,
        neighborhood: safeNeighborhood,
        quantity: 2,
        agent: agentName || 'Agent',
        confirmed: true,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    // Log d'audit Supabase avec mention explicite du mouvement de stock (-2 moustiquaires)
    await supabase.from('audit_logs').insert([{
      user_name: agentName || 'Agent Matin',
      action: 'REMISE_MATIN',
      details: `Sortie stock : -2 moustiquaires | Don de sang : ${safeName} (📞 ${safePhone}, Quartier: ${safeNeighborhood})`,
    }]);

    return NextResponse.json({
      success: true,
      donation: inserted,
      message: `Enregistrement réussi. 2 moustiquaires remises à ${safeName}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Suppression ciblée d'un don (Admin uniquement)
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id, adminName } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID du don manquant.' }, { status: 400 });
    }

    // Récupérer le don avant suppression pour l'audit
    const { data: existing, error: fetchErr } = await supabase
      .from('morning_donations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ success: false, message: 'Don introuvable.' }, { status: 404 });
    }

    const { error: deleteErr } = await supabase
      .from('morning_donations')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      return NextResponse.json({ success: false, message: deleteErr.message }, { status: 500 });
    }

    // Traçabilité obligatoire
    await supabase.from('audit_logs').insert([{
      user_name: adminName || 'Administrateur',
      action: 'SUPPRESSION_MATIN',
      details: `Suppression don de sang : ${existing.full_name} (📞 ${existing.phone}, Quartier: ${existing.neighborhood}) — ID: ${id}`,
    }]);

    return NextResponse.json({
      success: true,
      message: `Don de ${existing.full_name} supprimé avec succès.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
