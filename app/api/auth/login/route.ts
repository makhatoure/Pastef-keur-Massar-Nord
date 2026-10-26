import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { username, pin } = await request.json();
    const cleanUser = (username || '').toLowerCase().trim();
    const cleanPin = (pin || '').trim();

    // Recherche dans Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', cleanUser)
      .eq('pin', cleanPin)
      .single();

    if (error || !user) {
      return NextResponse.json({ success: false, message: 'Identifiant ou code PIN incorrect' }, { status: 401 });
    }

    // Enregistrement dans le journal Supabase
    await supabase.from('audit_logs').insert([{
      user_name: user.name,
      action: 'CONNEXION',
      details: `Connexion réussie sous le rôle ${user.role}`,
    }]);

    const { pin: _, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
