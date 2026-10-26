-- ==============================================================================
-- SCHÉMA SQL SUPABASE / POSTGRESQL
-- Plateforme : Cellule Pastef quartiers: S.M.SY 1/ D.S.2.E
-- ==============================================================================

-- 1. Table des utilisateurs et rôles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'AGENT')),
    pin TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table de gestion du stock central
CREATE TABLE IF NOT EXISTS stock_state (
    id INT PRIMARY KEY DEFAULT 1,
    initial_stock INT NOT NULL DEFAULT 500,
    default_evening_qty INT NOT NULL DEFAULT 2,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at TIMESTAMPTZ,
    closed_by TEXT
);

-- 3. Entrées / Livraisons de stock
CREATE TABLE IF NOT EXISTS stock_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quantity INT NOT NULL CHECK (quantity > 0),
    reason TEXT NOT NULL,
    added_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Module Matin : Don de sang
CREATE TABLE IF NOT EXISTS morning_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 2 CHECK (quantity = 2), -- Strictement 2 moustiquaires
    confirmed BOOLEAN NOT NULL DEFAULT TRUE,
    agent TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Module Soir : Distribution au Podium
CREATE TABLE IF NOT EXISTS evening_beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    origin_chief_or_list TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (status IN ('EN_ATTENTE', 'SERVI')),
    quantity_given INT NOT NULL DEFAULT 0,
    is_exceptional_add BOOLEAN DEFAULT FALSE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    served_by TEXT,
    served_at TIMESTAMPTZ
);

-- 6. Journal d'Audit et Traçabilité
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertion des comptes de démarrage
INSERT INTO users (username, name, role, pin) VALUES 
('admin', 'Administrateur Principal', 'ADMIN', '2026'),
('agent1', 'Agent Matin (Don de sang)', 'AGENT', '1234'),
('agent2', 'Agent Soir (Podium)', 'AGENT', '1234')
ON CONFLICT (username) DO NOTHING;

INSERT INTO stock_state (id, initial_stock, default_evening_qty, is_closed) 
VALUES (1, 500, 2, FALSE)
ON CONFLICT (id) DO NOTHING;
