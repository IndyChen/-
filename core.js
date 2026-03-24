// ==========================================
// 鳴潮矩陣編隊工具 v4.8.3 [核心運算模組 - 智慧剪枝特化版]
// 檔案：core.js
// 職責：資料存取、數學推演、動態時間判定、雙引擎洗牌(DP+Beam)、專屬增傷、A*潛力估價、防呆機制
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

let show5Star = true, show4Star = true, showG1 = true, showG2 = true, showG3 = true;
let activePresetAttrs = new Set(); 
let activePresetGens = new Set();
let globalCharStats = {};
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
    return Math.max(500000, rawOpsPerSec * 0.5); 
}

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

// 🚀 動態計算真實總傷引擎 (修復版：全局套用穩定度)
function getEffectiveTotalDmg(d, rotId, isFirstRotation, currentDps, rotTime) {
    let dbTotalDmg = (isFirstRotation && d && d.firstTotalDmg) ? d.firstTotalDmg : ((d && d.totalDmg) ? d.totalDmg : null);
    
    // 💡 無論是否為自訂隊伍，將目前的 currentDps 換算為比例 (dpsRatio)，完美縮放爆發總傷！
    if (d && d.dps > 0) {
        let dpsRatio = currentDps / d.dps;
        return dbTotalDmg ? (dbTotalDmg * dpsRatio) : (currentDps * rotTime);
    }
    
    return dbTotalDmg ? dbTotalDmg : (currentDps * rotTime);
}

// 🚀 支援多點線性插值 (LUT) 的殘血推演演算法
function getTtkFromMathCurve(hpToKill, baseDps, r_factor, lvlPenalty, mainC, rotId, timeSpentOnField = 0) {
    let d = dpsData.find(x => x.id === rotId);
    let isFirstRotation = (timeSpentOnField === 0);
    
    let rotTime = (isFirstRotation && d && d.firstDuration) ? d.firstDuration : ((d && d.duration) ? d.duration : 25);
    let baseTotalDmg = getEffectiveTotalDmg(d, rotId, isFirstRotation, baseDps, rotTime);
    let totalDmgPerRot = baseTotalDmg * r_factor * lvlPenalty;
    
    if (isNaN(totalDmgPerRot) || totalDmgPerRot <= 0 || isNaN(hpToKill) || hpToKill <= 0) return 9999;

    let fullRots = Math.floor(hpToKill / totalDmgPerRot);
    let remainderHp = hpToKill % totalDmgPerRot;
    if (remainderHp === 0) return fullRots * rotTime;

    let targetDmgPct = remainderHp / totalDmgPerRot;
    if (targetDmgPct < 0.001) return targetDmgPct * rotTime; 

    let remainderTimePct = 0;

    if (customStatsMap && customStatsMap[rotId] && customStatsMap[rotId].curvePoints && customStatsMap[rotId].curvePoints.length >= 2) {
        let pts = customStatsMap[rotId].curvePoints;
        for (let i = 0; i < pts.length - 1; i++) {
            if (targetDmgPct >= pts[i].d && targetDmgPct <= pts[i+1].d) {
                let d_range = pts[i+1].d - pts[i].d;
                if (d_range <= 0) { remainderTimePct = pts[i].t; break; }
                let progress = (targetDmgPct - pts[i].d) / d_range;
                remainderTimePct = pts[i].t + progress * (pts[i+1].t - pts[i].t);
                break;
            }
        }
    } else {
        let k = 1.0;
        if (customStatsMap && customStatsMap[rotId] && customStatsMap[rotId].curveK !== undefined && customStatsMap[rotId].curveK !== null) {
            let parsedK = parseFloat(customStatsMap[rotId].curveK);
            if (!isNaN(parsedK)) k = (parsedK > 0) ? parsedK : 1.0; 
        } else if (DEFAULT_CURVE_K[mainC]) {
            k = DEFAULT_CURVE_K[mainC];
        }
        remainderTimePct = Math.pow(targetDmgPct, 1 / k);
    }

    return (fullRots * rotTime) + (remainderTimePct * rotTime);
}

function getCombatMultiplier(env, teamAttr, mainC, bossIdx) {
    let isResisted = teamAttr && teamAttr === env.resTags[bossIdx - 1];
    let currentWeak = env.weakTags[bossIdx - 1] || "";
    let isBuffed = currentWeak && (currentWeak.includes(teamAttr) || currentWeak.includes(mainC));
    
    let r_factor = isResisted ? (1 - env.resPenalty / 100) : 1;
    let b_factor = isBuffed ? (1 + (env.buffBonus || 30) / 100) : 1;
    
    return r_factor * b_factor;
}

