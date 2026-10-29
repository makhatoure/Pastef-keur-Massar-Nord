import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { username, pin } = await request.json();
    const cleanUser = (username || '').trim();
    const cleanPin = (pin || '').trim();

    if (!cleanPin) {
      return NextResponse.json({ success: false, message: 'Veuillez saisir votre code d\'accès.' }, { status: 400 });
    }

    // 1. Recherche par code PIN dans Supabase
    const { data: usersWithPin, error } = await supabase
      .from('users')
      .select('*')
      .eq('pin', cleanPin);

    if (error || !usersWithPin || usersWithPin.length === 0) {
      return NextResponse.json({ success: false, message: 'Code d\'accès incorrect.' }, { status: 401 });
    }

    // Sélection de l'utilisateur de base
    let baseUser = usersWithPin[0];

    // Si plusieurs rôles ont le même code ou si username match
    const exactMatch = usersWithPin.find(u => u.username.toLowerCase() === cleanUser.toLowerCase());
    if (exactMatch) {
      baseUser = exactMatch;
    }

    // Le nom personnalisé saisi par l'agent ou admin
    const displayName = cleanUser || baseUser.name || (baseUser.role === 'ADMIN' ? 'Administrateur' : 'Agent');

    // Enregistrement dans le journal d'audit
    await supabase.from('audit_logs').insert([{
      user_name: displayName,
      action: 'CONNEXION',
      details: `Connexion sous le profil ${baseUser.role} : ${displayName}`,
    }]);

    const safeUser = {
      id: baseUser.id,
      username: cleanUser.toLowerCase() || baseUser.username,
      name: displayName,
      role: baseUser.role,
    };

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
