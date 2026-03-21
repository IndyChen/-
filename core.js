// ==========================================
// 鳴潮矩陣編隊工具 v4.8.0 [核心運算模組]
// 檔案：core.js
// 職責：資料存取、數學推演、動態時間判定、雙引擎洗牌(DP+Beam)、專屬增傷
// ==========================================

// --- 0. 全域崩潰攔截系統 ---
let currentErrorInfo = null;

window.onerror = function(message, source, lineno, colno, error) {
    currentErrorInfo = { message: message, location: `${source} (行: ${lineno}, 列: ${colno})`, stack: error && error.stack ? error.stack.substring(0, 600) : '無堆疊追蹤', userAgent: navigator.userAgent, time: new Date().toLocaleString() };
    if (typeof showErrorModal === 'function') showErrorModal(currentErrorInfo);
    return false; 
};

window.addEventListener('unhandledrejection', function(event) {
    currentErrorInfo = { message: 'Promise 錯誤: ' + (event.reason ? event.reason.message || event.reason : '未知錯誤'), location: '非同步運算 (Async Rejection)', stack: event.reason && event.reason.stack ? event.reason.stack.substring(0, 600) : '無堆疊追蹤', userAgent: navigator.userAgent, time: new Date().toLocaleString() };
    if (typeof showErrorModal === 'function') showErrorModal(currentErrorInfo);
});

// --- 1. 全域狀態 (State) ---
let isSimp = false;
let dpsData = [];
let rotIdCounter = 0;
let ownedCharacters = new Set();
let checkedRotations = new Set();
let customStatsMap = {};
let diffStability = { '⚠️': 100, '⭐': 100, '🔵': 100, '🟩': 100, '🧩': 100 };
let bossHPMap = {};
let bossHPHistory = {};
let customRotations = [];
let savedLineups = [];

// 篩選器狀態
let show5Star = true, show4Star = true, showG1 = true, showG2 = true, showG3 = true;
let activePresetAttrs = new Set(); 
let activePresetGens = new Set();
let currentEditRotId = null;

// --- 2. 基礎工具 (Utils) ---
const t_cache = {}; 

function t(str) { 
    if (!isSimp || !str || typeof str !== 'string' || typeof phraseDict === 'undefined') return str; 
    if (t_cache[str]) return t_cache[str];
    
    let res = str;
    for (let [tw, cn] of phraseDict) {
        if (res.includes(tw)) {
            res = res.split(tw).join(cn);
        }
    }
    t_cache[str] = res;
    return res;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}

function safeStorageGet(key, fallback = null) {
    try { let item = localStorage.getItem(key); return item ? JSON.parse(item) : fallback; } catch(e) { return fallback; }
}

function safeStorageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
}

function clampHpPct(el) {
    if (el.value === '') return;
    let val = parseFloat(el.value);
    if (isNaN(val)) { el.value = ''; return; }
    if (val < 0) el.value = 0;
    if (val > 99.99) el.value = 99.99;
}

function getBase(n) { return ['光主', '暗主', '風主'].includes(n) ? '漂泊者' : n; }
function isOwned(n) { return ['光主', '暗主', '風主'].includes(n) ? ownedCharacters.has('漂泊者') : ownedCharacters.has(n); }

// ⚡ 動態設備算力測速器 (測試 50ms)
function getDeviceBenchmark() {
    let testStart = performance.now();
    let testOps = 0;
    let dummyArr = [1, 2, 3, 4, 5]; 
    while (performance.now() - testStart < 50) {
        for(let i=0; i<1000; i++) {
            let x = dummyArr[i % 5] * 1.5; 
            testOps++;
        }
    }
    let rawOpsPerSec = testOps * (1000 / 50);
    // 乘以 0.5 係數以高估運算時間，並設定 50 萬次為防呆底線
    return Math.max(500000, rawOpsPerSec * 0.5); 
}
// ==========================================
// 🛡️ 核心特權過濾器 (真正公平的策略引擎版)
// ==========================================
function getBestPossibleRots(c1, c2, c3, strategy = 'min') {
    let possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3 && checkedRotations.has(d.id));
    possibleRots.sort((a, b) => {
        let valA = strategy === 'max' ? getRotDpsRange(a).max : getRotDpsRange(a).min;
        let valB = strategy === 'max' ? getRotDpsRange(b).max : getRotDpsRange(b).min;
        
        if (valA !== valB) {
            return valB - valA; 
        } else {
            if (a.isUserCustom && !b.isUserCustom) return -1;
            if (!a.isUserCustom && b.isUserCustom) return 1;
            return 0;
        }
    });
    return possibleRots;
}

function getUniqueValidTeams(strategy = 'min') {
    let validTeams = dpsData.filter(d => checkedRotations.has(d.id) && isOwned(d.c1) && isOwned(d.c2) && isOwned(d.c3));
    let map = new Map();
    validTeams.forEach(t => {
        let key = `${t.c1}-${t.c2}-${t.c3}`;
        if (!map.has(key)) {
            map.set(key, t);
        } else {
            let existing = map.get(key);
            let valT = strategy === 'max' ? getRotDpsRange(t).max : getRotDpsRange(t).min;
            let valE = strategy === 'max' ? getRotDpsRange(existing).max : getRotDpsRange(existing).min;

            if (valT > valE) {
                map.set(key, t); 
            } else if (valT === valE && t.isUserCustom && !existing.isUserCustom) {
                map.set(key, t);
            }
        }
    });
    return Array.from(map.values());
}

// ==========================================
// --- 1.5 v4.8 核心：異步總機與冪函數擬合引擎 ---
// ==========================================
function yieldToMain() { return new Promise(resolve => setTimeout(resolve, 0)); }

function updateProgress(pct, text) {
    let container = document.getElementById('sim-progress-container');
    let bar = document.getElementById('sim-progress-bar');
    let label = document.getElementById('sim-progress-text');
    if (container) container.style.display = 'block';
    if (bar) bar.style.width = pct + '%';
    if (label) label.innerText = text;
}

const DEFAULT_CURVE_K = {
    "今汐": 0.25, "長離": 2.50, "卡卡羅": 2.50,
    "忌炎": 1.00, "暗主": 0.80, "安可": 0.80
};

