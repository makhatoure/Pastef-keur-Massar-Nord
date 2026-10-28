import { createClient } from '@supabase/supabase-js';
import { AppDatabase, StockData, MorningDonation, EveningBeneficiary, AuditLog, User } from './types';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vkjgroptpwdhxganhqiz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_vzUPyqJzuYGCX_kGChptow_i4a8iWKJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Utilise /tmp sur Vercel serverless ou data/ en local
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'pastef_data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_DB: AppDatabase = {
  stock: {
    initialStock: 500,
    entries: [],
    isClosed: false,
  },
  morningDonations: [],
  eveningBeneficiaries: [],
  auditLogs: [
    {
      id: 'init-1',
      timestamp: new Date().toISOString(),
      user: 'Système',
      action: 'INITIALISATION',
      details: 'Base de données initialisée pour la Cellule Pastef quartiers: S.M.SY 1/ D.S.2.E',
    },
  ],
  users: [
    { id: 'u-admin', username: 'admin', name: 'Administrateur Principal', role: 'ADMIN', pin: '2026' },
    { id: 'u-agent1', username: 'agent1', name: 'Agent Matin (Don de sang)', role: 'AGENT', pin: '1234' },
    { id: 'u-agent2', username: 'agent2', name: 'Agent Soir (Podium)', role: 'AGENT', pin: '1234' },
  ],
  defaultEveningQty: 2,
};

// Fonctions synchronisées avec Supabase
export async function getSupabaseState() {
  try {
    const results = await Promise.allSettled([
      supabase.from('stock_state').select('*').limit(1),
      supabase.from('stock_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('morning_donations').select('*').order('created_at', { ascending: false }),
      supabase.from('evening_beneficiaries').select('*').order('created_at', { ascending: false }),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('users').select('*'),
    ]);

    const stockRows: any = results[0].status === 'fulfilled' ? results[0].value?.data : null;
    const stockRow = stockRows && stockRows.length > 0 ? stockRows[0] : null;
    const resEntries: any = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
    const resMorn: any = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
    const resEve: any = results[3].status === 'fulfilled' ? results[3].value : { data: [] };
    const resLogs: any = results[4].status === 'fulfilled' ? results[4].value : { data: [] };
    const resUsers: any = results[5].status === 'fulfilled' ? results[5].value : { data: [] };

    const initial = stockRow?.initial_stock ?? 500;
    const entriesTotal = (resEntries.data || []).reduce((s: number, e: any) => s + (Number(e.quantity) || 0), 0);
    const morningDistributed = (resMorn.data || []).length * 2;
    const eveningDistributed = (resEve.data || [])
      .filter((b: any) => b.status === 'SERVI')
      .reduce((s: number, b: any) => s + (Number(b.quantity_given) || 2), 0);
    const totalDistributed = morningDistributed + eveningDistributed;
    const remaining = initial + entriesTotal - totalDistributed;

    return {
      success: true,
      stock: {
        initialStock: initial,
        initial,
        entriesTotal,
        morningDistributed,
        eveningDistributed,
        totalDistributed,
        remaining,
        isClosed: Boolean(stockRow?.is_closed),
        entries: (resEntries.data || []).map((e: any) => ({
          id: e.id,
          date: e.created_at,
          quantity: e.quantity,
          reason: e.reason,
          addedBy: e.added_by,
        })),
      },
      morningDonations: (resMorn.data || []).map((d: any) => ({
        id: d.id,
        fullName: d.full_name,
        phone: d.phone,
        neighborhood: d.neighborhood,
        quantity: d.quantity || 2,
        date: d.created_at,
        agent: d.agent,
        confirmed: true,
      })),
      eveningBeneficiaries: (resEve.data || []).map((b: any) => ({
        id: b.id,
        fullName: b.full_name,
        phone: b.phone,
        neighborhood: b.neighborhood,
        originChiefOrList: b.origin_chief_or_list,
        status: b.status,
        quantityGiven: b.quantity_given || 0,
        createdAt: b.created_at,
        createdBy: b.created_by,
        servedAt: b.served_at,
        servedBy: b.served_by,
      })),
      auditLogs: (resLogs.data || []).map((l: any) => ({
        id: l.id,
        timestamp: l.created_at,
        user: l.user_name,
        action: l.action,
        details: l.details,
      })),
      users: (resUsers.data || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
      })),
      defaultEveningQty: stockRow?.default_evening_qty ?? 2,
    };
  } catch (error) {
    console.error('Erreur Supabase, bascule fallback...', error);
    return null;
  }
}

export function getDatabase(): AppDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
      return INITIAL_DB;
    }

    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as AppDatabase;
  } catch (error) {
    return INITIAL_DB;
  }
}

export function saveDatabase(db: AppDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.warn('Sauvegarde locale ignorée sur système read-only');
  }
}

export function calculateStock(db: AppDatabase) {
  const initial = Number(db.stock.initialStock) || 0;
  const entriesTotal = db.stock.entries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
  const morningDistributed = db.morningDonations
    .filter(d => d.confirmed)
    .reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
  const eveningDistributed = db.eveningBeneficiaries
    .filter(b => b.status === 'SERVI')
    .reduce((sum, b) => sum + (Number(b.quantityGiven) || 0), 0);
  const totalDistributed = morningDistributed + eveningDistributed;
  const remaining = initial + entriesTotal - totalDistributed;

  return {
    initial,
    entriesTotal,
    morningDistributed,
    eveningDistributed,
    totalDistributed,
    remaining,
    isClosed: Boolean(db.stock.isClosed),
  };
}

export function addAuditLog(db: AppDatabase, user: string, action: string, details: string) {
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    user,
    action,
    details,
  };
  db.auditLogs.unshift(log);
}
