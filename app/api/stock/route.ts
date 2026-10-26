import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quantity, reason, adminName } = body;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ success: false, message: 'La quantité doit être supérieure à 0.' }, { status: 400 });
    }

    const { data, error } = await supabase.from('stock_entries').insert([{
      quantity: qty,
      reason: (reason || 'Livraison supplémentaire').trim(),
      added_by: adminName || 'Administrateur',
    }]).select().single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    await supabase.from('audit_logs').insert([{
      user_name: adminName || 'Administrateur',
      action: 'ENTREE_STOCK',
      details: `Ajout de ${qty} moustiquaires au stock (${reason})`,
    }]);

    return NextResponse.json({
      success: true,
      entry: data,
      message: `${qty} moustiquaires ajoutées avec succès au stock.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { initialStock, defaultEveningQty, adminName } = body;

    const updates: any = {};
    if (initialStock !== undefined) updates.initial_stock = parseInt(initialStock, 10);
    if (defaultEveningQty !== undefined) updates.default_evening_qty = parseInt(defaultEveningQty, 10);

    const { error } = await supabase.from('stock_state').update(updates).eq('id', 1);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    await supabase.from('audit_logs').insert([{
      user_name: adminName || 'Administrateur',
      action: 'CONFIG_STOCK',
      details: `Mise à jour configuration stock: initial=${initialStock || '-'}, defaultQty=${defaultEveningQty || '-'}`,
    }]);

    return NextResponse.json({ success: true, message: 'Paramètres mis à jour.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