// --- 3. 資料初始化與存取 (Data Init & Storage) ---
function initCoreData() {
    let savedLang = localStorage.getItem('ww_lang');
    isSimp = (savedLang === 'zh-CN' || savedLang === '"zh-CN"');

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
    //讀取全域角色參數存檔
    globalCharStats = safeStorageGet('ww_global_char_stats', {});
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

function getBossMaxHP(r, index) { 
    let d = bossHPMap[`R${r}-${index}`];
    let safeValue = (d && d.value !== undefined) ? d.value : (typeof d === 'number' ? d : 400);
    return Math.max(0.1, safeValue); 
}

// 🚀 數據主權劃分：嚴格區分實戰自訂與全局原生
function getRotDpsRange(d) {
    let buffMult = customStatsMap[d.id] && customStatsMap[d.id].buff ? 1 + (customStatsMap[d.id].buff / 100) : 1;

    if (customStatsMap[d.id]) { 
        let s = customStatsMap[d.id]; 
        let max = s.dps * buffMult; 
        let customStab = (s.stability !== undefined && s.stability !== null) ? s.stability : 100;
        return { min: Math.max(0, max * (customStab / 100)), max: max, isCustom: true }; 
    }

    let max = d.dps * buffMult; 
    if (max === 0) return { min: 0, max: 0, isCustom: false };
    
    let diffKey = d.diff.includes('⚠️') ? '⚠️' : d.diff.includes('⭐') ? '⭐' : d.diff.includes('🔵') ? '🔵' : d.diff.includes('🟩') ? '🟩' : '🧩';
    let globalStab = diffStability[diffKey] !== undefined ? diffStability[diffKey] : 100;
    
    return { min: Math.max(0, max * (globalStab / 100)), max: max, isCustom: false };
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

function runMonteCarlo(expectedDps, rotId) {
    // 1. 抓取該排軸的基本資料
    let rotData = dpsData.find(d => d.id === rotId);
    if (!rotData) return null;

    let stats = customStatsMap[rotId];

    // 2. 🌟 雙層架構：獲取暴擊率 (先看有沒有專屬覆寫，沒有就去抓全域角色白板)
    let getCr = (cName, overrideVal) => {
        // A. 若排軸有專屬覆寫值，絕對優先使用！
        if (overrideVal !== undefined && overrideVal !== "" && !isNaN(parseFloat(overrideVal))) {
            return parseFloat(overrideVal); 
        }
        // B. 若排軸留空，去抓角色清單的全域值
        if (!cName) return 0;
        let b = getBase(cName);
        return (globalCharStats[b] && globalCharStats[b].cr) ? globalCharStats[b].cr : 0; 
    };

    let cr1 = getCr(rotData.c1, stats?.mcCrit?.c1);
    let cr2 = getCr(rotData.c2, stats?.mcCrit?.c2);
    let cr3 = getCr(rotData.c3, stats?.mcCrit?.c3);
    
    // 如果三個角色的暴擊率（不論全域或覆寫）都沒填，就不跑蒙地卡羅
    if (cr1 === 0 && cr2 === 0 && cr3 === 0) return null;

    let rotTime = rotData.duration || 25; 
    let expectedTotalDmg = expectedDps * rotTime;
    
    // 3. 動態精算傷害佔比
    let share1 = 0.70, share2 = 0.20, share3 = 0.10; 

    if (rotData.isUserCustom) {
        let customId = rotId.replace('custom_rot_', '');
        let cr = customRotations.find(x => x.id == customId);
        
        if (cr && cr.gridData && cr.gridData.length > 0) {
            let dmg1 = 0, dmg2 = 0, dmg3 = 0, totalGridDmg = 0;
            cr.gridData.forEach(row => {
                let d = parseFloat(row.dmg) || 0;
                if (row.char === rotData.c1) dmg1 += d;
                else if (row.char === rotData.c2) dmg2 += d;
                else if (row.char === rotData.c3) dmg3 += d;
                totalGridDmg += d;
            });
            if (totalGridDmg > 0) {
                share1 = dmg1 / totalGridDmg;
                share2 = dmg2 / totalGridDmg;
                share3 = dmg3 / totalGridDmg;
            }
        }
    } 

    // 4. 設定爆傷參數與還原白字傷害
    let cdBonus = 1.5; // 爆傷加成 150%
    
    let getBaseDmg = (expectedShare, cr) => {
        if (cr === 0) return expectedShare;
        return expectedShare / (1 + (cr / 100) * cdBonus);
    };
    
    let base1 = getBaseDmg(expectedTotalDmg * share1, cr1);
    let base2 = getBaseDmg(expectedTotalDmg * share2, cr2);
    let base3 = getBaseDmg(expectedTotalDmg * share3, cr3);

    let minDmg = Infinity, maxDmg = 0;
    
    // 5. 執行 10,000 次蒙地卡羅模擬
    for (let i = 0; i < 10000; i++) {
        let hit1 = (Math.random() * 100 < cr1) ? base1 * (1 + cdBonus) : base1;
        let hit2 = (Math.random() * 100 < cr2) ? base2 * (1 + cdBonus) : base2;
        let hit3 = (Math.random() * 100 < cr3) ? base3 * (1 + cdBonus) : base3;
        
        let runDmg = hit1 + hit2 + hit3;
        
        if (runDmg < minDmg) minDmg = runDmg;
        if (runDmg > maxDmg) maxDmg = runDmg;
    }
    
    return { 
        min: Math.max(0.1, minDmg / rotTime), 
        max: Math.max(0.1, maxDmg / rotTime) 
    };
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
                    
                    // 🌟 1. 先抓出這條排軸原本的「穩定度折損比例」
                    let stabRate = (dpsRange.max > 0) ? (dpsRange.min / dpsRange.max) : 1;
                    
                    if (mcMode === 'on') {
                        let mcRes = runMonteCarlo(dpsRange.max, rotId);
                        if (mcRes) { 
                            // 🌟 2. 下限 = 臉最黑的基底傷害 × 手殘的穩定度折損
                            dpsRange.min = mcRes.min * stabRate; 
                            // 🌟 3. 上限 = 臉最白 (且假設完美操作不扣穩定度)
                            dpsRange.max = mcRes.max; 
                        }
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
                                    let baseTotalDmg = getEffectiveTotalDmg(d, rotId, isFirst, baseDps, rotTime);
                                    
                                    let true_eff_dps = Math.max(0.0001, (baseTotalDmg / rotTime) * r_factor * lvlPenalty);
                                    dmg += true_eff_dps * t_left; hp -= true_eff_dps * t_left; t_left = 0; 
                                }
                            }
                            return { hp, r, idx, dmg, endStr: `R${r}-${idx}(${(hp/getBossMaxHP(r,idx)*100).toFixed(0)}%)`, startStr };
                        };
                        
                        let resMin = simulate(auto_hp_min, auto_r_min, auto_idx_min, dpsRange.min, c1);
                        auto_hp_min = resMin.hp; auto_r_min = resMin.r; auto_idx_min = resMin.idx; 
                        
                        let resMax = simulate(auto_hp_max, auto_r_max, auto_idx_max, dpsRange.max, c1);
                        auto_hp_max = resMax.hp; auto_r_max = resMax.r; auto_idx_max = resMax.idx; 

                        // 🚀 強制校正「轉場懲罰」導致的上下限倒置異常
                        let safeMinDmg = Math.min(resMin.dmg, resMax.dmg);
                        let safeMaxDmg = Math.max(resMin.dmg, resMax.dmg);
                        
                        results.totalMatrixScoreMin += safeMinDmg * env.scoreRatio;
                        results.totalMatrixScoreMax += safeMaxDmg * env.scoreRatio;

                        rowResult.html = `<span style="color:#aaa;">${t('下限')}: </span><span style="color:var(--gold);">${resMin.startStr} ➔ ${resMin.endStr}</span><br><span style="color:#aaa;">${t('上限')}: </span><span style="color:var(--neon-green);">${resMax.startStr} ➔ ${resMax.endStr}</span><br><span style="color:var(--neon-purple); font-weight:bold; font-size:1.1em;">${Math.floor(safeMinDmg * env.scoreRatio).toLocaleString()} ~ ${Math.floor(safeMaxDmg * env.scoreRatio).toLocaleString()} ${t('分')}</span>`;
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
                        let baseTotalDmg = getEffectiveTotalDmg(d, team.rotId, isFirst, team.calculatedMinDps, rotTime);
                        
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
    return { seq: dp[numStates - 1].seq, score: dp[numStates - 1].score };
}

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
        
        let hasIncompleteScore = false; // 🚀 防呆標記
        let needsRebuild = false;       // 🚀 新增：標記是否需要重新渲染左側清單

        rows.forEach((row) => {
            if (row.classList.contains('hidden-row')) return;
            let ss = row.querySelectorAll('select.char-select');
            let c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value;
            let scoreInput = row.querySelector('.score-input').value;
            let ebR = row.querySelector('.end-boss-r').value;
            let ebIdx = row.querySelector('.end-boss-idx').value;
            let ebHp = row.querySelector('.end-boss-hp').value;
            
            // 抓取目前該行的排軸選單
            let rotSelect = row.querySelector('.rot-select');
            let rotId = rotSelect ? rotSelect.value : "";

            if (c1 && c2 && c3) { 
                let actualScore = parseFloat(scoreInput);
                
                // 🚀 防呆攔截：若選了主C卻未填寫分數或分數異常
                if (isNaN(actualScore) || actualScore <= 0) {
                    hasIncompleteScore = true;
                    return; 
                }

                // --- 🌟 核心修復：自動補全、配對與新建邏輯 ---
                let validRotId = rotId;

                // 1. 如果沒有選擇有效排軸 (空值或無預設)，執行自動配對或新建
                if (!validRotId || validRotId === "" || validRotId.includes("無預設") || validRotId.includes("無適配")) {
                    // 先找是否有現存的「自訂排軸」
                    let foundCustom = typeof customRotations !== 'undefined' ? customRotations.find(cr => cr.c1 === c1 && cr.c2 === c2 && cr.c3 === c3) : null;
                    if (foundCustom) {
                        validRotId = 'custom_rot_' + foundCustom.id;
                    } 
                    // 沒自訂，找「資料庫適配隊伍」
                    else if (window.teamDB && window.teamDB[c1]) {
                        let foundDB = window.teamDB[c1].find(db => db.c2 === c2 && db.c3 === c3);
                        if (foundDB) validRotId = `db_rot_${c1}_${c2}_${c3}_${foundDB.rot}`;
                    }

                    // 2. 如果對不上任何資料，直接加進自訂並給予代號
                    if (!validRotId && typeof addCustomRotation === 'function') {
                        validRotId = addCustomRotation(c1, c2, c3, 0, "🧩");
                        needsRebuild = true;
                    }
                }

                // 3. 確保該排軸與對應角色處於「已勾選並啟用」狀態
                if (validRotId && !checkedRotations.has(validRotId)) {
                    checkedRotations.add(validRotId);
                    ownedCharacters.add(getBase(c1));
                    ownedCharacters.add(getBase(c2));
                    ownedCharacters.add(getBase(c3));
                    safeStorageSet('ww_rotations', [...checkedRotations]);
                    safeStorageSet('ww_roster', [...ownedCharacters]);
                    needsRebuild = true;
                }

                // 4. 防呆更新 UI：把剛配對到(或新建)的 ID 塞進這行的 select 裡面，避免存錯
                if (rotSelect && validRotId !== rotId) {
                    if (![...rotSelect.options].some(opt => opt.value === validRotId)) {
                        rotSelect.innerHTML += `<option value="${validRotId}">${t("自動啟用排軸")}</option>`;
                    }
                    rotSelect.value = validRotId;
                }

                rotId = validRotId; // 將後續運算的目標鎖定為我們找到的正確 ID
                // --------------------------------------------------------

                let ebRInt = parseInt(ebR), ebIdxInt = parseInt(ebIdx), ebHpPct = parseFloat(ebHp);
                let calculatedMinDps = 0;
                let possibleRots = getBestPossibleRots(c1, c2, c3); 
                let teamAttr = typeof charAttrMap !== 'undefined' ? charAttrMap[c1] : null;

                if (actualScore > 0 && rotId) {
                    let dmg_left = actualScore / Math.max(0.0001, env.scoreRatio);
                    let kills = 0, effective_dmg_sum = 0, tmp_r = start_r, tmp_idx = start_idx, tmp_hp = start_hp, dmgDealtToKilledBosses = 0;
                    let loopGuard = 0;
                    
                    while (dmg_left > 0 && loopGuard < 50) {
                        loopGuard++;
                        let lvlPenalty = (tmp_r === 1) ? 1.0 : (tmp_r === 2 ? (env.pen110 || 1.0) : (env.pen120 || 1.0));
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
                        
                        let fallbackOriginal = possibleRots.length > 0 ? possibleRots[0].dps : 1;
                        let originalBaseDps = currStats.dps || fallbackOriginal;
                        
                        let diffKey = '⭐';
                        if (possibleRots.length > 0) {
                            diffKey = possibleRots[0].diff.includes('⚠️') ? '⚠️' : possibleRots[0].diff.includes('⭐') ? '⭐' : possibleRots[0].diff.includes('🔵') ? '🔵' : possibleRots[0].diff.includes('🟩') ? '🟩' : '🧩';
                        }
                        
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
                        
                        newDps = parseFloat(newDps.toFixed(3));
                        newStab = parseFloat(newStab.toFixed(1));
                        
                        if(customStatsMap[rotId]) {
                            customStatsMap[rotId].dps = newDps; customStatsMap[rotId].stability = newStab;
                        } else {
                            customStatsMap[rotId] = { dps: newDps, stability: newStab, buff: 0 }; 
                        }
                        
                        // 🌟 新增：同步更新全局 dpsData 與自訂資料庫，避免重新整理後失憶
                        let targetRot = typeof dpsData !== 'undefined' ? dpsData.find(d => d.id === rotId) : null;
                        if (targetRot) {
                            targetRot.dps = newDps;
                            if (targetRot.isUserCustom) {
                                let customId = rotId.replace('custom_rot_', '');
                                let customTarget = typeof customRotations !== 'undefined' ? customRotations.find(cr => cr.id == customId) : null;
                                if (customTarget) {
                                    customTarget.dps = newDps;
                                    if (customTarget.duration) customTarget.totalDmg = newDps * customTarget.duration;
                                    safeStorageSet('ww_custom_rotations_v2', customRotations);
                                }
                            }
                        }

                        calculatedMinDps = trueBaseDps; 
                    } else if (rotId) { 
                        calculatedMinDps = possibleRots.length > 0 ? getRotDpsRange(possibleRots[0]).min : 0; 
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
                    calculatedMinDps = possibleRots.length > 0 ? getRotDpsRange(possibleRots[0]).min : 0;
                    let t_left = env.battleTime;
                    let simLoopGuard = 0;
                    while (t_left > 0 && simLoopGuard < 50) {
                        simLoopGuard++;
                        let lvlPenalty = (start_r === 1) ? 1.0 : (start_r === 2 ? (env.pen110 || 1.0) : (env.pen120 || 1.0));
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
                            let baseTotalDmg = getEffectiveTotalDmg(d, rotId, isFirst, calculatedMinDps, rotTime);

                            let true_eff_dps = Math.max(0.0001, (baseTotalDmg / rotTime) * r_factor * lvlPenalty);
                            start_hp -= true_eff_dps * t_left; t_left = 0; 
                        }
                    }
                }

                currentTeams.push({ c1: c1, c2: c2, c3: c3, scoreInput: scoreInput, ebR: ebR, ebIdx: ebIdx, ebHp: ebHp, calculatedMinDps: calculatedMinDps, teamAttr: teamAttr, rotId: rotId });
            }
        });

        // 🌟 處理完所有列後，若觸發了自動新增或勾選，重新渲染
        if (needsRebuild && typeof renderRotations === 'function') {
            renderRotations();
            if (typeof updateTracker === 'function') updateTracker();
        }

        // 🚀 防呆執行
        if (hasIncompleteScore) {
            isEngineRunning = false;
            let progressContainer = document.getElementById('sim-progress-container');
            if (progressContainer) progressContainer.style.display = 'none';
            return alert(t("⚠️ 發現已選擇角色但未填寫【實戰得分】的隊伍！\n\n實戰洗牌反推需要精確的分數。如果您希望系統自動填補該空位，請將該列的主C選單改回 (空白)。"));
        }

        if (currentTeams.length === 0) {
            alert(t("⚠️ 沙盤中目前沒有隊伍！請先在上方編排至少一組隊伍並填寫實戰得分，再執行實戰洗牌反推。"));
            isEngineRunning = false;
            let progressContainer = document.getElementById('sim-progress-container');
            if (progressContainer) progressContainer.style.display = 'none';
            return;
        }

        safeStorageSet('ww_custom_stats', customStatsMap);

        let maxAllowed = parseInt(document.getElementById('team-count-select').value) || 16;
        
        // 🚀 讀心式暗示判定填補空位
        let fillFromDB = (currentTeams.length < maxAllowed);
        
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
                            calculatedMinDps: getRotDpsRange(dbTeam).min, // 🚀 統一排隊基準戰力
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
        let dpWarning = (dpTransitions > 1000000) ? t(" (⚠️ 運算時間可能過長)") : "";

        // 🚀 動態二次方深度估算
        let defaultBeamWidth = Math.min(8000, Math.max(1000, Math.floor(500 + 0.5 * Math.pow(n, 2))));
        let beamTransitions = n * n * defaultBeamWidth; 
        let estBeamTimeSec = (beamTransitions / opsPerSec).toFixed(1);

        let msg = t("目前排兵候選隊伍數：") + `${n} ` + t("隊\n\n");
        msg += t("請選擇推演演算法：\n");
        msg += `[1] 🤖 ` + t("智慧分流 (推薦：N≤14用DP，N>14用束式)\n");
        msg += `[2] 💎 ` + t("狀態壓縮 DP (全域搜尋)：預估耗時 ") + `${estDpTimeSec} ` + t("秒") + `${dpWarning}\n`;
        msg += `[3] 🚀 ` + t("束式搜索 (局部最佳化)：預估耗時 ") + `${estBeamTimeSec} ` + t("秒\n\n");
        msg += t("請輸入 1, 2 或 3：");

        let algoChoice = prompt(msg, "1");
        if (algoChoice === null) {
            isEngineRunning = false;
            let progressContainer = document.getElementById('sim-progress-container');
            if (progressContainer) progressContainer.style.display = 'none';
            return; 
        }

        let useDP = false;
        if (algoChoice === "2") useDP = true;
        else if (algoChoice === "3") useDP = false;
        else useDP = (n <= 14); 

        let bestSequence = [];
        let bestSimDmg = 0;
        let engineStartTime = Date.now();
        let maxStatesReached = 0;
        let finalBeamWidth = defaultBeamWidth;

        if (useDP) {
            updateProgress(50, t(`啟動狀態壓縮 DP 引擎 (預估 `) + `${estDpTimeSec}` + t(` 秒)...`));
            await yieldToMain();
            let dpRes = runBitmaskDP(poolToPermute, env); 
            bestSequence = dpRes.seq;
            bestSimDmg = dpRes.score;
        } else {
            let widthChoice = prompt(t(`啟動束式搜索。\n請輸入搜尋深度 (Beam Width)。\n建議值：`) + defaultBeamWidth + t(` (已自動推估)。`), defaultBeamWidth.toString());
            if (widthChoice !== null && !isNaN(parseInt(widthChoice)) && parseInt(widthChoice) > 0) {
                finalBeamWidth = parseInt(widthChoice);
            }

            let states = [{ score: 0, evalScore: 0, sequence: [], remaining: poolToPermute, r: 1, idx: 1, hp: getBossMaxHP(1, 1) }];

            for (let step = 0; step < n; step++) {
                updateProgress(Math.floor((step / n) * 100), t(`推演中 (`) + `${step+1}/${n})...`);
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
                                let baseTotalDmg = getEffectiveTotalDmg(d, team.rotId, isFirst, team.calculatedMinDps, rotTime);

                                let true_eff_dps = Math.max(0.0001, (baseTotalDmg / rotTime) * r_factor * lvlPenalty);
                                dmgDone += true_eff_dps * t_left; tmp_hp -= true_eff_dps * t_left; t_left = 0; 
                            }
                        }

                        let newRemaining = state.remaining.filter((_, idx) => idx !== i);
                        
                        // 🚀 A* 潛力估價
                        let heuristic = newRemaining.reduce((sum, t) => sum + (t.calculatedMinDps * 25 * (env.scoreRatio || 10)), 0);
                        
                        nextStates.push({ 
                            score: state.score + dmgDone, 
                            evalScore: state.score + dmgDone + heuristic,
                            sequence: [...state.sequence, team], 
                            remaining: newRemaining, 
                            r: tmp_r, idx: tmp_idx, hp: tmp_hp 
                        });
                    }
                }
                
                nextStates.sort((a, b) => b.evalScore - a.evalScore);
                if (nextStates.length > maxStatesReached) maxStatesReached = nextStates.length;
                
                let bestEval = nextStates.length > 0 ? nextStates[0].evalScore : 0;
                let threshold = bestEval * 0.85; 

                let diverseStates = []; let teamUsageCount = {}; let added = new Set();
                for (let i = 0; i < nextStates.length; i++) {
                    let state = nextStates[i];
                    
                    if (state.evalScore < threshold && diverseStates.length >= finalBeamWidth * 0.2) break;

                    let lastTeamId = state.sequence.length > 0 ? state.sequence[state.sequence.length-1].rotId : 'none';
                    teamUsageCount[lastTeamId] = (teamUsageCount[lastTeamId] || 0) + 1;
                    
                    if (finalBeamWidth > 100000) {
                        diverseStates.push(state); added.add(state);
                    } else {
                        if (teamUsageCount[lastTeamId] < finalBeamWidth * 0.2 || diverseStates.length < finalBeamWidth * 0.1) {
                            diverseStates.push(state); added.add(state);
                        }
                    }
                    if (diverseStates.length >= finalBeamWidth) break;
                }
                
                if (diverseStates.length < finalBeamWidth) {
                    for (let i = 0; i < nextStates.length && diverseStates.length < finalBeamWidth; i++) {
                        if (!added.has(nextStates[i])) diverseStates.push(nextStates[i]);
                    }
                }
                states = diverseStates; 
            }
            bestSequence = states[0].sequence;
            bestSimDmg = states[0].score;
        }

        updateProgress(100, t('最佳化排序完成！'));
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
        
        let simModeEl = document.getElementById('sim-mode'); if (simModeEl && simModeEl.value !== 'auto') simModeEl.value = 'auto';
        updateTracker(); 

        let finalSimRes = runSimulations(env); 
        
        // 🚀 終極防護：確保最終輸出的總分不出現倒置
        let rawMin = Math.floor(finalSimRes.totalMatrixScoreMin);
        let rawMax = Math.floor(finalSimRes.totalMatrixScoreMax);
        let estMinScore = Math.min(rawMin, rawMax);
        let estMaxScore = Math.max(rawMin, rawMax);

        let successMsg = fillFromDB ? t("解析完成。已將現有隊伍重新排序並填補剩餘空位。") : t("解析完成。已計算出能避開抗性與轉場的最佳出戰順序。");
        successMsg += `\n\n🎯 預估矩陣總分 (上限)：${estMaxScore.toLocaleString()} 分`;
        successMsg += `\n🛡️ 預估最差保底 (下限)：${estMinScore.toLocaleString()} 分\n`;

        let calcTimeSec = ((Date.now() - engineStartTime) / 1000).toFixed(2);
        successMsg += `\n📊 運算觀測報告：\n`;
        successMsg += `- 實際運算耗時：${calcTimeSec} 秒\n`;
        
        if (!useDP) {
            successMsg += `- 運算模式：智慧容差剪枝 (動態閾值)\n`;
            successMsg += `- 設定最大深度：${finalBeamWidth}\n`;
            successMsg += `- 實際最大分支：${maxStatesReached.toLocaleString()}\n`;
            if (maxStatesReached <= finalBeamWidth) successMsg += `✨ 狀態：運算資源充足，已涵蓋有效潛力範圍內的所有組合。`;
            else successMsg += `⚠️ 狀態：已觸發截斷機制。此為設定深度下之最佳近似解。`;
        } else {
            successMsg += `✨ 狀態：狀態壓縮 DP 執行完畢，已涵蓋全域最佳解。`;
        }
        alert(successMsg);
        
        if (typeof renderRotations === 'function') renderRotations();

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
        let modeChoice = prompt(t("請選擇編制策略：\n輸入 1 ➔ 追求【下限穩定度最高】\n輸入 2 ➔ 追求【上限理論值最高】"), "1");
        if (modeChoice !== "1" && modeChoice !== "2") {
            isEngineRunning = false; return;
        }
        let strategy = modeChoice === "1" ? 'min' : 'max';

        let validTeams = getUniqueValidTeams(strategy); 
        if (validTeams.length === 0) {
            isEngineRunning = false; return alert(t("沒有可用的排軸！請確認已勾選角色與排軸。"));
        }

        let states = [{ minScore: 0, maxScore: 0, score: 0, evalScore: 0, teams: [], usage: {} }];
        let maxStatesReached = 0; 
        let teamsWithScore = [];
        
        for (let tData of validTeams) {
            let range = getRotDpsRange(tData);
            if (range.max > 0) teamsWithScore.push({ team: tData, minScore: range.min, maxScore: range.max });
        }
        teamsWithScore.sort((a, b) => strategy === 'max' ? b.maxScore - a.maxScore : b.minScore - a.minScore);
        
        let scoresArr = teamsWithScore.map(t => strategy === 'max' ? t.maxScore : t.minScore);
        let getHeuristic = (idx, count) => { 
            let sum = 0; 
            for(let c = 0; c < count && (idx + c) < scoresArr.length; c++) sum += scoresArr[idx + c]; 
            return sum; 
        };

        let totalCandidates = teamsWithScore.length;
        let opsPerSec = getDeviceBenchmark() * 0.4;
        
        // 🚀 動態二次方深度估算
        let defaultBeamWidth = Math.min(8000, Math.max(1000, Math.floor(500 + 0.5 * Math.pow(totalCandidates, 2))));

        let estTimeSec = ((totalCandidates * defaultBeamWidth) / opsPerSec).toFixed(1);
        if (parseFloat(estTimeSec) < 0.1) estTimeSec = "0.1";

        let widthMsg = t(`系統共篩選出 `) + totalCandidates + t(` 組有效候選編隊。\n\n請輸入搜尋深度 (Beam Width)。\n建議值：`) + defaultBeamWidth + t(` (系統已依您的排軸量自動推估的最佳值)：`);
        let widthChoice = prompt(widthMsg, defaultBeamWidth.toString());
        let beamWidth = parseInt(widthChoice);
        if (isNaN(beamWidth) || beamWidth <= 0) beamWidth = defaultBeamWidth;

        let estMemoryMB = (beamWidth * maxAllowed * 400) / (1024 * 1024);
        let safeMemoryLimitMB = 1500; 
        if (performance && performance.memory) {
            safeMemoryLimitMB = Math.floor((performance.memory.jsHeapSizeLimit * 0.8) / (1024 * 1024));
            estMemoryMB += (performance.memory.usedJSHeapSize / (1024 * 1024)); 
        }
        if (estMemoryMB > safeMemoryLimitMB) {
            let proceed = confirm(t(`⚠️ 記憶體資源警告 ⚠️\n\n系統預估本次推演將消耗約 `) + estMemoryMB.toFixed(0) + t(` MB。\n可能導致瀏覽器卡頓或崩潰。\n\n確定繼續執行嗎？`));
            if (!proceed) {
                isEngineRunning = false;
                let progressContainer = document.getElementById('sim-progress-container');
                if (progressContainer) progressContainer.style.display = 'none';
                return; 
            }
        }

        let limitMap = {}; for (let key in charData) limitMap[key] = charData[key].max;
        let stepCount = 0; let totalSteps = teamsWithScore.length; let startTime = Date.now(); 

        for (let {team, minScore, maxScore} of teamsWithScore) {
            let currentScoreAdd = strategy === 'max' ? maxScore : minScore;
            stepCount++;
            if (stepCount % 2 === 0 || stepCount === 1) {
                updateProgress(Math.floor((stepCount / totalSteps) * 100), t(`建構中 (`) + `${stepCount}/${totalSteps})...`);
                await yieldToMain(); 
            }

            let nextStates = [];
            let b1 = getBase(team.c1), b2 = getBase(team.c2), b3 = getBase(team.c3);
            let limit1 = limitMap[b1] || 1, limit2 = limitMap[b2] || 1, limit3 = limitMap[b3] || 1;

            for (let i = 0; i < states.length; i++) {
                let state = states[i];
                
                if (state.teams.length < maxAllowed) {
                    let u1 = state.usage[b1] || 0, u2 = state.usage[b2] || 0, u3 = state.usage[b3] || 0;
                    if (u1 < limit1 && u2 < limit2 && u3 < limit3 && b1 !== b2 && b1 !== b3 && b2 !== b3) {
                        let newUsage = Object.assign({}, state.usage);
                        newUsage[b1] = u1 + 1; newUsage[b2] = u2 + 1; newUsage[b3] = u3 + 1;
                        let newTeams = state.teams.slice(); newTeams.push(team);
                        
                        let heuristic = getHeuristic(stepCount, maxAllowed - newTeams.length);
                        let evalScore = state.score + currentScoreAdd + heuristic;

                        nextStates.push({ 
                            maxScore: state.maxScore + (strategy==='max'?maxScore:0), 
                            minScore: state.minScore + (strategy==='min'?minScore:0), 
                            score: state.score + currentScoreAdd, 
                            evalScore: evalScore, 
                            teams: newTeams, 
                            usage: newUsage 
                        });
                    }
                }
                
                let skipHeuristic = getHeuristic(stepCount, maxAllowed - state.teams.length);
                nextStates.push({
                    maxScore: state.maxScore,
                    minScore: state.minScore,
                    score: state.score,
                    evalScore: state.score + skipHeuristic,
                    teams: state.teams,
                    usage: state.usage
                });
            }

            nextStates.sort((a, b) => Math.abs(b.evalScore - a.evalScore) > 0.01 ? b.evalScore - a.evalScore : b.score - a.score);

            if (nextStates.length > maxStatesReached) maxStatesReached = nextStates.length;
            
            let bestEval = nextStates.length > 0 ? nextStates[0].evalScore : 0;
            let threshold = bestEval * 0.90; 
            
            let diverseStates = []; let teamUsageCount = {}; let added = new Set();
            for (let i = 0; i < nextStates.length; i++) {
                let state = nextStates[i];
                
                if (state.evalScore < threshold && diverseStates.length >= beamWidth * 0.2) break;

                let lastTeamId = state.teams.length > 0 ? state.teams[state.teams.length-1].rotId : 'none';
                teamUsageCount[lastTeamId] = (teamUsageCount[lastTeamId] || 0) + 1;
                
                if (beamWidth > 100000) {
                    diverseStates.push(state); added.add(state);
                } else {
                    if (teamUsageCount[lastTeamId] < beamWidth * 0.2 || diverseStates.length < beamWidth * 0.1) {
                        diverseStates.push(state); added.add(state);
                    }
                }
                if (diverseStates.length >= beamWidth) break;
            }
            if (diverseStates.length < beamWidth) {
                for (let i = 0; i < nextStates.length && diverseStates.length < beamWidth; i++) {
                    if (!added.has(nextStates[i])) diverseStates.push(nextStates[i]);
                }
            }
            states = diverseStates; 
        }
        
        updateProgress(100, t('自動編隊完成！'));
        setTimeout(() => document.getElementById('sim-progress-container').style.display='none', 800);

        let finalOptimizedTeams = states[0].teams; finalOptimizedTeams.reverse(); 
        document.querySelectorAll('.char-select, .score-input, .end-boss-hp, .end-boss-r, .end-boss-idx').forEach(el => el.value=""); 
        
        let rows = document.querySelectorAll('#team-board tr');
        finalOptimizedTeams.forEach((tData, index) => { 
            if(rows[index] && index < maxAllowed) { 
                let ss = rows[index].querySelectorAll('select.char-select'); 
                ss[0].innerHTML = `<option value="${tData.c1}">${tData.c1}</option>`; ss[1].innerHTML = `<option value="${tData.c2}">${tData.c2}</option>`; ss[2].innerHTML = `<option value="${tData.c3}">${tData.c3}</option>`; 
                ss[0].value = tData.c1; ss[1].value = tData.c2; ss[2].value = tData.c3; 
            } 
        });
        
        let simModeEl = document.getElementById('sim-mode'); if (simModeEl && simModeEl.value !== 'auto') simModeEl.value = 'auto';
        updateTracker(); 

        let finalSimRes = runSimulations(getEnvSettings()); 
        
        // 🚀 終極防護：確保最終輸出的總分不出現倒置
        let rawMin = Math.floor(finalSimRes.totalMatrixScoreMin);
        let rawMax = Math.floor(finalSimRes.totalMatrixScoreMax);
        let estMinScore = Math.min(rawMin, rawMax);
        let estMaxScore = Math.max(rawMin, rawMax);

        let strategyName = strategy === 'min' ? t('下限穩定度') : t('上限理論值');
        let successMsg = t(`配置完成！目標：[`) + strategyName + t(`最高]。共組建 `) + finalOptimizedTeams.length + t(` 隊。\n`);

        successMsg += `\n🎯 預估矩陣總分 (上限)：${estMaxScore.toLocaleString()} 分`;
        successMsg += `\n🛡️ 預估最差保底 (下限)：${estMinScore.toLocaleString()} 分\n`;

        let calcTimeSec = ((Date.now() - startTime) / 1000).toFixed(2);
        successMsg += `\n📊 運算觀測報告：\n`;
        successMsg += `- 實際運算耗時：${calcTimeSec} 秒\n`;
        successMsg += `- 運算模式：智慧容差剪枝 (動態閾值)\n`;
        successMsg += `- 設定最大深度：${beamWidth}\n`;
        successMsg += `- 實際最大分支：${maxStatesReached.toLocaleString()}\n`;
        
        if (maxStatesReached <= beamWidth) successMsg += `✨ 狀態：運算資源充足，已涵蓋有效潛力範圍內的所有組合。`;
        else successMsg += `⚠️ 狀態：已觸發截斷機制。此為設定深度下之最佳近似解。`;

        alert(successMsg);
        if (typeof renderRotations === 'function') renderRotations();
        
    } catch (err) {
        console.error("一鍵編隊發生錯誤:", err);
        alert(t("⚠️ 引擎發生未預期錯誤，請重新整理後再試。"));
    } finally {
        isEngineRunning = false;
        let progressContainer = document.getElementById('sim-progress-container');
        if (progressContainer) progressContainer.style.display = 'none';
    }
}
