import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { adminName, reason } = await request.json();

    const { error } = await supabase.from('stock_state').update({
      is_closed: true,
      closed_at: new Date().toISOString(),
      closed_by: adminName || 'Administrateur',
    }).eq('id', 1);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    await supabase.from('audit_logs').insert([{
      user_name: adminName || 'Administrateur',
      action: 'CLOTURE_JOURNEE',
      details: `Clôture définitive par ${adminName}. Motif: ${reason || 'Fin normale'}`,
    }]);

    return NextResponse.json({
      success: true,
      message: 'La journée a été clôturée avec succès.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { adminName, reason } = await request.json();

    const { error } = await supabase.from('stock_state').update({
      is_closed: false,
    }).eq('id', 1);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    await supabase.from('audit_logs').insert([{
      user_name: adminName || 'Administrateur',
      action: 'REOUVERTURE_EXCEPTIONNELLE',
      details: `Réouverture : ${reason}`,
    }]);

    return NextResponse.json({
      success: true,
      message: 'Opérations réouvertes.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
