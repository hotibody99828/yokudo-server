// ==================================================
// YOKUDO HUB DATA SERVER (VPS)
// ទទួល Data ពី Checker + ផ្ដល់ Data ឲ្យ Hub
// ==================================================

const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// ==================================================
// DATA STORAGE (In-Memory)
// ==================================================
let serverData = {
    // ===== SEA2 Types =====
    "sea2_haki": [],
    "sea2_sword": [],
    "sea2_darkbeard": [],
    "sea2_cursed_captain": [],
    "sea2_core": [],
    "sea2_fruit": [],
    "sea2_berry": [],
    
    // ===== SEA3 Types =====
    "sea3_near_moon": [],
    "sea3_full_moon": [],
    "sea3_dough_king": [],
    "sea3_rip_indra": [],
    "sea3_cake_prince": [],
    "sea3_cake_queen": [],
    "sea3_elite_hunter": [],
    "sea3_soul_reaper": [],
    "sea3_castle": [],
    "sea3_tyrant": [],
    "sea3_mirage": [],
    "sea3_prehistoric": [],
    "sea3_kitsune": [],
    "sea3_haki": [],
    "sea3_fruit": [],
    "sea3_berry": []
};

// ==================================================
// AUTO CLEANUP (Age > 180s)
// ==================================================
setInterval(() => {
    const now = Date.now();
    for (const key in serverData) {
        serverData[key] = serverData[key].filter(item => {
            return (now - item.timeReceived) < 180000; // 180 seconds
        });
    }
}, 1000); // ពិនិត្យរៀងរាល់ 1 វិនាទី

// ==================================================
// POST /api/data - ទទួល Data ពី Checker
// ==================================================
app.post('/api/data', (req, res) => {
    const { type, jobid, players, extra } = req.body;
    
    if (!type || !jobid) {
        return res.status(400).json({ 
            error: 'Missing type or jobid' 
        });
    }
    
    if (!serverData[type]) {
        return res.status(400).json({ 
            error: `Invalid type: ${type}` 
        });
    }
    
    // ពិនិត្យថា JobID មានរួចហើយឬអត់
    const existing = serverData[type].find(item => item.jobid === jobid);
    if (existing) {
        // បើមានរួចហើយ → Update ពេលវេលា
        existing.timeReceived = Date.now();
        existing.players = players || existing.players;
        existing.extra = extra || existing.extra;
        return res.json({ success: true, updated: true });
    }
    
    // បើមិនទាន់មាន → បន្ថែមថ្មី
    serverData[type].push({
        jobid: jobid,
        players: players || 0,
        extra: extra || '',
        timeReceived: Date.now()
    });
    
    console.log(`[${type}] New data: ${jobid} (${players || 0} players)`);
    res.json({ success: true, message: 'Data received' });
});

// ==================================================
// GET /api/data/:type - ផ្ដល់ Data ឲ្យ Hub
// ==================================================
app.get('/api/data/:type', (req, res) => {
    const type = req.params.type;
    
    if (!serverData[type]) {
        return res.status(404).json({ 
            error: `Invalid type: ${type}` 
        });
    }
    
    const now = Date.now();
    const validData = serverData[type].filter(item => {
        return (now - item.timeReceived) < 180000; // 180s
    });
    
    res.json({
        type: type,
        count: validData.length,
        servers: validData.map(item => ({
            jobid: item.jobid,
            players: item.players,
            extra: item.extra,
            age: Math.floor((now - item.timeReceived) / 1000)
        }))
    });
});

// ==================================================
// GET /api/all - ផ្ដល់ Data ទាំងអស់
// ==================================================
app.get('/api/all', (req, res) => {
    const now = Date.now();
    const result = {};
    
    for (const key in serverData) {
        const validData = serverData[key].filter(item => {
            return (now - item.timeReceived) < 180000;
        });
        
        result[key] = validData.map(item => ({
            jobid: item.jobid,
            players: item.players,
            extra: item.extra,
            age: Math.floor((now - item.timeReceived) / 1000)
        }));
    }
    
    res.json(result);
});

// ==================================================
// GET /api/health - ពិនិត្យ Server
// ==================================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

// ==================================================
// DELETE /api/data/:type/:jobid - លុប Data
// ==================================================
app.delete('/api/data/:type/:jobid', (req, res) => {
    const { type, jobid } = req.params;
    
    if (!serverData[type]) {
        return res.status(404).json({ 
            error: `Invalid type: ${type}` 
        });
    }
    
    serverData[type] = serverData[type].filter(item => item.jobid !== jobid);
    res.json({ success: true, message: 'Data deleted' });
});

// ==================================================
// START SERVER
// ==================================================
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ YOKUDO HUB Data Server running on port ${port}`);
    console.log(`📡 Waiting for data from Checkers...`);
    console.log(`🌐 API: http://localhost:${port}`);
    console.log(`📋 Health Check: http://localhost:${port}/api/health`);
});