// 📈 支援跨輪次精準殘血收尾 (v4.8 動態時間與首輪特化)
function getTtkFromMathCurve(hpToKill, baseDps, r_factor, lvlPenalty, mainC, rotId, timeSpentOnField = 0) {
    let d = dpsData.find(x => x.id === rotId);
    let isFirstRotation = (timeSpentOnField === 0);
    
    let rotTime = (isFirstRotation && d && d.firstDuration) ? d.firstDuration : ((d && d.duration) ? d.duration : 25);
    let baseTotalDmg = (isFirstRotation && d && d.firstTotalDmg) ? d.firstTotalDmg : ((d && d.totalDmg) ? d.totalDmg : (baseDps * rotTime));
    
    let totalDmgPerRot = baseTotalDmg * r_factor * lvlPenalty;
    
    if (isNaN(totalDmgPerRot) || totalDmgPerRot <= 0 || isNaN(hpToKill) || hpToKill <= 0) return 9999;

    let k = 1.0;
    if (customStatsMap[rotId] && customStatsMap[rotId].curveK !== undefined && customStatsMap[rotId].curveK !== null) {
        let parsedK = parseFloat(customStatsMap[rotId].curveK);
        if (!isNaN(parsedK)) k = (parsedK > 0) ? parsedK : 1.0; 
    } else if (DEFAULT_CURVE_K[mainC]) {
        k = DEFAULT_CURVE_K[mainC];
    }

    if (hpToKill >= totalDmgPerRot) {
        let fullRots = Math.floor(hpToKill / totalDmgPerRot);
        let remainderHp = hpToKill % totalDmgPerRot;
        if (remainderHp === 0) return fullRots * rotTime;
        let remainderTime = Math.pow(remainderHp / totalDmgPerRot, 1 / k) * rotTime;
        return (fullRots * rotTime) + remainderTime;
    } else {
        let targetDmgPct = hpToKill / totalDmgPerRot;
        if (targetDmgPct < 0.01) return targetDmgPct * rotTime; 
        let timePct = Math.pow(targetDmgPct, 1 / k); 
        return timePct * rotTime;
    }
}

// ⚔️ 統一的抗性與角色增傷計算器 (v4.8 專屬增傷標籤)
function getCombatMultiplier(env, teamAttr, mainC, bossIdx) {
    let isResisted = teamAttr && teamAttr === env.resTags[bossIdx - 1];
    let currentWeak = env.weakTags[bossIdx - 1] || "";
    // 支援輸入多個條件如 "熱熔,今汐"
    let isBuffed = currentWeak && (currentWeak.includes(teamAttr) || currentWeak.includes(mainC));
    
    let r_factor = isResisted ? (1 - env.resPenalty / 100) : 1;
    let b_factor = isBuffed ? (1 + (env.buffBonus || 30) / 100) : 1;
    
    return r_factor * b_factor;
}

// --- 3. 資料初始化與存取 (Data Init & Storage) ---
function initCoreData() {
    let savedLang = localStorage.getItem('ww_lang');
    isSimp = (savedLang === 'zh-CN' || savedLang === '"zh-CN"');

    // 📥 讀取內建排軸庫
    if (typeof teamDB !== 'undefined' && typeof charData !== 'undefined') {
        for (let c1 in teamDB) {
            teamDB[c1].forEach(tData => {
                dpsData.push({ 
                    id: 'rot_' + rotIdCounter++, 
                    c1: c1, c2: tData.c2, c3: tData.c3, 
                    dps: tData.dps, rot: tData.rot, diff: tData.diff, 
                    gen: charData[c1] ? charData[c1].gen : 1,
                    duration: tData.duration, totalDmg: tData.totalDmg, 
                    firstDuration: tData.firstDuration, firstTotalDmg: tData.firstTotalDmg 
                });
            });
        }
    }
    
    // 📥 讀取玩家自訂排軸
    customRotations = safeStorageGet('ww_custom_rotations_v2', []);
    customRotations.forEach(cr => {
        if(typeof charData !== 'undefined') {
            dpsData.push({ 
                id: 'custom_rot_' + cr.id, 
                c1: cr.c1, c2: cr.c2, c3: cr.c3, 
                dps: cr.dps, rot: cr.rot, diff: cr.diff, 
                gen: charData[getBase(cr.c1)] ? charData[getBase(cr.c1)].gen : 1, 
                isUserCustom: true,
                duration: cr.duration || 25, 
                totalDmg: cr.totalDmg || (cr.dps * (cr.duration || 25))
            });
        }
    });

    savedLineups = safeStorageGet('ww_saved_lineups', []);
    customStatsMap = safeStorageGet('ww_custom_stats', {});

    let parsedRoster = safeStorageGet('ww_roster', null);
    if (Array.isArray(parsedRoster)) {
        parsedRoster.forEach(name => { if (charData[name] || ['光主','暗主','風主'].includes(name)) ownedCharacters.add(name); });
    } else {
        ownedCharacters = new Set(Object.keys(charData));
    }

    let parsedRots = safeStorageGet('ww_rotations', null);
    if (Array.isArray(parsedRots)) {
        const validIds = new Set(dpsData.map(d => d.id));
        parsedRots.forEach(id => { if (validIds.has(id)) checkedRotations.add(id); });
    } else {
        checkedRotations = new Set(dpsData.map(d => d.id));
    }
}

function saveData() { 
    safeStorageSet('ww_roster', [...ownedCharacters]); 
    safeStorageSet('ww_rotations', [...checkedRotations]); 
    let teams = []; 
    document.querySelectorAll('#team-board tr').forEach(r => {
        if (!r.classList.contains('hidden-row')) {
            teams.push([...r.querySelectorAll('select.char-select')].map(s=>s.value));
        }
    }); 
    safeStorageSet('ww_teams', teams); 
}

function getEnvSettings() { 
    return { 
        scoreRatio: parseFloat(document.getElementById('env-ratio').value) || 10, 
        r1_hp: parseFloat(document.getElementById('env-r1').value) || 400.89, 
        r2_hp: parseFloat(document.getElementById('env-r2').value) || 783.56, 
        r3_hp: parseFloat(document.getElementById('env-r3').value) || 1384.9, 
        growth: (parseFloat(document.getElementById('env-growth').value) || 5) / 100, 
        transTime: parseFloat(document.getElementById('env-trans').value) || 1.5, 
        battleTime: parseFloat(document.getElementById('env-time').value) || 120, 
        resPenalty: parseFloat(document.getElementById('env-res').value) || 40,
        buffBonus: parseFloat(document.getElementById('env-buff') ? document.getElementById('env-buff').value : 30) || 30,
        pen110: parseFloat(document.getElementById('env-pen110').value) || 0.975, 
        pen120: parseFloat(document.getElementById('env-pen120').value) || 0.951,
        resTags: [
            document.getElementById('env-res-1') ? document.getElementById('env-res-1').value : "",
            document.getElementById('env-res-2') ? document.getElementById('env-res-2').value : "",
            document.getElementById('env-res-3') ? document.getElementById('env-res-3').value : "",
            document.getElementById('env-res-4') ? document.getElementById('env-res-4').value : ""
        ],
        weakTags: [
            document.getElementById('env-weak-1') ? document.getElementById('env-weak-1').value : "",
            document.getElementById('env-weak-2') ? document.getElementById('env-weak-2').value : "",
            document.getElementById('env-weak-3') ? document.getElementById('env-weak-3').value : "",
            document.getElementById('env-weak-4') ? document.getElementById('env-weak-4').value : ""
        ]
    }; 
}

