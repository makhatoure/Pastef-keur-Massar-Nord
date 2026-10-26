export type UserRole = 'ADMIN' | 'AGENT';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  pin: string;
}

export interface StockEntry {
  id: string;
  date: string;
  quantity: number;
  reason: string;
  addedBy: string;
}

export interface StockData {
  initialStock: number;
  entries: StockEntry[];
  isClosed: boolean;
  closedAt?: string;
  closedBy?: string;
}

export interface MorningDonation {
  id: string;
  fullName: string;
  phone: string;
  neighborhood: string;
  quantity: number; // Toujours 2
  date: string;
  agent: string;
  confirmed: boolean;
  notes?: string;
  history?: {
    action: string;
    by: string;
    date: string;
    reason: string;
    previousData: any;
  }[];
}

export type EveningStatus = 'EN_ATTENTE' | 'SERVI';

export interface EveningBeneficiary {
  id: string;
  fullName: string;
  phone: string;
  neighborhood: string;
  originChiefOrList: string;
  status: EveningStatus;
  quantityGiven: number; // Configurable au moment du don
  createdAt: string;
  createdBy: string;
  servedAt?: string;
  servedBy?: string;
  isExceptionalAdd?: boolean; // Ajout exceptionnel sur place autorisé par admin
  notes?: string;
  history?: {
    action: string;
    by: string;
    date: string;
    reason: string;
    previousData: any;
  }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface AppDatabase {
  stock: StockData;
  morningDonations: MorningDonation[];
  eveningBeneficiaries: EveningBeneficiary[];
  auditLogs: AuditLog[];
  users: User[];
  defaultEveningQty: number;
}
