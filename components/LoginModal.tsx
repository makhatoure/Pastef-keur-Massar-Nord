'use client';

import React, { useState } from 'react';
import { OFFICIAL_CELL_NAME } from './Navbar';
import { ShieldCheck, UserCheck, KeyRound, AlertCircle } from 'lucide-react';
import { User } from '@/lib/types';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('admin');
  const [pin, setPin] = useState('2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Échec de connexion');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const selectQuickAccount = (u: string, p: string) => {
    setUsername(u);
    setPin(p);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
        {/* En-tête officiel */}
        <div className="bg-emerald-700 text-white p-5 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl p-1.5 flex items-center justify-center mx-auto mb-2.5 shadow-md">
            <img src="/pastef-logo.png" alt="Pastef" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-base font-bold tracking-tight">{OFFICIAL_CELL_NAME}</h2>
          <p className="text-emerald-100 text-xs mt-1">Espace sécurisé de gestion de la journée</p>
        </div>

        <div className="p-5">
          {/* Sélection rapide de profil pour téléphone Android */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">Choisir un profil rapide :</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => selectQuickAccount('admin', '2026')}
                className={`p-2 rounded-xl border text-left text-xs transition flex items-center gap-2 ${
                  username === 'admin'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <div>
                  <div>Admin</div>
                  <div className="text-[10px] text-slate-500 font-normal">Code: 2026</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectQuickAccount('agent1', '1234')}
                className={`p-2 rounded-xl border text-left text-xs transition flex items-center gap-2 ${
                  username === 'agent1'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <UserCheck className="w-4 h-4 text-blue-600" />
                <div>
                  <div>Agent</div>
                  <div className="text-[10px] text-slate-500 font-normal">Code: 1234</div>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Identifiant</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                placeholder="ex: admin ou agent1"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Code PIN</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  inputMode="numeric"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none pl-9 font-mono tracking-widest"
                  placeholder="PIN"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Connexion en cours...' : 'Accéder à la plateforme'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