// --- 4. 數學公式與王血量推演 (Math & Boss HP) ---
function initBossHPMap() {
    let env = getEnvSettings();
    bossHPMap = safeStorageGet('ww_boss_hp', {});
    bossHPHistory = safeStorageGet('ww_boss_hp_history', {});

    for (let r = 1; r <= 10; r++) { 
        for (let i = 1; i <= 4; i++) { 
            let key = `R${r}-${i}`; 
            if (!bossHPMap[key] || bossHPMap[key].isDefault) { 
                bossHPMap[key] = { value: (r === 1) ? env.r1_hp : (r === 2 && i === 1) ? 546.67 : (r === 2) ? env.r2_hp : (r === 3) ? env.r3_hp : env.r3_hp * (1 + env.growth * ((r - 4) * 4 + i)), isDefault: true }; 
            } 
        } 
    }
}

function getBaseEnvHP(r, index) { 
    let env = getEnvSettings(); 
    if (r === 1) return env.r1_hp; 
    if (r === 2) return index === 1 ? 546.67 : env.r2_hp; 
    if (r === 3) return env.r3_hp; 
    return env.r3_hp * (1 + env.growth * ((r - 4) * 4 + index)); 
}

function getBossMaxHP(r, index) { 
    let d = bossHPMap[`R${r}-${index}`];
    let safeValue = (d && d.value !== undefined) ? d.value : (typeof d === 'number' ? d : 400);
    return Math.max(0.1, safeValue); 
}

function getRotDpsRange(d) {
    let buffMult = customStatsMap[d.id] && customStatsMap[d.id].buff ? 1 + (customStatsMap[d.id].buff / 100) : 1;
    if (customStatsMap[d.id]) { 
        let s = customStatsMap[d.id]; 
        let max = s.dps * buffMult; 
        return { min: Math.max(0, max * (s.stability / 100)), max: max, isCustom: true }; 
    }
    let max = d.dps * buffMult; 
    if (max === 0) return { min: 0, max: 0, isCustom: false };
    let diffKey = d.diff.includes('⚠️') ? '⚠️' : d.diff.includes('⭐') ? '⭐' : d.diff.includes('🔵') ? '🔵' : d.diff.includes('🟩') ? '🟩' : '🧩';
    let stab = diffStability[diffKey] !== undefined ? diffStability[diffKey] : 100;
    return { min: Math.max(0, max * (stab / 100)), max: max, isCustom: false };
}

function getUsedCharacters() {
    let used = {}; 
    for(let n in charData) used[n] = 0;
    document.querySelectorAll('.char-select').forEach(s => { 
        if(s.value && s.closest('tr') && !s.closest('tr').classList.contains('hidden-row')) used[getBase(s.value)]++; 
    });
    return used;
}

function getMaxTeams(usedObj) {
    let baseRemains = {};
    for(let name of ownedCharacters) { 
        let b = getBase(name); 
        if(charData[b]) { let r = charData[b].max - (usedObj[b]||0); if(r>0) baseRemains[b] = r; } 
    }
    let counts = Object.values(baseRemains), teams = 0;
    while(counts.length >= 3) { counts.sort((a,b)=>b-a); counts[0]--; counts[1]--; counts[2]--; teams++; counts = counts.filter(c=>c>0); }
    return Math.min(16, teams);
}

// --- 5. 核心推演引擎 (The Simulation Engine) ---

function runMonteCarlo(expectedDps, rotId) {
    let stats = customStatsMap[rotId];
    if (!stats || stats.nukeCR === undefined || stats.nukeLoss === undefined) return null;
    
    let cr = parseFloat(stats.nukeCR);
    let loss = parseFloat(stats.nukeLoss);
    if (isNaN(cr) || isNaN(loss)) return null;

    cr = cr / 100;
    let rotTime = 25; 
    let expectedTotalDmg = expectedDps * rotTime;
    let minDmg = Infinity, maxDmg = 0;
    
    for (let i = 0; i < 10000; i++) {
        let dmgFluctuation = expectedTotalDmg * 0.03 * (Math.random() * 2 - 1);
        let runDmg = expectedTotalDmg + dmgFluctuation;
        if (Math.random() > cr) runDmg -= loss; 
        if (runDmg < minDmg) minDmg = runDmg;
        if (runDmg > maxDmg) maxDmg = runDmg;
    }
    return { min: Math.max(0.1, minDmg / rotTime), max: Math.max(0.1, maxDmg / rotTime) };
}

