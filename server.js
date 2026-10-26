const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Initialisation de la base de données
const INITIAL_DB = {
  stock: {
    initialStock: 500,
    entries: [],
    isClosed: false,
    closedAt: null,
    closedBy: null,
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

function getDB() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
    return INITIAL_DB;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    return INITIAL_DB;
  }
}

function saveDB(db) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_FILE);
}

function calcStock(db) {
  const initial = Number(db.stock.initialStock) || 0;
  const entriesTotal = (db.stock.entries || []).reduce((s, e) => s + (Number(e.quantity) || 0), 0);
  const morningDistributed = (db.morningDonations || [])
    .filter(d => d.confirmed)
    .reduce((s, d) => s + (Number(d.quantity) || 2), 0);
  const eveningDistributed = (db.eveningBeneficiaries || [])
    .filter(b => b.status === 'SERVI')
    .reduce((s, b) => s + (Number(b.quantityGiven) || 2), 0);
  const totalDistributed = morningDistributed + eveningDistributed;
  const remaining = initial + entriesTotal - totalDistributed;

  return { initial, entriesTotal, morningDistributed, eveningDistributed, totalDistributed, remaining, isClosed: !!db.stock.isClosed };
}

function addLog(db, user, action, details) {
  db.auditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: user || 'Utilisateur',
    action,
    details,
  });
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // API : GET /api/state
  if (req.method === 'GET' && pathname === '/api/state') {
    const db = getDB();
    const stockStats = calcStock(db);

    const morningConfirmed = (db.morningDonations || []).filter(d => d.confirmed);
    const morningByNeigh = {};
    morningConfirmed.forEach(d => {
      const q = d.neighborhood || 'Autre';
      morningByNeigh[q] = (morningByNeigh[q] || 0) + 1;
    });

    const eveningTotal = (db.eveningBeneficiaries || []).length;
    const eveningServed = (db.eveningBeneficiaries || []).filter(b => b.status === 'SERVI');
    const eveningCensusNeigh = {};
    const eveningServedNeigh = {};
    (db.eveningBeneficiaries || []).forEach(b => {
      const q = b.neighborhood || 'Autre';
      eveningCensusNeigh[q] = (eveningCensusNeigh[q] || 0) + 1;
      if (b.status === 'SERVI') eveningServedNeigh[q] = (eveningServedNeigh[q] || 0) + 1;
    });

    return sendJSON(res, {
      success: true,
      stock: { ...db.stock, ...stockStats },
      stats: {
        morning: {
          beneficiariesServed: morningConfirmed.length,
          mosquitoNetsDistributed: stockStats.morningDistributed,
          byNeighborhood: morningByNeigh,
        },
        evening: {
          totalCensus: eveningTotal,
          servedCount: eveningServed.length,
          pendingCount: eveningTotal - eveningServed.length,
          mosquitoNetsDistributed: stockStats.eveningDistributed,
          censusByNeighborhood: eveningCensusNeigh,
          servedByNeighborhood: eveningServedNeigh,
        },
        global: { ...stockStats },
      },
      morningDonations: db.morningDonations,
      eveningBeneficiaries: db.eveningBeneficiaries,
      auditLogs: db.auditLogs.slice(0, 50),
      users: db.users.map(({ pin, ...safe }) => safe),
      defaultEveningQty: db.defaultEveningQty || 2,
    });
  }

  // Traitement du corps JSON pour requêtes POST/PUT/PATCH
  let bodyStr = '';
  req.on('data', chunk => { bodyStr += chunk; });
  req.on('end', () => {
    let body = {};
    if (bodyStr) {
      try { body = JSON.parse(bodyStr); } catch (e) {}
    }

    // POST /api/auth/login
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const db = getDB();
      const u = (db.users || []).find(
        user => (user.username.toLowerCase() === (body.username || '').toLowerCase().trim()) && user.pin === (body.pin || '').trim()
      );
      if (!u) return sendJSON(res, { success: false, message: 'Identifiant ou PIN incorrect' }, 401);
      addLog(db, u.name, 'CONNEXION', `Connexion réussie sous rôle ${u.role}`);
      saveDB(db);
      const { pin, ...safe } = u;
      return sendJSON(res, { success: true, user: safe });
    }

    // POST /api/morning (Enregistrement don de sang)
    if (req.method === 'POST' && pathname === '/api/morning') {
      const db = getDB();
      const stockStats = calcStock(db);
      if (stockStats.isClosed) return sendJSON(res, { success: false, message: 'Opérations clôturées.' }, 403);
      if (!body.fullName || !body.phone || !body.neighborhood) {
        return sendJSON(res, { success: false, message: 'Champs obligatoires manquants.' }, 400);
      }
      if (stockStats.remaining < 2) {
        return sendJSON(res, { success: false, message: `Stock insuffisant (${stockStats.remaining} restant).` }, 400);
      }

      const cleanPhone = body.phone.replace(/\s+/g, '');
      const dup = (db.morningDonations || []).find(d => d.phone.replace(/\s+/g, '') === cleanPhone);
      if (dup && !body.forceDuplicate) {
        return sendJSON(res, {
          success: false,
          isDuplicateWarning: true,
          message: `Doublon détecté : ${dup.fullName} (${dup.phone}) a déjà été enregistré.`,
        }, 409);
      }

      const item = {
        id: `morn-${Date.now()}`,
        fullName: body.fullName.trim(),
        phone: body.phone.trim(),
        neighborhood: body.neighborhood.trim(),
        quantity: 2,
        date: new Date().toISOString(),
        agent: body.agentName || 'Agent Matin',
        confirmed: true,
      };
      db.morningDonations.unshift(item);
      addLog(db, item.agent, 'REMISE_MATIN', `Remise de 2 moustiquaires à ${item.fullName} (${item.phone}, ${item.neighborhood})`);
      saveDB(db);
      return sendJSON(res, { success: true, donation: item, message: `2 moustiquaires remises à ${item.fullName}.` });
    }

    // POST /api/evening (Ajout listes des chefs)
    if (req.method === 'POST' && pathname === '/api/evening') {
      const db = getDB();
      const items = body.single ? [body.single] : (body.beneficiaries || []);
      const added = [];
      items.forEach(it => {
        if (it.fullName && it.phone) {
          const b = {
            id: `eve-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            fullName: it.fullName.trim(),
            phone: it.phone.trim(),
            neighborhood: (it.neighborhood || 'S.M.SY 1').trim(),
            originChiefOrList: (it.originChiefOrList || 'Liste Chef').trim(),
            status: 'EN_ATTENTE',
            quantityGiven: 0,
            createdAt: new Date().toISOString(),
            createdBy: body.adminName || 'Admin',
            isExceptionalAdd: !!it.isExceptionalAdd,
          };
          db.eveningBeneficiaries.unshift(b);
          added.push(b);
        }
      });
      addLog(db, body.adminName || 'Admin', 'RECENSEMENT_SOIR', `${added.length} personne(s) ajoutée(s) à la liste.`);
      saveDB(db);
      return sendJSON(res, { success: true, count: added.length, message: `${added.length} personne(s) ajoutée(s).` });
    }

    // PUT /api/evening (Distribution podium)
    if (req.method === 'PUT' && pathname === '/api/evening') {
      const db = getDB();
      const stockStats = calcStock(db);
      if (stockStats.isClosed) return sendJSON(res, { success: false, message: 'Opérations clôturées.' }, 403);
      const b = (db.eveningBeneficiaries || []).find(item => item.id === body.id);
      if (!b) return sendJSON(res, { success: false, message: 'Bénéficiaire introuvable.' }, 404);
      if (b.status === 'SERVI') return sendJSON(res, { success: false, message: `DÉJÀ SERVI le ${new Date(b.servedAt).toLocaleTimeString()} !` }, 400);

      const qty = parseInt(body.quantity, 10);
      if (isNaN(qty) || qty <= 0) return sendJSON(res, { success: false, message: 'Quantité invalide.' }, 400);
      if (qty > stockStats.remaining) return sendJSON(res, { success: false, message: `Stock insuffisant (${stockStats.remaining} dispo).` }, 400);

      b.status = 'SERVI';
      b.quantityGiven = qty;
      b.servedAt = new Date().toISOString();
      b.servedBy = body.agentName || 'Agent Podium';
      addLog(db, b.servedBy, 'REMISE_SOIR', `${qty} moustiquaire(s) à ${b.fullName} (${b.phone})`);
      saveDB(db);
      return sendJSON(res, { success: true, beneficiary: b, message: `${qty} moustiquaire(s) remise(s) à ${b.fullName}.` });
    }

    // POST /api/stock (Ajout livraison)
    if (req.method === 'POST' && pathname === '/api/stock') {
      const db = getDB();
      const qty = parseInt(body.quantity, 10);
      if (isNaN(qty) || qty <= 0) return sendJSON(res, { success: false, message: 'Quantité invalide.' }, 400);
      db.stock.entries.push({
        id: `entry-${Date.now()}`,
        date: new Date().toISOString(),
        quantity: qty,
        reason: (body.reason || 'Livraison').trim(),
        addedBy: body.adminName || 'Admin',
      });
      addLog(db, body.adminName || 'Admin', 'ENTREE_STOCK', `+${qty} moustiquaires (${body.reason})`);
      saveDB(db);
      return sendJSON(res, { success: true, message: `${qty} moustiquaire(s) ajoutée(s) au stock.` });
    }

    // POST /api/close
    if (req.method === 'POST' && pathname === '/api/close') {
      const db = getDB();
      db.stock.isClosed = true;
      db.stock.closedAt = new Date().toISOString();
      db.stock.closedBy = body.adminName || 'Admin';
      addLog(db, db.stock.closedBy, 'CLOTURE_JOURNEE', `Clôture définitive. Motif: ${body.reason || 'Fin normale'}`);
      saveDB(db);
      return sendJSON(res, { success: true, message: 'Journée clôturée avec succès.' });
    }

    // Fichier autonome / page principale
    if (pathname === '/' || pathname === '/index.html' || pathname === '/standalone-app.html') {
      const htmlPath = path.join(__dirname, 'standalone-app.html');
      if (fs.existsSync(htmlPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(htmlPath));
      }
    }

    // Route par défaut 404
    sendJSON(res, { message: 'Route introuvable' }, 404);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur Pastef démarré sur http://localhost:${PORT}`);
  console.log(`Accessible depuis smartphone Android sur http://<IP_DU_PC>:${PORT}`);
});
