'use client';

import React, { useState } from 'react';
import { OFFICIAL_CELL_NAME } from './Navbar';
import { ShieldCheck, UserCheck, KeyRound, AlertCircle } from 'lucide-react';
import { User } from '@/lib/types';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pin.trim()) {
      setError('Veuillez saisir votre code d\'accès secret.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin: pin.trim() }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Code d\'accès incorrect.');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
        {/* En-tête officiel */}
        <div className="bg-emerald-700 text-white p-5 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl p-1.5 flex items-center justify-center mx-auto mb-2.5 shadow-md">
            <img src="/pastef-logo.png" alt="Pastef" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-base font-bold tracking-tight">{OFFICIAL_CELL_NAME}</h2>
          <p className="text-emerald-100 text-xs mt-1">Espace sécurisé de distribution</p>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Votre nom complet / Prénom
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none pl-9 font-medium"
                  placeholder="ex : Moussa Diop, Mariama Ba..."
                />
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Saisissez votre vrai nom, il apparaîtra sur vos enregistrements.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Code d'accès secret
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  inputMode="numeric"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none pl-9 font-mono tracking-widest text-center font-bold text-base"
                  placeholder="••••"
                  autoComplete="current-password"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Le code secret détermine automatiquement vos droits (Agent ou Responsable).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Vérification...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