function runSimulations(env) {
    let simMode = document.getElementById('sim-mode') ? document.getElementById('sim-mode').value : 'auto';
    let mcMode = document.getElementById('mc-select') ? document.getElementById('mc-select').value : 'off';
    let results = { totalMatrixScoreMin: 0, totalMatrixScoreMax: 0, actualTotalScore: 0, totalManualBaseScore: 0, totalManualMaxScore: 0, simMode: simMode, rowsData: [] };

    let auto_r_min = 1, auto_idx_min = 1, auto_hp_min = getBossMaxHP(1, 1);
    let auto_r_max = 1, auto_idx_max = 1, auto_hp_max = getBossMaxHP(1, 1);
    let man_start_r = 1, man_start_idx = 1, man_start_hp_pct = 100;

    let getCumDmg = (r, idx, hpPct) => {
        let dmg = 0;
        for (let i = 1; i <= r; i++) {
            let maxJ = (i === r) ? idx : 4;
            for (let j = 1; j <= maxJ; j++) {
                let maxHp = getBossMaxHP(i, j);
                if (i === r && j === idx) dmg += maxHp * (1 - hpPct / 100); else dmg += maxHp;
            }
        }
        return dmg;
    };

    document.querySelectorAll('#team-board tr').forEach(row => {
        if (row.classList.contains('hidden-row')) return;
        
        let rowResult = { html: "-", valid: false };
        let ss = row.querySelectorAll('select.char-select');
        let c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value;
        let scoreInputVal = parseFloat(row.querySelector('.score-input').value);
        let ebR = row.querySelector('.end-boss-r').value;
        let ebIdx = row.querySelector('.end-boss-idx').value;
        let ebHp = row.querySelector('.end-boss-hp').value;
        
        let teamAttr = typeof charAttrMap !== 'undefined' ? charAttrMap[c1] : null;

        if (c1 && c2 && c3) {
            rowResult.valid = true;
            if (!isNaN(scoreInputVal)) results.actualTotalScore += scoreInputVal;

            if (simMode === 'auto') {
                let possibleRots = getBestPossibleRots(c1, c2, c3); 
                if (possibleRots.length > 0) {
                    let rotId = possibleRots[0].id;
                    let dpsRange = getRotDpsRange(possibleRots[0]);
                    
                    if (mcMode === 'on') {
                        let mcRes = runMonteCarlo(dpsRange.max, rotId);
                        if (mcRes) { dpsRange.min = mcRes.min; dpsRange.max = mcRes.max; }
                    }
                    
                    if (dpsRange.max <= 0) { 
                        rowResult.html = `<span style="color:#ff5252; font-weight:bold;">${t("DPS過低")}</span>`; 
                    } else {
                        let simulate = (hp, r, idx, baseDps, mainC) => {
                            let t_left = env.battleTime, dmg = 0, startStr = `R${r}-${idx}(${(hp/getBossMaxHP(r,idx)*100).toFixed(0)}%)`;
                            let loopGuard = 0;
                            
                            while (t_left > 0 && loopGuard < 50) {
                                loopGuard++;
                                let lvlPenalty = (r === 1) ? 1.0 : (r === 2 ? (env.pen110 || 1.0) : (env.pen120 || 1.0));
                                
                                // 🚀 統一增傷計算器
                                let r_factor = getCombatMultiplier(env, teamAttr, mainC, idx);
                                
                                let timeOnField = env.battleTime - t_left; 
                                let ttk = getTtkFromMathCurve(hp, baseDps, r_factor, lvlPenalty, mainC, rotId, timeOnField);

                                if (ttk <= t_left) { 
                                    dmg += hp; t_left -= (ttk + env.transTime); idx++; 
                                    if (idx > 4) { r++; idx = 1; } 
                                    hp = getBossMaxHP(r, idx); 
                                } else { 
                                    let d = dpsData.find(x => x.id === rotId);
                                    let isFirst = (timeOnField === 0);
                                    let rotTime = (isFirst && d && d.firstDuration) ? d.firstDuration : ((d && d.duration) ? d.duration : 25);
                                    let baseTotalDmg = (isFirst && d && d.firstTotalDmg) ? d.firstTotalDmg : ((d && d.totalDmg) ? d.totalDmg : (baseDps * rotTime));
                                    let true_eff_dps = Math.max(0.0001, (baseTotalDmg / rotTime) * r_factor * lvlPenalty);

                                    dmg += true_eff_dps * t_left; hp -= true_eff_dps * t_left; t_left = 0; 
                                }
                            }
                            return { hp, r, idx, dmg, endStr: `R${r}-${idx}(${(hp/getBossMaxHP(r,idx)*100).toFixed(0)}%)`, startStr };
                        };
                        
                        let resMin = simulate(auto_hp_min, auto_r_min, auto_idx_min, dpsRange.min, c1);
                        auto_hp_min = resMin.hp; auto_r_min = resMin.r; auto_idx_min = resMin.idx; 
                        results.totalMatrixScoreMin += resMin.dmg * env.scoreRatio;
                        
                        let resMax = simulate(auto_hp_max, auto_r_max, auto_idx_max, dpsRange.max, c1);
                        auto_hp_max = resMax.hp; auto_r_max = resMax.r; auto_idx_max = resMax.idx; 
                        results.totalMatrixScoreMax += resMax.dmg * env.scoreRatio;

                        rowResult.html = `<span style="color:#aaa;">${t('下限')}: </span><span style="color:var(--gold);">${resMin.startStr} ➔ ${resMin.endStr}</span><br><span style="color:#aaa;">${t('上限')}: </span><span style="color:var(--neon-green);">${resMax.startStr} ➔ ${resMax.endStr}</span><br><span style="color:var(--neon-purple); font-weight:bold; font-size:1.1em;">${Math.floor(resMin.dmg * env.scoreRatio).toLocaleString()} ~ ${Math.floor(resMax.dmg * env.scoreRatio).toLocaleString()} ${t('分')}</span>`;
                    }
                }
            } else if (simMode === 'manual') {
                let ebRInt = parseInt(ebR), ebIdxInt = parseInt(ebIdx), ebHpPct = parseFloat(ebHp);
                if (!isNaN(ebRInt) && !isNaN(ebIdxInt) && !isNaN(ebHpPct) && ebHpPct >= 0 && ebHpPct <= 99.99) {
                    let startDmg = getCumDmg(man_start_r, man_start_idx, man_start_hp_pct);
                    let endDmg = getCumDmg(ebRInt, ebIdxInt, ebHpPct);
                    let rowDmg = Math.max(0, endDmg - startDmg);
                    let baseScore = Math.floor(rowDmg * env.scoreRatio);
                    let stagesCleared = (ebRInt - man_start_r) * 4 + (ebIdxInt - man_start_idx);
                    let maxScore = baseScore + Math.max(0, stagesCleared * 100 + 50);
                    
                    results.totalManualBaseScore += baseScore; results.totalManualMaxScore += maxScore;
                    let startStr = `R${man_start_r}-${man_start_idx}(${man_start_hp_pct === 100 ? '100%' : t('剩')+man_start_hp_pct.toFixed(2)+'%'})`;
                    let endStr = `R${ebRInt}-${ebIdxInt}(${t('剩')}${ebHpPct.toFixed(2)}%)`;
                    
                    let confHtml = "";
                    if (!isNaN(scoreInputVal) && scoreInputVal > 0) {
                        let conf = Math.max(0, (1 - Math.abs(scoreInputVal - baseScore) / scoreInputVal) * 100);
                        let cColor = conf >= 80 ? "var(--neon-green)" : "#ff5252";
                        let cIcon = conf >= 80 ? "✅" : "⚠️";
                        confHtml = `<div style="margin-top: 5px; color:${cColor}; font-size:0.9em;">${cIcon} ${t('單排置信度')}: <strong>${conf.toFixed(1)}%</strong></div>`;
                        if (conf < 70) confHtml += `<div style="color:#ff5252; font-size:0.8em;">⚠️ ${t('偏差過大，請確認血量或實戰得分')}</div>`;
                    }
                    rowResult.html = `<div style="text-align: left; padding: 4px;"><div style="color:var(--neon-green); font-size: 1.05em;">✅ ${t('預估得分')}：<strong>${baseScore}</strong></div><div style="color:#aaa; font-size: 0.85em; margin: 4px 0;">📊 ${t('推演區間')}：${baseScore} ~ ${maxScore}</div><div style="color:var(--gold); font-size: 0.9em;">🎯 ${t('擊殺進度')}：<br>${startStr} ➔ ${endStr}</div>${confHtml}</div>`;
                    man_start_r = ebRInt; man_start_idx = ebIdxInt; man_start_hp_pct = ebHpPct;
                } else {
                    rowResult.html = `<span style="color:#ffaa00;">⚠️ ${t('需設定終點王與血量')}</span>`;
                }
            }
        }
        results.rowsData.push(rowResult);
    });

    return results;
}

