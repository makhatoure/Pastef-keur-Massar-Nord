import { NextResponse } from 'next/server';
import { getDatabase, addAuditLog, saveDatabase } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username, pin } = await request.json();
    const db = getDatabase();

    const user = db.users.find(
      u => (u.username.toLowerCase() === username?.toLowerCase().trim() || u.name.toLowerCase() === username?.toLowerCase().trim()) && u.pin === pin?.trim()
    );

    if (!user) {
      return NextResponse.json({ success: false, message: 'Identifiant ou code PIN incorrect' }, { status: 401 });
    }

    addAuditLog(db, user.name, 'CONNEXION', `Connexion réussie sous le rôle ${user.role}`);
    saveDatabase(db);

    const { pin: _, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
