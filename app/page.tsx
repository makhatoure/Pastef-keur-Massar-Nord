'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, MorningDonation, EveningBeneficiary, AuditLog } from '@/lib/types';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import LoginModal from '@/components/LoginModal';
import DashboardTab from '@/components/DashboardTab';
import MorningTab from '@/components/MorningTab';
import EveningTab from '@/components/EveningTab';
import StockTab from '@/components/StockTab';
import ReportsTab from '@/components/ReportsTab';
import AdminTab from '@/components/AdminTab';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Données de l'application
  const [stock, setStock] = useState<any>({
    initial: 500,
    entriesTotal: 0,
    morningDistributed: 0,
    eveningDistributed: 0,
    totalDistributed: 0,
    remaining: 500,
    isClosed: false,
    entries: [],
  });
  const [stats, setStats] = useState<any>(null);
  const [morningDonations, setMorningDonations] = useState<MorningDonation[]>([]);
  const [eveningBeneficiaries, setEveningBeneficiaries] = useState<EveningBeneficiary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<Omit<User, 'pin'>[]>([]);
  const [defaultEveningQty, setDefaultEveningQty] = useState(2);

  // Charger la session utilisateur sauvegardée localement
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pastef_user_session');
      if (saved) {
        const u = JSON.parse(saved);
        setCurrentUser(u);
        setActiveTab(u.role === 'ADMIN' ? 'dashboard' : 'morning');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fonction de rechargement des données de la plateforme
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setStock(data.stock);
        setStats(data.stats);
        setMorningDonations(data.morningDonations || []);
        setEveningBeneficiaries(data.eveningBeneficiaries || []);
        setAuditLogs(data.auditLogs || []);
        setUsers(data.users || []);
        setDefaultEveningQty(data.defaultEveningQty || 2);
      }
    } catch (error) {
      console.error('Erreur chargement données', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab(user.role === 'ADMIN' ? 'dashboard' : 'morning');
    try {
      localStorage.setItem('pastef_user_session', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('pastef_user_session');
    } catch (e) {
      console.error(e);
    }
  };

  if (!currentUser) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/90 text-slate-900 pb-16 md:pb-6">
      {/* Barre de navigation supérieure */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        remainingStock={stock?.remaining ?? 0}
        isClosed={Boolean(stock?.isClosed)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Contenu principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-700 mb-2" />
            <p className="text-xs font-medium">Chargement des données de la cellule...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardTab
                stats={stats}
                stock={stock}
                currentUser={currentUser}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'morning' && (
              <MorningTab
                donations={morningDonations}
                currentUser={currentUser}
                remainingStock={stock?.remaining ?? 0}
                isClosed={Boolean(stock?.isClosed)}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'evening' && (
              <EveningTab
                beneficiaries={eveningBeneficiaries}
                currentUser={currentUser}
                remainingStock={stock?.remaining ?? 0}
                isClosed={Boolean(stock?.isClosed)}
                defaultQty={defaultEveningQty}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'stock' && currentUser.role === 'ADMIN' && (
              <StockTab
                stock={stock}
                defaultEveningQty={defaultEveningQty}
                currentUser={currentUser}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'reports' && currentUser.role === 'ADMIN' && (
              <ReportsTab
                stats={stats}
                stock={stock}
                morningDonations={morningDonations}
                eveningBeneficiaries={eveningBeneficiaries}
                auditLogs={auditLogs}
                currentUser={currentUser}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'admin' && currentUser.role === 'ADMIN' && (
              <AdminTab
                users={users}
                auditLogs={auditLogs}
                currentUser={currentUser}
                onRefresh={fetchData}
              />
            )}
          </>
        )}
      </main>

      {/* Barre de navigation mobile inférieure (Pour smartphones Android) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
      />
    </div>
  );
}