// ==========================================
// 💎 DP 引擎核心數學邏輯 (狀態壓縮動態規劃)
// ==========================================
function runBitmaskDP(teams, env) {
    let n = teams.length;
    let numStates = 1 << n; 
    let dp = new Array(numStates).fill(null);
    dp[0] = { score: 0, r: 1, idx: 1, hp: getBossMaxHP(1, 1), seq: [] };

    for (let mask = 0; mask < numStates; mask++) {
        if (!dp[mask]) continue;
        let state = dp[mask];

        for (let i = 0; i < n; i++) {
            if (!(mask & (1 << i))) { 
                let nextMask = mask | (1 << i);
                let team = teams[i];
                let t_left = env.battleTime, dmgDone = 0;
                let tmp_r = state.r, tmp_idx = state.idx, tmp_hp = state.hp;
                let loopGuard = 0;

                while (t_left > 0 && loopGuard < 50) {
                    loopGuard++;
                    let lvlPenalty = (tmp_r === 1) ? 1.0 : (tmp_r === 2 ? (env.pen110 || 1.0) : (env.pen120 || 1.0));
                    
                    // 🚀 統一增傷計算器
                    let r_factor = getCombatMultiplier(env, team.teamAttr, team.c1, tmp_idx);
                    
                    let timeOnField = env.battleTime - t_left; 
                    let ttk = getTtkFromMathCurve(tmp_hp, team.calculatedMinDps, r_factor, lvlPenalty, team.c1, team.rotId, timeOnField);

                    if (ttk <= t_left) {
                        dmgDone += tmp_hp; t_left -= (ttk + env.transTime);
                        tmp_idx++; if (tmp_idx > 4) { tmp_r++; tmp_idx = 1; }
                        tmp_hp = getBossMaxHP(tmp_r, tmp_idx);
                    } else {
                        let d = dpsData.find(x => x.id === team.rotId);
                        let isFirst = (timeOnField === 0);
                        let rotTime = (isFirst && d && d.firstDuration) ? d.firstDuration : ((d && d.duration) ? d.duration : 25);
                        let baseTotalDmg = (isFirst && d && d.firstTotalDmg) ? d.firstTotalDmg : ((d && d.totalDmg) ? d.totalDmg : (team.calculatedMinDps * rotTime));
                        let true_eff_dps = Math.max(0.0001, (baseTotalDmg / rotTime) * r_factor * lvlPenalty);

                        dmgDone += true_eff_dps * t_left; tmp_hp -= true_eff_dps * t_left; t_left = 0;
                    }
                }

                let newScore = state.score + dmgDone;
                if (!dp[nextMask] || newScore > dp[nextMask].score) {
                    dp[nextMask] = { score: newScore, r: tmp_r, idx: tmp_idx, hp: tmp_hp, seq: [...state.seq, team] };
                }
            }
        }
    }
    return dp[numStates - 1].seq;
}

