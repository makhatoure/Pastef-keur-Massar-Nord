import fs from 'fs';
import path from 'path';
import { AppDatabase, StockData, MorningDonation, EveningBeneficiary, AuditLog, User } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
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
    {
      id: 'u-admin',
      username: 'admin',
      name: 'Administrateur Principal',
      role: 'ADMIN',
      pin: '2026',
    },
    {
      id: 'u-agent1',
      username: 'agent1',
      name: 'Agent Matin (Don de sang)',
      role: 'AGENT',
      pin: '1234',
    },
    {
      id: 'u-agent2',
      username: 'agent2',
      name: 'Agent Soir (Podium)',
      role: 'AGENT',
      pin: '1234',
    },
  ],
  defaultEveningQty: 2,
};

export function getDatabase(): AppDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
    return INITIAL_DB;
  }

  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data) as AppDatabase;
    return parsed;
  } catch (error) {
    console.error('Erreur lecture DB, réinitialisation...', error);
    return INITIAL_DB;
  }
}

export function saveDatabase(db: AppDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Écriture atomique sécurisée
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

export function calculateStock(db: AppDatabase) {
  const initial = Number(db.stock.initialStock) || 0;
  const entriesTotal = db.stock.entries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
  
  // Matin : 2 moustiquaires par bénéficiaire confirmé
  const morningDistributed = db.morningDonations
    .filter(d => d.confirmed)
    .reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

  // Soir : quantité remise par bénéficiaire servi
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
