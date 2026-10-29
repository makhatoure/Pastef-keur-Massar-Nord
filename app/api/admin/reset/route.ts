import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminName, initialStock } = body;

    const stock = Number(initialStock) || 800;

    // 1. Vider les dons du matin
    await supabase.from('morning_donations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Vider les bénéficiaires du soir
    await supabase.from('evening_beneficiaries').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Vider les entrées additionnelles
    await supabase.from('stock_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 4. Vider les anciens logs d'audit
    await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 5. Réinitialiser stock_state
    await supabase.from('stock_state').update({
      initial_stock: stock,
      is_closed: false,
      default_evening_qty: 2,
      closed_at: null,
      closed_by: null,
    }).eq('id', 1);

    // 6. Insérer le premier log propre
    await supabase.from('audit_logs').insert([{
      user_name: adminName || 'Administrateur',
      action: 'REMISE_A_ZERO',
      details: `Remise à zéro officielle de la plateforme. Stock initial fixé à ${stock} moustiquaires.`,
    }]);

    return NextResponse.json({
      success: true,
      message: `Plateforme remise à zéro avec succès ! Stock initial : ${stock} moustiquaires.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