// --- 8. 進階推演與編隊功能 (雙引擎調度器) ---
async function reverseInferAndOptimize() {
    if (typeof isEngineRunning !== 'undefined' && isEngineRunning) return alert(t("⚠️ 引擎正在高載運算中，請稍候..."));
    if (typeof isEngineRunning === 'undefined') window.isEngineRunning = false;
    isEngineRunning = true;

    try {
        initBossHPMap(); 
        let env = getEnvSettings();
        let currentTeams = []; 
        let rows = document.querySelectorAll('#team-board tr');
        let start_r = 1, start_idx = 1, start_hp = getBossMaxHP(1, 1);
        
        rows.forEach((row) => {
            if (row.classList.contains('hidden-row')) return;
            let ss = row.querySelectorAll('select.char-select');
            let c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value;
            let scoreInput = row.querySelector('.score-input').value;
            let ebR = row.querySelector('.end-boss-r').value;
            let ebIdx = row.querySelector('.end-boss-idx').value;
            let ebHp = row.querySelector('.end-boss-hp').value;

            if (c1) { 
                let actualScore = parseFloat(scoreInput);
                let ebRInt = parseInt(ebR), ebIdxInt = parseInt(ebIdx), ebHpPct = parseFloat(ebHp);
                let calculatedMinDps = 0, rotId = null;
                let possibleRots = getBestPossibleRots(c1, c2, c3); 
                
                if (possibleRots.length > 0) rotId = possibleRots[0].id;
                let teamAttr = typeof charAttrMap !== 'undefined' ? charAttrMap[c1] : null;

                if (!isNaN(actualScore) && actualScore > 0 && possibleRots.length > 0) {
                    let dmg_left = actualScore / Math.max(0.0001, env.scoreRatio);
                    let kills = 0, effective_dmg_sum = 0, tmp_r = start_r, tmp_idx = start_idx, tmp_hp = start_hp, dmgDealtToKilledBosses = 0;
                    let loopGuard = 0;
                    
                    while (dmg_left > 0 && loopGuard < 50) {
                        loopGuard++;
                        let lvlPenalty = (tmp_r === 1) ? 1.0 : (tmp_r === 2 ? (env.pen110 || 1.0) : (env.pen120 || 1.0));
                        
                        // 🚀 統一增傷計算器
                        let r_factor = getCombatMultiplier(env, teamAttr, c1, tmp_idx);
                        if (r_factor <= 0) r_factor = 0.1;
                        let totalPenalty = r_factor * lvlPenalty;

                        if (dmg_left >= tmp_hp) { 
                            dmg_left -= tmp_hp; dmgDealtToKilledBosses += tmp_hp; effective_dmg_sum += (tmp_hp / totalPenalty); 
                            kills++; tmp_idx++; if (tmp_idx > 4) { tmp_r++; tmp_idx = 1; } 
                            tmp_hp = getBossMaxHP(tmp_r, tmp_idx); 
                        } else {
                            effective_dmg_sum += (dmg_left / totalPenalty);
                            if (!isNaN(ebRInt) && !isNaN(ebIdxInt) && !isNaN(ebHpPct) && ebRInt === tmp_r && ebIdxInt === tmp_idx) {
                                let dmgDoneToEndBoss = (actualScore / env.scoreRatio) - dmgDealtToKilledBosses;
                                let hp_factor = 1 - (ebHpPct / 100);
                                if (hp_factor <= 0) hp_factor = 0.0001; 
                                let calculatedTotalHP = dmgDoneToEndBoss / hp_factor;
                                bossHPHistory[`R${ebRInt}-${ebIdxInt}`] = bossHPHistory[`R${ebRInt}-${ebIdxInt}`] || [];
                                bossHPHistory[`R${ebRInt}-${ebIdxInt}`].push({ dmg: calculatedTotalHP, rawScore: actualScore });
                            }
                            tmp_hp -= dmg_left; dmg_left = 0;
                        }
                    }

                    let effective_time = env.battleTime - (kills * env.transTime);
                    let trueBaseDps = effective_time > 0 ? (effective_dmg_sum / effective_time) : 0;
                    
                    if (trueBaseDps > 0) { 
                        let currStats = customStatsMap[rotId] || { stability: null, buff: 0, dps: null }; 
                        let buffMult = 1 + ((currStats.buff || 0) / 100);
                        let restoredBaseDps = trueBaseDps / buffMult;
                        
                        let originalBaseDps = currStats.dps || possibleRots[0].dps;
                        let diffKey = possibleRots[0].diff.includes('⚠️') ? '⚠️' : possibleRots[0].diff.includes('⭐') ? '⭐' : possibleRots[0].diff.includes('🔵') ? '🔵' : possibleRots[0].diff.includes('🟩') ? '🟩' : '🧩';
                        let currentStab = (currStats.stability !== null && currStats.stability !== undefined) ? currStats.stability : (diffStability[diffKey] !== undefined ? diffStability[diffKey] : 100);
                        
                        let minDps = originalBaseDps * (currentStab / 100);
                        let maxDps = originalBaseDps;
                        let newDps = originalBaseDps, newStab = currentStab;

                        if (originalBaseDps <= 0) { 
                            newDps = restoredBaseDps; newStab = 100;
                        } else if (restoredBaseDps >= minDps && restoredBaseDps <= maxDps) { 
                            newDps = originalBaseDps; newStab = (restoredBaseDps / originalBaseDps) * 100; 
                        } else if (restoredBaseDps > maxDps) { 
                            newDps = restoredBaseDps; newStab = 100;
                        } else if (restoredBaseDps < minDps) { 
                            newDps = originalBaseDps; newStab = (restoredBaseDps / originalBaseDps) * 100; 
                        }
                        
                        // 🚀 核心修復：強制收束浮點數
                        newDps = parseFloat(newDps.toFixed(3));
                        newStab = parseFloat(newStab.toFixed(1));
                        
                        if(customStatsMap[rotId]) {
                            customStatsMap[rotId].dps = newDps; customStatsMap[rotId].stability = newStab;
                        } else {
                            customStatsMap[rotId] = { dps: newDps, stability: newStab, buff: 0 }; 
                        }
                        calculatedMinDps = trueBaseDps; 
                    } else if (rotId) { 
                        calculatedMinDps = getRotDpsRange(possibleRots[0]).min; 
                    }
                    
                    let sim_dmg = actualScore / Math.max(0.0001, env.scoreRatio), sim_r = start_r, sim_idx = start_idx, sim_hp = start_hp;
                    let simLoopGuard = 0;
                    while (sim_dmg >= sim_hp && simLoopGuard < 50) { 
                        simLoopGuard++; sim_dmg -= sim_hp; sim_idx++; 
                        if (sim_idx > 4) { sim_r++; sim_idx = 1; } 
                        sim_hp = getBossMaxHP(sim_r, sim_idx); 
                    }
                    if (sim_dmg > 0) sim_hp -= sim_dmg;
                    start_r = sim_r; start_idx = sim_idx; start_hp = sim_hp;

                } else if (rotId) {
                    calculatedMinDps = getRotDpsRange(possibleRots[0]).min;
                    let t_left = env.battleTime;
                    let simLoopGuard = 0;
                    while (t_left > 0 && simLoopGuard < 50) {
                        simLoopGuard++;
                        let lvlPenalty = (start_r === 1) ? 1.0 : (start_r === 2 ? (env.pen110 || 1.0) : (env.pen120 || 1.0));
                        
                        // 🚀 統一增傷計算器
                        let r_factor = getCombatMultiplier(env, teamAttr, c1, start_idx);
                        
                        let timeOnField = env.battleTime - t_left;
                        let ttk = getTtkFromMathCurve(start_hp, calculatedMinDps, r_factor, lvlPenalty, c1, rotId, timeOnField);

                        if (ttk <= t_left) { 
                            t_left -= (ttk + env.transTime); start_idx++; 
                            if (start_idx > 4) { start_r++; start_idx = 1; } 
                            start_hp = getBossMaxHP(start_r, start_idx); 
                        } else { 
                            let d = dpsData.find(x => x.id === rotId);
                            let isFirst = (timeOnField === 0);
                            let rotTime = (isFirst && d && d.firstDuration) ? d.firstDuration : ((d && d.duration) ? d.duration : 25);
                            let baseTotalDmg = (isFirst && d && d.firstTotalDmg) ? d.firstTotalDmg : ((d && d.totalDmg) ? d.totalDmg : (calculatedMinDps * rotTime));
                            let true_eff_dps = Math.max(0.0001, (baseTotalDmg / rotTime) * r_factor * lvlPenalty);

                            start_hp -= true_eff_dps * t_left; t_left = 0; 
                        }
                    }
                }

                currentTeams.push({ c1: c1, c2: c2, c3: c3, scoreInput: scoreInput, ebR: ebR, ebIdx: ebIdx, ebHp: ebHp, calculatedMinDps: calculatedMinDps, teamAttr: teamAttr, rotId: rotId });
            }
        });

        safeStorageSet('ww_custom_stats', customStatsMap);

        if (currentTeams.length > 0) {
            let maxAllowed = parseInt(document.getElementById('team-count-select').value) || 16;
            let fillFromDB = confirm(t("是否要從資料庫自動填補剩下的空位？"));
            let poolToPermute = [...currentTeams];

            if (fillFromDB) {
                let tempUsage = {};
                currentTeams.forEach(tData => {
                    let b1 = getBase(tData.c1), b2 = getBase(tData.c2), b3 = getBase(tData.c3);
                    tempUsage[b1] = (tempUsage[b1] || 0) + 1; tempUsage[b2] = (tempUsage[b2] || 0) + 1; tempUsage[b3] = (tempUsage[b3] || 0) + 1;
                });
                
                let validDBTeams = getUniqueValidTeams(); 
                validDBTeams.sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min); 
                
                for (let dbTeam of validDBTeams) {
                    if (poolToPermute.length >= maxAllowed) break;
                    let b1 = getBase(dbTeam.c1), b2 = getBase(dbTeam.c2), b3 = getBase(dbTeam.c3);
                    let limit1 = charData[b1]?.max || 1, limit2 = charData[b2]?.max || 1, limit3 = charData[b3]?.max || 1;
                    let u1 = tempUsage[b1] || 0, u2 = tempUsage[b2] || 0, u3 = tempUsage[b3] || 0;
                    
                    if (u1 < limit1 && u2 < limit2 && u3 < limit3 && b1 !== b2 && b1 !== b3 && b2 !== b3) {
                        let isDuplicate = poolToPermute.some(ct => ct.c1 === dbTeam.c1 && ct.c2 === dbTeam.c2 && ct.c3 === dbTeam.c3);
                        if (!isDuplicate) {
                            tempUsage[b1] = u1 + 1; tempUsage[b2] = u2 + 1; tempUsage[b3] = u3 + 1;
                            poolToPermute.push({
                                c1: dbTeam.c1, c2: dbTeam.c2, c3: dbTeam.c3, scoreInput: "", ebR: "", ebIdx: "", ebHp: "", 
                                calculatedMinDps: getRotDpsRange(dbTeam).min,
                                teamAttr: typeof charAttrMap !== 'undefined' ? charAttrMap[dbTeam.c1] : null,
                                rotId: dbTeam.id 
                            });
                        }
                    }
                }
            }

            let n = poolToPermute.length;
            let opsPerSec = getDeviceBenchmark(); 
            let dpTransitions = n * Math.pow(2, Math.max(0, n - 1)); 
            let estDpTimeSec = (dpTransitions / opsPerSec).toFixed(1);
            // 🚀 修復：補上警告字眼的翻譯綁定
            let dpWarning = (dpTransitions > 1000000) ? t(" (⚠️ 極高風險，可能卡死瀏覽器)") : "";

            let defaultBeamWidth = 500;
            let beamTransitions = n * n * defaultBeamWidth; 
            let estBeamTimeSec = (beamTransitions / opsPerSec).toFixed(1);

            // 🚀 修復：將變數抽離 t() 函數，確保精準匹配字典
            let msg = t("漂泊者，洗牌引擎準備就緒！目前候選隊伍數：") + `${n} ` + t("隊\n\n");
            msg += t("請選擇排軸演算法：\n");
            msg += `[1] 🤖 ` + t("智慧分流 (推薦)：N≤14用DP，N>14用束式\n");
            msg += `[2] 💎 ` + t("狀態壓縮 DP (保證絕對最佳解)：預估耗時 ") + `${estDpTimeSec} ` + t("秒") + `${dpWarning}\n`;
            msg += `[3] 🚀 ` + t("束式搜索 (極速逼近局部最佳解)：預估耗時 ") + `${estBeamTimeSec} ` + t("秒\n\n");
            msg += t("請輸入 1, 2 或 3：");

            let algoChoice = prompt(msg, "1");
            if (algoChoice === null) return; 

            let useDP = false;
            if (algoChoice === "2") useDP = true;
            else if (algoChoice === "3") useDP = false;
            else useDP = (n <= 14); 

            let bestSequence = [];

            if (useDP) {
                updateProgress(50, t(`啟動狀態壓縮 DP 引擎 (預估 `) + `${estDpTimeSec}` + t(` 秒)...`));
                await yieldToMain();
                bestSequence = runBitmaskDP(poolToPermute, env); 
            } else {
                let beamWidth = defaultBeamWidth;
                let widthChoice = prompt(t(`啟動束式搜索。\n請輸入搜尋深度 (Beam Width)。\n建議值：500。`), "500");
                if (widthChoice !== null && !isNaN(parseInt(widthChoice)) && parseInt(widthChoice) > 0) {
                    beamWidth = parseInt(widthChoice);
                }

                let states = [{ score: 0, sequence: [], remaining: poolToPermute, r: 1, idx: 1, hp: getBossMaxHP(1, 1) }];

                for (let step = 0; step < n; step++) {
                    updateProgress(Math.floor((step / n) * 100), t(`束式推演中 (`) + `${step+1}/${n}) - ` + t(`深度: `) + `${beamWidth}`);
                    await yieldToMain(); 

                    let nextStates = [];
                    for (let state of states) {
                        for (let i = 0; i < state.remaining.length; i++) {
                            let team = state.remaining[i];
                            let t_left = env.battleTime, dmgDone = 0, tmp_r = state.r, tmp_idx = state.idx, tmp_hp = state.hp;
                            let loopGuard = 0;

                            while (t_left > 0 && loopGuard < 50) {
                                loopGuard++;
                                let lvlPenalty = (tmp_r === 1) ? 1.0 : (tmp_r === 2 ? (env.pen110 || 1.0) : (env.pen120 || 1.0));
                                
                                // 🚀 統一增傷計算器
                                let r_factor = getCombatMultiplier(env, team.teamAttr, team.c1, tmp_idx);
                                
                                let timeOnField = env.battleTime - t_left;
                                let ttk = getTtkFromMathCurve(tmp_hp, team.calculatedMinDps, r_factor, lvlPenalty, team.c1, team.rotId, timeOnField);

                                if (ttk <= t_left) { 
                                    dmgDone += tmp_hp; t_left -= (ttk + env.transTime); tmp_idx++; 
                                    if (tmp_idx > 4) { tmp_r++; tmp_idx = 1; } 
                                    tmp_hp = getBossMaxHP(tmp_r, tmp_idx); 
                                } else { 
                                    let d = dpsData.find(x => x.id === team.rotId);
                                    let isFirst = (timeOnField === 0);
                                    let rotTime = (isFirst && d && d.firstDuration) ? d.firstDuration : ((d && d.duration) ? d.duration : 25);
                                    let baseTotalDmg = (isFirst && d && d.firstTotalDmg) ? d.firstTotalDmg : ((d && d.totalDmg) ? d.totalDmg : (team.calculatedMinDps * rotTime));
                                    let true_eff_dps = Math.max(0.0001, (baseTotalDmg / rotTime) * r_factor * lvlPenalty);

                                    dmgDone += true_eff_dps * t_left; tmp_hp -= true_eff_dps * t_left; t_left = 0; 
                                }
                            }

                            let newRemaining = state.remaining.filter((_, idx) => idx !== i);
                            nextStates.push({ score: state.score + dmgDone, sequence: [...state.sequence, team], remaining: newRemaining, r: tmp_r, idx: tmp_idx, hp: tmp_hp });
                        }
                    }
                    nextStates.sort((a, b) => b.score - a.score);
                    states = nextStates.slice(0, beamWidth);
                }
                bestSequence = states[0].sequence;
            }

            updateProgress(100, t('穿插最佳化完成！'));
            setTimeout(() => document.getElementById('sim-progress-container').style.display='none', 800);

            document.querySelectorAll('.char-select, .score-input, .end-boss-r, .end-boss-idx, .end-boss-hp').forEach(el => el.value = ""); 
            
            bestSequence.forEach((tData, index) => {
                if (index < maxAllowed && rows[index]) {
                    let row = rows[index];
                    let ss = row.querySelectorAll('select.char-select');
                    ss[0].innerHTML = `<option value="${tData.c1}">${tData.c1}</option>`; 
                    ss[1].innerHTML = `<option value="${tData.c2}">${tData.c2}</option>`; 
                    ss[2].innerHTML = `<option value="${tData.c3}">${tData.c3}</option>`;
                    ss[0].value = tData.c1; ss[1].value = tData.c2; ss[2].value = tData.c3;
                }
            });
            
            let successMsg = fillFromDB ? t("✅ 實戰反推與穿插最佳化完成，並已自動填補空位！") : t("✅ 實戰反推完成，已為您計算出能避開抗性與轉場浪費的最佳順序！");
            alert(successMsg);
        }
        updateTracker();

    } catch (err) {
        console.error("引擎運算發生錯誤:", err);
        alert(t("⚠️ 推演引擎發生未預期錯誤，請檢查資料格式是否正確。"));
    } finally {
        isEngineRunning = false;
        let progressContainer = document.getElementById('sim-progress-container');
        if (progressContainer) progressContainer.style.display = 'none';
    }
}

async function autoBuildMaxDpsTeams() {
    if (typeof isEngineRunning !== 'undefined' && isEngineRunning) return alert(t("⚠️ 引擎正在高載運算中，請稍候..."));
    if (typeof isEngineRunning === 'undefined') window.isEngineRunning = false;
    isEngineRunning = true;

    try {
        let maxAllowed = parseInt(document.getElementById('team-count-select').value) || 16;
        // 匹配字典字串
        let modeChoice = prompt(t("請選擇編制策略：\n輸入 1 ➔ 追求【下限穩定度最高】\n輸入 2 ➔ 追求【上限理論值最高】"), "1");
        if (modeChoice !== "1" && modeChoice !== "2") return;
        let strategy = modeChoice === "1" ? 'min' : 'max';

        let validTeams = getUniqueValidTeams(strategy); 
        if (validTeams.length === 0) return alert(t("沒有可用的排軸！請確認已勾選角色與排軸。"));

        let n = validTeams.length;
        let states = [{ score: 0, teams: [], usage: {} }];
        
        let teamsWithScore = [];
        for (let tData of validTeams) {
            let range = getRotDpsRange(tData);
            let score = strategy === 'min' ? range.min : range.max;
            if (score > 0) {
                teamsWithScore.push({ team: tData, score: score });
            }
        }
        teamsWithScore.sort((a, b) => b.score - a.score);
        
        // 🚀 新增：動態計算候選數量與預估耗時
        let totalCandidates = teamsWithScore.length;
        // 🚀 喚醒測速：一鍵編制因物件操作較多，將測速結果乘以 0.4 作為保守估計
        let opsPerSec = getDeviceBenchmark() * 0.4;
        let defaultBeamWidth = 500;
        let estTimeSec = ((totalCandidates * defaultBeamWidth) / opsPerSec).toFixed(1);
        if (parseFloat(estTimeSec) < 0.1) estTimeSec = "0.1";

        let widthMsg = t(`系統共篩選出 `) + totalCandidates + t(` 組有效候選隊伍。\n\n`) +
                       t(`請輸入搜尋深度 (Beam Width)。\n建議值：500 (預估耗時 `) + estTimeSec + t(` 秒)。\n(數值越大越精準，但耗時將線性增加)：`);
        
        let widthChoice = prompt(widthMsg, "500");
        let beamWidth = parseInt(widthChoice);
        if (isNaN(beamWidth) || beamWidth <= 0) beamWidth = 500;
        
        let stepCount = 0;
        let totalSteps = teamsWithScore.length;

        for (let {team, score} of teamsWithScore) {
            stepCount++;
            if (stepCount % 2 === 0) {
                updateProgress(Math.floor((stepCount / totalSteps) * 100), t(`從庫中篩選建構隊伍 (`) + `${stepCount}/${totalSteps})...`);
                await yieldToMain(); 
            }

            let nextStates = [];
            let b1 = getBase(team.c1), b2 = getBase(team.c2), b3 = getBase(team.c3);
            let limit1 = charData[b1]?.max || 1, limit2 = charData[b2]?.max || 1, limit3 = charData[b3]?.max || 1;
            
            for (let state of states) {
                if (state.teams.length < maxAllowed) {
                    let u1 = state.usage[b1] || 0, u2 = state.usage[b2] || 0, u3 = state.usage[b3] || 0;
                    if (u1 < limit1 && u2 < limit2 && u3 < limit3 && b1 !== b2 && b1 !== b3 && b2 !== b3) {
                        let newUsage = { ...state.usage };
                        newUsage[b1] = u1 + 1; newUsage[b2] = u2 + 1; newUsage[b3] = u3 + 1;
                        nextStates.push({ score: state.score + score, teams: [...state.teams, team], usage: newUsage });
                    }
                }
                nextStates.push(state);
            }
            nextStates.sort((a, b) => b.score - a.score);
            states = nextStates.slice(0, beamWidth);
        }
        
        updateProgress(100, t('自動編排完成！'));
        setTimeout(() => document.getElementById('sim-progress-container').style.display='none', 800);

        let finalOptimizedTeams = states[0].teams; 
        finalOptimizedTeams.reverse(); 

        document.querySelectorAll('.char-select, .score-input, .end-boss-hp, .end-boss-r, .end-boss-idx').forEach(el => el.value=""); 
        let rows = document.querySelectorAll('#team-board tr');
        
        finalOptimizedTeams.forEach((tData, index) => { 
            if(rows[index] && index < maxAllowed) { 
                let ss = rows[index].querySelectorAll('select.char-select'); 
                ss[0].innerHTML = `<option value="${tData.c1}">${tData.c1}</option>`; 
                ss[1].innerHTML = `<option value="${tData.c2}">${tData.c2}</option>`; 
                ss[2].innerHTML = `<option value="${tData.c3}">${tData.c3}</option>`; 
                ss[0].value = tData.c1; ss[1].value = tData.c2; ss[2].value = tData.c3; 
            } 
        });
        
        updateTracker(); 
        let strategyName = strategy === 'min' ? t('下限穩定度') : t('上限理論值');
        alert(t(`配置完成！目標：[`) + strategyName + t(`最高]。共組建 `) + finalOptimizedTeams.length + t(` 隊。`));
        
    } catch (err) {
        console.error("一鍵編制發生錯誤:", err);
        alert(t("⚠️ 引擎發生未預期錯誤，請重新整理後再試。"));
    } finally {
        isEngineRunning = false;
        let progressContainer = document.getElementById('sim-progress-container');
        if (progressContainer) progressContainer.style.display = 'none';
    }
}
