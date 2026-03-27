// ==========================================
// 鳴潮矩陣編隊工具 v4.8.5 [核心運算模組 - 智慧剪枝特化版]
// 檔案：core.js
// 職責：資料存取、數學推演、動態時間判定、雙引擎洗牌(DP+Beam)、專屬增傷、A*潛力估價、防呆機制
// ==========================================
// ==========================================
// --- 核心環境與賽季參數設定 (MATRIX_CONFIG) ---
// ==========================================
const MATRIX_CONFIG = {
    SCORE_RATIO: 10,
    RES_PENALTY: 40,
    BUFF_BONUS: 30,
    PEN110: 0.975,
    PEN120: 0.951,
    TRANS_TIME: 1.5,
    BATTLE_TIME: 120,

    HP_BASE: {
        R1: [400, 400, 400, 400, 440], 
        R2: [681, 681, 681, 681, 911], 
        R3: [1384, 1384, 1384, 1384, 1384]
    },

    DEFAULT_GROWTH: 5,
    calcDynamicHP: function(r, i, customGrowthPct) {
        let baseHP = 1384; 
        let growthRate = customGrowthPct / 100;
        let step = (r - 4) * 5 + i;
        return baseHP * (1 + growthRate * step);
    }
};
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
// --- 新增：效能優化專用快取與狀態 ---
let ttkCache = new Map(); // 格式: "rotId_bossHp_rFactor_lvlPenalty" -> 預先算好的秒數
let dpsDataMap = {};

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

// 🚀 支援多點離散判定 (Discrete TTK) 的殘血推演演算法 (含 Memoization 快取)
function getTtkFromMathCurve(hpToKill, baseDps, r_factor, lvlPenalty, mainC, rotId, timeSpentOnField = 0) {
    // 🌟 AOT 優化：先查快取，如果這個時空算過了，直接回傳 O(1)
    let cacheKey = `${rotId}_${Math.round(hpToKill)}_${Math.round(r_factor*100)}_${Math.round(lvlPenalty*100)}_${Math.round(timeSpentOnField*10)}`;
    if (ttkCache.has(cacheKey)) return ttkCache.get(cacheKey);

    let d = dpsDataMap[rotId];
    let isFirstRotation = (timeSpentOnField === 0);
    
    let rotTime = (isFirstRotation && d && d.firstDuration) ? d.firstDuration : ((d && d.duration) ? d.duration : 25);
    let baseTotalDmg = getEffectiveTotalDmg(d, rotId, isFirstRotation, baseDps, rotTime);
    let totalDmgPerRot = baseTotalDmg * r_factor * lvlPenalty;
    
    if (isNaN(totalDmgPerRot) || totalDmgPerRot <= 0 || isNaN(hpToKill) || hpToKill <= 0) return 9999;

    let fullRots = Math.floor(hpToKill / totalDmgPerRot);
    let remainderHp = hpToKill % totalDmgPerRot;
    
    // 如果剛好整除，直接回傳總時間
    if (remainderHp === 0) {
        let result = fullRots * rotTime;
        ttkCache.set(cacheKey, result);
        return result;
    }

    let targetDmgPct = remainderHp / totalDmgPerRot;
    if (targetDmgPct < 0.001) {
        let result = targetDmgPct * rotTime;
        ttkCache.set(cacheKey, result);
        return result;
    }

    let remainderTimePct = 0;

    // 🌟 實戰模擬 2.0：二元搜尋階梯判定 (Binary Search on Step Function)
    if (customStatsMap && customStatsMap[rotId] && customStatsMap[rotId].curvePoints && customStatsMap[rotId].curvePoints.length >= 2) {
        let pts = customStatsMap[rotId].curvePoints;
        
        let left = 0;
        let right = pts.length - 1;
        let bestIdx = right;

        // 利用二分搜快速找到第一個「累積傷害 >= 目標傷害比例」的節點
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (pts[mid].d >= targetDmgPct) {
                bestIdx = mid;
                right = mid - 1; // 繼續往左找，確保是「第一個」達標的點
            } else {
                left = mid + 1;
            }
        }
        
        // 找到擊殺點後，直接取其時間
        remainderTimePct = pts[bestIdx].t;

    } else {
        // 退回舊版預設的平滑曲線推估
        let k = 1.0;
        if (customStatsMap && customStatsMap[rotId] && customStatsMap[rotId].curveK !== undefined && customStatsMap[rotId].curveK !== null) {
            let parsedK = parseFloat(customStatsMap[rotId].curveK);
            if (!isNaN(parsedK)) k = (parsedK > 0) ? parsedK : 1.0; 
        } else if (DEFAULT_CURVE_K[mainC]) {
            k = DEFAULT_CURVE_K[mainC];
        }
        remainderTimePct = Math.pow(targetDmgPct, 1 / k);
    }

    let finalTtk = (fullRots * rotTime) + (remainderTimePct * rotTime);
    ttkCache.set(cacheKey, finalTtk); // 寫入快取
    return finalTtk;
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
    dpsDataMap = {};
    dpsData.forEach(d => dpsDataMap[d.id] = d);
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

function initBossHPMap() {
    let env = getEnvSettings();
    bossHPMap = safeStorageGet('ww_boss_hp', {});
    bossHPHistory = safeStorageGet('ww_boss_hp_history', {});

    for (let r = 1; r <= 10; r++) { 
        for (let i = 1; i <= 5; i++) {
            let key = `R${r}-${i}`; 
            if (!bossHPMap[key] || bossHPMap[key].isDefault) { 
                let hpValue = 0;
                
                if (r <= 3) {
                    hpValue = MATRIX_CONFIG.HP_BASE[`R${r}`][i - 1];

                    if (r === 1 && env.r1_hp !== null && i !== 5) hpValue = env.r1_hp;
                    if (r === 2 && env.r2_hp !== null && i !== 5) hpValue = env.r2_hp;
                    if (r === 3 && env.r3_hp !== null) hpValue = env.r3_hp;
                } else {
                    let growth = (env.hpGrowth !== null) ? env.hpGrowth : MATRIX_CONFIG.DEFAULT_GROWTH;
                    hpValue = MATRIX_CONFIG.calcDynamicHP(r, i, growth);
                }

                bossHPMap[key] = { value: hpValue, isDefault: true }; 
            } 
        } 
    }

    const uiElements = {
        'env-ratio': MATRIX_CONFIG.SCORE_RATIO,
        'env-r1': MATRIX_CONFIG.HP_BASE.R1[0],
        'env-r2': MATRIX_CONFIG.HP_BASE.R2[0],
        'env-r3': MATRIX_CONFIG.HP_BASE.R3[0],
        'env-growth': MATRIX_CONFIG.DEFAULT_GROWTH,
        'env-res': MATRIX_CONFIG.RES_PENALTY,
        'env-buff': MATRIX_CONFIG.BUFF_BONUS,
        'env-trans': MATRIX_CONFIG.TRANS_TIME,
        'env-time': MATRIX_CONFIG.BATTLE_TIME
    };
    for (let id in uiElements) {
        let el = document.getElementById(id);
        if (el && !el.value) { el.value = uiElements[id]; }
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
    let rotData = dpsDataMap[rotId];
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

function getEnvSettings() {
    let rawRatio = parseFloat(document.getElementById('env-ratio')?.value);
    
    let tags = [];
    for(let i=1; i<=4; i++) {
        let sel = document.getElementById(`env-res-${i}`);
        tags.push(sel && sel.value ? sel.value : null);
    }
    
    let wTags = [];
    for(let i=1; i<=4; i++) {
        let el = document.getElementById(`env-weak-${i}`);
        wTags.push(el && el.value ? el.value : "");
    }

    let parseUI = (id) => {
        let val = document.getElementById(id)?.value;
        return (val && val !== "") ? parseFloat(val) : null;
    };

    return {
        scoreRatio: isNaN(rawRatio) || rawRatio <= 0 ? MATRIX_CONFIG.SCORE_RATIO : rawRatio,
        r1_hp: parseUI('env-r1'),
        r2_hp: parseUI('env-r2'),
        r3_hp: parseUI('env-r3'),
        hpGrowth: parseUI('env-growth'),
        resPenalty: parseUI('env-res') || MATRIX_CONFIG.RES_PENALTY,
        buffBonus: parseUI('env-buff') || MATRIX_CONFIG.BUFF_BONUS,
        pen110: parseUI('env-pen110') || MATRIX_CONFIG.PEN110,
        pen120: parseUI('env-pen120') || MATRIX_CONFIG.PEN120,
        transTime: parseUI('env-trans') || MATRIX_CONFIG.TRANS_TIME,
        battleTime: parseUI('env-time') || MATRIX_CONFIG.BATTLE_TIME,
        resTags: tags,
        weakTags: wTags
    };
}

function runSimulations(env) {
    let simMode = document.getElementById('sim-mode') ? document.getElementById('sim-mode').value : 'auto';
    let mcMode = document.getElementById('mc-select') ? document.getElementById('mc-select').value : 'off';
    let results = { totalMatrixScoreMin: 0, totalMatrixScoreMax: 0, actualTotalScore: 0, totalManualBaseScore: 0, totalManualMaxScore: 0, simMode: simMode, rowsData: [] };

    let auto_r_min = 1, auto_idx_min = 1, auto_hp_min = getBossMaxHP(1, 1);
    let auto_r_max = 1, auto_idx_max = 1, auto_hp_max = getBossMaxHP(1, 1);
    let man_start_r = 1, man_start_idx = 1, man_start_hp_pct = 100;
    let savedTeams = safeStorageGet('ww_teams', []);
    if (simMode === 'manual' && savedTeams.length === 0) {
        savedTeams = [{
            id: 'dummy_manual_team',
            name: '反推虛擬隊伍',
            c1: '無', c2: '無', c3: '無',
            rotId: 'dummy_rot',
            score: 1
        }];
    }
   let getCumDmg = (r, idx, hpPct) => {
        let dmg = 0;
        for (let i = 1; i <= r; i++) {
            let maxJ = (i === r) ? idx : 5;
            for (let j = 1; j <= maxJ; j++) {
                let maxHp = getBossMaxHP(i, j);
                let scoreMult = (j === 5) ? 1.1 : 1.0;
                if (i === r && j === idx) dmg += maxHp * (1 - hpPct / 100) * scoreMult; else dmg += maxHp * scoreMult;
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
                                
                                if (idx === 5) {
                                    r_factor = 1.0; 
                                }

                                let timeOnField = env.battleTime - t_left; 
                                let ttk = getTtkFromMathCurve(hp, baseDps, r_factor, lvlPenalty, mainC, rotId, timeOnField);

                                if (ttk <= t_left) {
                                    let scoreMult = (idx === 5) ? 1.1 : 1.0;
                                    dmg += (hp * scoreMult);
                                    t_left -= (ttk + env.transTime); idx++; 
                                    if (idx > 5) { r++; idx = 1; } 
                                    hp = getBossMaxHP(r, idx); 
                                } else { 
                                    let d = dpsDataMap[rotId];
                                    let isFirst = (timeOnField === 0);
                                    let rotTime = (isFirst && d && d.firstDuration) ? d.firstDuration : ((d && d.duration) ? d.duration : 25);
                                    let baseTotalDmg = getEffectiveTotalDmg(d, rotId, isFirst, baseDps, rotTime);
                                    
                                    let true_eff_dps = Math.max(0.0001, (baseTotalDmg / rotTime) * r_factor * lvlPenalty);
                                    let scoreMult = (idx === 5) ? 1.1 : 1.0;
                                    dmg += (true_eff_dps * t_left * scoreMult); hp -= true_eff_dps * t_left; t_left = 0; 
                                }
                            }
                            let finalHpPct = Math.max(0, (hp / getBossMaxHP(r, idx)) * 100);
                            return { hp: Math.max(0, hp), r, idx, dmg, endStr: `R${r}-${idx}(${finalHpPct.toFixed(0)}%)`, startStr };
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
                    let stagesCleared = (ebRInt - man_start_r) * 5 + (ebIdxInt - man_start_idx);
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
                    
                    if (tmp_idx === 5) {
                        r_factor = 1.0; 
                    }

                    let timeOnField = env.battleTime - t_left; 
                    let ttk = getTtkFromMathCurve(tmp_hp, team.calculatedMinDps, r_factor, lvlPenalty, team.c1, team.rotId, timeOnField);

                    if (ttk <= t_left) {
                        let scoreMult = (tmp_idx === 5) ? 1.1 : 1.0;
                        dmgDone += (tmp_hp * scoreMult); t_left -= (ttk + env.transTime);
                        tmp_idx++; if (tmp_idx > 5) { tmp_r++; tmp_idx = 1; }
                        tmp_hp = getBossMaxHP(tmp_r, tmp_idx);
                    } else {
                        let d = dpsDataMap[team.rotId];
                        let isFirst = (timeOnField === 0);
                        let rotTime = (isFirst && d && d.firstDuration) ? d.firstDuration : ((d && d.duration) ? d.duration : 25);
                        let baseTotalDmg = getEffectiveTotalDmg(d, team.rotId, isFirst, team.calculatedMinDps, rotTime);
                        
                        let true_eff_dps = Math.max(0.0001, (baseTotalDmg / rotTime) * r_factor * lvlPenalty);
                        let scoreMult = (tmp_idx === 5) ? 1.1 : 1.0;
                        dmgDone += (true_eff_dps * t_left * scoreMult); tmp_hp -= true_eff_dps * t_left; t_left = 0;
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
    ttkCache.clear();

    try {
        if (typeof customRotations !== 'undefined') {
            let hasGhosts = false;
            for (let i = customRotations.length - 1; i >= 0; i--) {
                if (customRotations[i].rot === "反推自動建軸" && customRotations[i].dps === 10000) {
                    let deadId = 'custom_rot_' + customRotations[i].id;
                    customRotations.splice(i, 1);
                    if (typeof dpsData !== 'undefined') {
                        let dIdx = dpsData.findIndex(d => d.id === deadId);
                        if (dIdx !== -1) dpsData.splice(dIdx, 1);
                    }
                    if (typeof dpsDataMap !== 'undefined') delete dpsDataMap[deadId];
                    if (customStatsMap[deadId]) delete customStatsMap[deadId];
                    checkedRotations.delete(deadId);
                    hasGhosts = true;
                }
            }
            if (hasGhosts) {
                safeStorageSet('ww_custom_rotations_v2', customRotations);
                safeStorageSet('ww_custom_stats', customStatsMap);
                safeStorageSet('ww_rotations', [...checkedRotations]);
            }
        }

        initBossHPMap(); 
        let env = getEnvSettings();
        let rows = document.querySelectorAll('#team-board tr');
        let currentTeams = [];
        let hasIncompleteScore = false;
        let needsRebuild = false;
        let start_r = 1, start_idx = 1, start_hp = getBossMaxHP(1, 1);

        rows.forEach((row) => {
            if (row.classList.contains('hidden-row')) return;
            let ss = row.querySelectorAll('select.char-select');
            let c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value;
            let scoreInput = row.querySelector('.score-input').value;
            let ebR = row.querySelector('.end-boss-r').value;
            let ebIdx = row.querySelector('.end-boss-idx').value;
            let ebHp = row.querySelector('.end-boss-hp').value;
            let rotSelect = row.querySelector('.rot-select');
            let rotId = rotSelect ? rotSelect.value : "";

            if (c1 && c2 && c3) { 
                let actualScore = parseFloat(scoreInput);
                if (isNaN(actualScore) || actualScore <= 0) {
                    hasIncompleteScore = true;
                    return; 
                }

                let savedTeams = safeStorageGet('ww_teams', []);
                let existingTeam = savedTeams.find(t => t.c1 === c1 && t.c2 === (c2 || '無') && t.c3 === (c3 || '無'));

                let isRotAlive = (id) => {
                    if (!id || id === "" || id.includes("無預設") || id.includes("無適配")) return false;
                    return (typeof dpsDataMap !== 'undefined' && !!dpsDataMap[id]) || 
                           (typeof customRotations !== 'undefined' && customRotations.some(r => 'custom_rot_' + r.id === id));
                };

                let validRotId = "";
                if (existingTeam && existingTeam.rotId && isRotAlive(existingTeam.rotId)) {
                    validRotId = existingTeam.rotId; 
                } else if (isRotAlive(rotId)) {
                    validRotId = rotId;
                } else {
                    let foundRot = dpsData.find(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3 && d.isUserCustom);
                    if (foundRot) {
                        validRotId = foundRot.id;
                    } else {
                        let foundDB = dpsData.find(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3 && !d.isUserCustom);
                        if (foundDB) validRotId = foundDB.id;
                    }
                }

                if (!validRotId) {
                    let newId = Date.now().toString() + "_" + Math.floor(Math.random() * 100000);
                    validRotId = 'custom_rot_' + newId;
                    
                    let newRot = { id: newId, c1: c1, c2: c2, c3: c3, dps: 10000, duration: 25, diff: "🧩", rot: "反推自動建軸", totalDmg: 250000, gridData: [] };
                    if (typeof customRotations !== 'undefined') customRotations.push(newRot);
                    
                    let newDpsData = { id: validRotId, c1: c1, c2: c2, c3: c3, dps: 10000, rot: "反推自動建軸", diff: "🧩", gen: (typeof charData !== 'undefined' && charData[getBase(c1)]) ? charData[getBase(c1)].gen : 1, isUserCustom: true, duration: 25, totalDmg: 250000 };
                    if (typeof dpsData !== 'undefined') dpsData.push(newDpsData);
                    if (typeof dpsDataMap !== 'undefined') dpsDataMap[validRotId] = newDpsData;
                    customStatsMap[validRotId] = { dps: 10000, stability: 100, buff: 0 };
                    needsRebuild = true;
                }

                if (existingTeam) {
                    existingTeam.rotId = validRotId;
                    existingTeam.score = actualScore;
                } else {
                    savedTeams.push({ id: 'team_auto_' + Date.now().toString() + "_" + Math.floor(Math.random() * 100000), name: `${c1} 反推隊伍`, c1: c1, c2: c2 || '無', c3: c3 || '無', rotId: validRotId, score: actualScore });
                    needsRebuild = true;
                }
                safeStorageSet('ww_teams', savedTeams);

                if (!checkedRotations.has(validRotId)) {
                    checkedRotations.add(validRotId);
                    ownedCharacters.add(getBase(c1)); ownedCharacters.add(getBase(c2)); ownedCharacters.add(getBase(c3));
                    needsRebuild = true;
                }

                let calculatedMinDps = 0;
                let teamAttr = typeof charAttrMap !== 'undefined' ? charAttrMap[c1] : null;

                let dmg_left = actualScore / Math.max(0.0001, env.scoreRatio);
                let kills = 0, effective_dmg_sum = 0, tmp_r = start_r, tmp_idx = start_idx, tmp_hp = start_hp;
                
                while (dmg_left > 0) {
                    let lvlPenalty = (tmp_r === 1) ? 1.0 : (tmp_r === 2 ? (env.pen110 || 1.0) : (env.pen120 || 1.0));
                    let r_factor = getCombatMultiplier(env, teamAttr, c1, tmp_idx);
                    if (tmp_idx === 5) r_factor = 1.0; 
                    let totalPenalty = r_factor * lvlPenalty;
                    let currentDmgCap = tmp_hp * ((tmp_idx === 5) ? 1.1 : 1.0);

                    if (dmg_left >= currentDmgCap) { 
                        dmg_left -= currentDmgCap; effective_dmg_sum += (tmp_hp / totalPenalty); 
                        kills++; tmp_idx++; if (tmp_idx > 5) { tmp_r++; tmp_idx = 1; } 
                        tmp_hp = getBossMaxHP(tmp_r, tmp_idx); 
                    } else {
                        effective_dmg_sum += ((dmg_left / ((tmp_idx === 5) ? 1.1 : 1.0)) / totalPenalty);
                        tmp_hp -= (dmg_left / ((tmp_idx === 5) ? 1.1 : 1.0)); dmg_left = 0;
                    }
                }

                let effective_time = env.battleTime - (kills * env.transTime);
                let trueBaseDps = effective_time > 0 ? (effective_dmg_sum / effective_time) : 0;
                
                if (trueBaseDps > 0) { 
                    let currStats = customStatsMap[validRotId] || { buff: 0 }; 
                    let newDps = parseFloat((trueBaseDps / (1 + ((currStats.buff || 0) / 100))).toFixed(3));
                    
                    customStatsMap[validRotId] = { dps: newDps, stability: 100, buff: currStats.buff || 0 };
                    
                    if (typeof dpsData !== 'undefined') {
                        let targetD = dpsData.find(d => d.id === validRotId);
                        if (targetD) { targetD.dps = newDps; targetD.totalDmg = newDps * (targetD.duration || 25); }
                    }
                    if (typeof dpsDataMap !== 'undefined' && dpsDataMap[validRotId]) {
                        dpsDataMap[validRotId].dps = newDps; dpsDataMap[validRotId].totalDmg = newDps * (dpsDataMap[validRotId].duration || 25);
                    }
                    if (typeof customRotations !== 'undefined') {
                        let cr = customRotations.find(r => 'custom_rot_' + r.id === validRotId);
                        if (cr) { cr.dps = newDps; cr.totalDmg = newDps * (cr.duration || 25); }
                    }
                    
                    calculatedMinDps = trueBaseDps; 
                    needsRebuild = true; 
                } 

                let sim_dmg = actualScore / Math.max(0.0001, env.scoreRatio);
                while (sim_dmg > 0) {
                    let currentDmgCap = start_hp * ((start_idx === 5) ? 1.1 : 1.0);
                    if (sim_dmg >= currentDmgCap) {
                        sim_dmg -= currentDmgCap; start_idx++;
                        if (start_idx > 5) { start_r++; start_idx = 1; }
                        start_hp = getBossMaxHP(start_r, start_idx);
                    } else { 
                        start_hp -= (sim_dmg / ((start_idx === 5) ? 1.1 : 1.0)); 
                        break; 
                    }
                }

                currentTeams.push({ 
                    index: currentTeams.length, c1: c1, c2: c2, c3: c3, scoreInput: scoreInput, 
                    ebR: ebR, ebIdx: ebIdx, ebHp: ebHp, calculatedMinDps: calculatedMinDps, teamAttr: teamAttr, rotId: validRotId 
                });
            }
        });

        if (hasIncompleteScore) return alert(t("⚠️ 發現已選擇角色但未填寫【實戰得分】的隊伍！"));
        if (currentTeams.length === 0) return alert(t("⚠️ 沙盤中目前沒有隊伍！"));

        safeStorageSet('ww_custom_stats', customStatsMap);
        safeStorageSet('ww_rotations', [...checkedRotations]);
        safeStorageSet('ww_roster', [...ownedCharacters]);
        if (typeof customRotations !== 'undefined') safeStorageSet('ww_custom_rotations_v2', customRotations);

        let maxAllowed = parseInt(document.getElementById('team-count-select').value) || 16;
        let poolToPermute = [...currentTeams];

        if (currentTeams.length < maxAllowed) {
            let tempUsage = {};
            currentTeams.forEach(tData => {
                [tData.c1, tData.c2, tData.c3].forEach(c => { let b = getBase(c); tempUsage[b] = (tempUsage[b] || 0) + 1; });
            });
            let validDBTeams = getUniqueValidTeams().sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min); 
            for (let dbTeam of validDBTeams) {
                if (poolToPermute.length >= maxAllowed) break;
                let b1 = getBase(dbTeam.c1), b2 = getBase(dbTeam.c2), b3 = getBase(dbTeam.c3);
                let l1 = charData[b1]?.max || 1, l2 = charData[b2]?.max || 1, l3 = charData[b3]?.max || 1;
                let u1 = tempUsage[b1] || 0, u2 = tempUsage[b2] || 0, u3 = tempUsage[b3] || 0;
                if (u1 < l1 && u2 < l2 && u3 < l3 && b1 !== b2 && b1 !== b3 && b2 !== b3) {
                    if (!poolToPermute.some(ct => ct.c1 === dbTeam.c1 && ct.c2 === dbTeam.c2 && ct.c3 === dbTeam.c3)) {
                        tempUsage[b1] = u1 + 1; tempUsage[b2] = u2 + 1; tempUsage[b3] = u3 + 1;
                        poolToPermute.push({ index: poolToPermute.length, c1: dbTeam.c1, c2: dbTeam.c2, c3: dbTeam.c3, scoreInput: "", ebR: "", ebIdx: "", ebHp: "", calculatedMinDps: getRotDpsRange(dbTeam).min, teamAttr: typeof charAttrMap !== 'undefined' ? charAttrMap[dbTeam.c1] : null, rotId: dbTeam.id });
                    }
                }
            }
        }

        let n = poolToPermute.length;
        let dmgMultMatrix = new Array(n).fill(null).map((_, i) => {
            let rMap = {};
            for(let r = 1; r <= 10; r++) {
                rMap[r] = {};
                let lvlPenalty = (r === 1) ? 1.0 : (r === 2 ? (env.pen110 || 1.0) : (env.pen120 || 1.0));
                for(let idx = 1; idx <= 5; idx++) {
                    let r_factor = getCombatMultiplier(env, poolToPermute[i].teamAttr, poolToPermute[i].c1, idx);
                    rMap[r][idx] = { r_factor: (idx === 5) ? 1.0 : Math.max(0.1, r_factor), lvlPenalty: lvlPenalty };
                }
            }
            return rMap;
        });

        let defaultBeamWidth = Math.max(3500, n > 1 ? Math.floor(3500 + (Math.log(n) * 1800)) : 3500); 
        let algoChoice = prompt(t("請輸入演算法 (1=智慧, 2=DP, 3=束式)："), "1");
        if (algoChoice === null) return isEngineRunning = false;
        
        let useDP = (algoChoice === "2") ? true : (algoChoice === "3" ? false : (n <= 14)); 
        let algoSequence = [];

        // --- ⚖️ 建立與實戰 100% 同步的精準計分裁判 ---
        let evaluateSeq = (seq) => {
            let testScore = 0, tmp_r = 1, tmp_idx = 1, tmp_hp = getBossMaxHP(1, 1);
            for (let j = 0; j < seq.length; j++) {
                let team = seq[j];
                if (!team.calculatedMinDps || team.calculatedMinDps <= 0) continue;
                let t_left = env.battleTime, loopGuard = 0;
                while (t_left > 0 && loopGuard < 50) {
                    loopGuard++;
                    let lvlPenalty = (tmp_r === 1) ? 1.0 : (tmp_r === 2 ? (env.pen110 || 1.0) : (env.pen120 || 1.0));
                    let r_factor = getCombatMultiplier(env, team.teamAttr, team.c1, tmp_idx);
                    if (tmp_idx === 5) r_factor = 1.0;

                    let timeOnField = env.battleTime - t_left;
                    let ttk = getTtkFromMathCurve(tmp_hp, team.calculatedMinDps, r_factor, lvlPenalty, team.c1, team.rotId, timeOnField);

                    if (ttk <= t_left) {
                        testScore += (tmp_hp * ((tmp_idx === 5) ? 1.1 : 1.0)) * env.scoreRatio;
                        t_left -= (ttk + env.transTime);
                        tmp_idx++; if (tmp_idx > 5) { tmp_r++; tmp_idx = 1; }
                        tmp_hp = getBossMaxHP(tmp_r, tmp_idx);
                    } else {
                        let d = typeof dpsDataMap !== 'undefined' ? dpsDataMap[team.rotId] : null;
                        let isFirst = (timeOnField === 0);
                        let rotTime = (isFirst && d && d.firstDuration) ? d.firstDuration : ((d && d.duration) ? d.duration : 25);
                        let baseTotalDmg = getEffectiveTotalDmg(d, team.rotId, isFirst, team.calculatedMinDps, rotTime);

                        let true_eff_dps = Math.max(0.0001, (baseTotalDmg / rotTime) * r_factor * lvlPenalty);
                        testScore += (true_eff_dps * t_left * ((tmp_idx === 5) ? 1.1 : 1.0)) * env.scoreRatio;
                        tmp_hp -= true_eff_dps * t_left;
                        t_left = 0;
                    }
                }
            }
            return testScore;
        };

        // ==========================================
        // 🎯 策略 1：計算玩家原始排序的保底總分
        // ==========================================
        let originalScore = evaluateSeq(poolToPermute);

        // ==========================================
        // 🎯 策略 2：強隊壓軸策略 (依 DPS 遞增排序)
        // ==========================================
        let ascSequence = [...poolToPermute].sort((a, b) => a.calculatedMinDps - b.calculatedMinDps);
        let ascScore = evaluateSeq(ascSequence);

        // ==========================================
        // 🎯 策略 3：執行您原本的舊版演算法 (DP 或 束式)
        // ==========================================
        if (useDP) {
            updateProgress(50, t(`啟動 DP 引擎...`)); await yieldToMain();
            algoSequence = runBitmaskDP(poolToPermute, env).seq; 
        } else {
            let widthChoice = prompt(t(`啟動束式搜索。請輸入搜尋深度：`), defaultBeamWidth.toString());
            let finalBeamWidth = (widthChoice !== null && parseInt(widthChoice) > 0) ? parseInt(widthChoice) : defaultBeamWidth;
            const MAX_NODES = finalBeamWidth * n; 
            let currentEvals = new Float64Array(finalBeamWidth), currentScores = new Float64Array(finalBeamWidth), currentMasks = new Int32Array(finalBeamWidth), currentR = new Int32Array(finalBeamWidth), currentIdx = new Int32Array(finalBeamWidth), currentHp = new Float64Array(finalBeamWidth), currentTeamIdx = new Int32Array(finalBeamWidth), currentParentIdx = new Int32Array(finalBeamWidth);
            let historyTeamIdx = new Array(n), historyParentIdx = new Array(n);
            for(let step = 0; step < n; step++){ historyTeamIdx[step] = new Int32Array(finalBeamWidth); historyParentIdx[step] = new Int32Array(finalBeamWidth); }
            currentEvals[0] = 0; currentScores[0] = 0; currentMasks[0] = (1 << n) - 1; currentR[0] = 1; currentIdx[0] = 1; currentHp[0] = getBossMaxHP(1, 1); currentTeamIdx[0] = -1; currentParentIdx[0] = -1;
            let currentCount = 1;

            for (let step = 0; step < n; step++) {
                updateProgress(Math.floor((step / n) * 100), t(`推演中 (${step+1}/${n})...`));
                if (step % 2 === 0) await yieldToMain(); 
                let nextEvals = new Float64Array(MAX_NODES), nextScores = new Float64Array(MAX_NODES), nextMasks = new Int32Array(MAX_NODES), nextR = new Int32Array(MAX_NODES), nextIdx = new Int32Array(MAX_NODES), nextHp = new Float64Array(MAX_NODES), nextTeamId = new Int32Array(MAX_NODES), nextParentId = new Int32Array(MAX_NODES), nextCount = 0;
                let seenMasks = new Map(); 

                for (let i = 0; i < currentCount; i++) {
                    let cMask = currentMasks[i], cScore = currentScores[i], cR = currentR[i], cIdx = currentIdx[i], cHp = currentHp[i];
                    for (let j = 0; j < n; j++) {
                        if (cMask & (1 << j)) { 
                            let team = poolToPermute[j], t_left = env.battleTime, dmgDone = 0, tmp_r = cR, tmp_idx = cIdx, tmp_hp = cHp;
                            while (t_left > 0) {
                                let multData = dmgMultMatrix[j][tmp_r][tmp_idx], timeOnField = env.battleTime - t_left;
                                let ttk = getTtkFromMathCurve(tmp_hp, team.calculatedMinDps, multData.r_factor, multData.lvlPenalty, team.c1, team.rotId, timeOnField);
                                if (ttk <= t_left) { 
                                    dmgDone += (tmp_hp * ((tmp_idx === 5) ? 1.1 : 1.0)); t_left -= (ttk + env.transTime); tmp_idx++; 
                                    if (tmp_idx > 5) { tmp_r++; tmp_idx = 1; } 
                                    tmp_hp = getBossMaxHP(tmp_r, tmp_idx); 
                                } else { 
                                    let d = dpsDataMap[team.rotId], isFirst = (timeOnField === 0), rotTime = (isFirst && d && d.firstDuration) ? d.firstDuration : ((d && d.duration) ? d.duration : 25);
                                    let true_eff_dps = Math.max(0.0001, (getEffectiveTotalDmg(d, team.rotId, isFirst, team.calculatedMinDps, rotTime) / rotTime) * multData.r_factor * multData.lvlPenalty);
                                    dmgDone += (true_eff_dps * t_left * ((tmp_idx === 5) ? 1.1 : 1.0)); tmp_hp -= true_eff_dps * t_left; t_left = 0; 
                                }
                            }
                            let newMask = cMask & ~(1 << j), newScore = cScore + dmgDone, remainingBossHp = 0, hr_r = tmp_r, hr_idx = tmp_idx, isFirstBoss = true;
                            for (let k=0; k<5 && hr_r<=10; k++) { 
                                remainingBossHp += ((isFirstBoss ? tmp_hp : getBossMaxHP(hr_r, hr_idx)) * ((hr_idx === 5) ? 1.1 : 1.0));
                                isFirstBoss = false; hr_idx++; if (hr_idx > 5) { hr_r++; hr_idx = 1; }
                            }
                            let maxPossibleDmg = 0;
                            for (let k = 0; k < n; k++) if (newMask & (1 << k)) maxPossibleDmg += (poolToPermute[k].calculatedMinDps * env.battleTime);
                            let newEval = newScore + ((maxPossibleDmg < remainingBossHp) ? (maxPossibleDmg * 0.001) : maxPossibleDmg);
                            if (seenMasks.get(newMask) >= newEval) continue;
                            seenMasks.set(newMask, newEval);
                            nextEvals[nextCount] = newEval; nextScores[nextCount] = newScore; nextMasks[nextCount] = newMask; nextR[nextCount] = tmp_r; nextIdx[nextCount] = tmp_idx; nextHp[nextCount] = tmp_hp; nextTeamId[nextCount] = j; nextParentId[nextCount] = i; nextCount++;
                        }
                    }
                }
                let indices = new Int32Array(nextCount); for (let i = 0; i < nextCount; i++) indices[i] = i;
                indices.sort((a, b) => nextEvals[b] - nextEvals[a]); 
                currentCount = Math.min(finalBeamWidth, nextCount);
                for (let i = 0; i < currentCount; i++) {
                    let idx = indices[i];
                    currentEvals[i] = nextEvals[idx]; currentScores[i] = nextScores[idx]; currentMasks[i] = nextMasks[idx]; currentR[i] = nextR[idx]; currentIdx[i] = nextIdx[idx]; currentHp[i] = nextHp[idx]; historyTeamIdx[step][i] = currentTeamIdx[i] = nextTeamId[idx]; historyParentIdx[step][i] = currentParentIdx[i] = nextParentId[idx];
                }
            }
            let traceIdx = 0; 
            for (let step = n - 1; step >= 0; step--) {
                if (historyTeamIdx[step][traceIdx] !== -1) algoSequence.unshift(poolToPermute[historyTeamIdx[step][traceIdx]]);
                traceIdx = historyParentIdx[step][traceIdx];
            }
        }

        let algoScore = evaluateSeq(algoSequence);

        // ==========================================
        // 🏆 終極裁決：三方 PK，絕對保底機制！
        // ==========================================
        let bestSequence = [...poolToPermute]; // 預設使用原味保底
        let bestScore = originalScore;

        // 若你的「強隊壓軸策略」分數更高，取代原陣型！
        if (ascScore > bestScore) {
            bestScore = ascScore;
            bestSequence = [...ascSequence];
        }

        // 若機器的演算法真的找出破天荒的高分，才准許它取代！
        if (algoScore > bestScore) {
            bestScore = algoScore;
            bestSequence = [...algoSequence];
        }

        updateProgress(100, t('最佳化排序完成！'));
        setTimeout(() => document.getElementById('sim-progress-container').style.display='none', 800);

        rows.forEach((row, index) => {
            if (index < maxAllowed && index < bestSequence.length) {
                let tData = bestSequence[index];
                let ss = row.querySelectorAll('select.char-select');
                if (tData.c1 && !ss[0].querySelector(`option[value="${tData.c1}"]`)) ss[0].innerHTML += `<option value="${tData.c1}">${tData.c1}</option>`;
                if (tData.c2 && !ss[1].querySelector(`option[value="${tData.c2}"]`)) ss[1].innerHTML += `<option value="${tData.c2}">${tData.c2}</option>`;
                if (tData.c3 && !ss[2].querySelector(`option[value="${tData.c3}"]`)) ss[2].innerHTML += `<option value="${tData.c3}">${tData.c3}</option>`;
                
                if (ss[0]) ss[0].value = tData.c1;
                if (ss[1]) ss[1].value = tData.c2;
                if (ss[2]) ss[2].value = tData.c3;

                let sInput = row.querySelector('.score-input'); if (sInput && tData.scoreInput !== undefined) sInput.value = tData.scoreInput;
                let ebR = row.querySelector('.end-boss-r'); if (ebR && tData.ebR !== undefined) ebR.value = tData.ebR;
                let ebIdx = row.querySelector('.end-boss-idx'); if (ebIdx && tData.ebIdx !== undefined) ebIdx.value = tData.ebIdx;
                let ebHp = row.querySelector('.end-boss-hp'); if (ebHp && tData.ebHp !== undefined) ebHp.value = tData.ebHp;
            } else {
                row.querySelectorAll('.char-select, .score-input, .end-boss-r, .end-boss-idx, .end-boss-hp').forEach(el => el.value = "");
            }
        });

        let simModeEl = document.getElementById('sim-mode'); if (simModeEl && simModeEl.value !== 'auto') simModeEl.value = 'auto';
        
        if (typeof renderRotations === 'function') renderRotations();
        if (typeof updateTracker === 'function') updateTracker(); 
        if (typeof renderWorkshopCards === 'function') renderWorkshopCards();

        let finalSimRes = runSimulations(env); 
        alert(`${t("解析完成。已重新排序隊伍，確保最佳通關。")}\n\n🎯 預估矩陣總分 (上限)：${Math.max(Math.floor(finalSimRes.totalMatrixScoreMin), Math.floor(finalSimRes.totalMatrixScoreMax)).toLocaleString()} 分`);

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

        let maxStatesReached = 0; 
        let teamsWithScore = [];
        
        for (let tData of validTeams) {
            let range = getRotDpsRange(tData);
            if (range.max > 0) teamsWithScore.push({ team: tData, minScore: range.min, maxScore: range.max });
        }
        teamsWithScore.sort((a, b) => strategy === 'max' ? b.maxScore - a.maxScore : b.minScore - a.minScore);
        
        // 🌟 純粹的 DPS 累積估價
        let getHeuristic = (idx, count) => { 
            let sumDmg = 0; 
            for(let c = 0; c < count && (idx + c) < teamsWithScore.length; c++) {
                let tCand = teamsWithScore[idx + c];
                sumDmg += (strategy === 'max' ? tCand.maxScore : tCand.minScore);
            } 
            return sumDmg; 
        };

        let totalCandidates = teamsWithScore.length;
        let opsPerSec = getDeviceBenchmark() * 0.4;
        
        // 🚀 4.8.5 動態對數深度估算 (因應奇藏加分機制，微調上修容錯深度)
        let defaultBeamWidth = 3500; // 基礎值由 2500 -> 3500
        if (totalCandidates > 1) {
            defaultBeamWidth = Math.floor(3500 + (Math.log(totalCandidates) * 1800)); // 乘數由 1500 -> 1800
        }
        defaultBeamWidth = Math.max(3500, defaultBeamWidth); // 下限由 3000 -> 3500

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

        const MAX_NODES = beamWidth * 2; 
        let finalBeamWidth = beamWidth;
        
        let allCharsList = Object.keys(charData);
        let charCount = allCharsList.length;

        let currentEvals = new Float64Array(finalBeamWidth);
        let currentScores = new Float64Array(finalBeamWidth);
        let currentTeamCounts = new Int32Array(finalBeamWidth); 
        let currentUsages = new Int8Array(finalBeamWidth * charCount);
        let currentTeamIdx = new Int32Array(finalBeamWidth); 
        let currentParentIdx = new Int32Array(finalBeamWidth);

        let historyTeamIdx = new Array(totalSteps);
        let historyParentIdx = new Array(totalSteps);
        for(let step = 0; step < totalSteps; step++){
            historyTeamIdx[step] = new Int32Array(finalBeamWidth);
            historyParentIdx[step] = new Int32Array(finalBeamWidth);
        }

        currentEvals[0] = 0; 
        currentScores[0] = 0; 
        currentTeamCounts[0] = 0;
        currentTeamIdx[0] = -1; 
        currentParentIdx[0] = -1;
        let currentCount = 1;

        for (let candIdx = 0; candIdx < totalSteps; candIdx++) {
            let tCand = teamsWithScore[candIdx];
            let team = tCand.team;
            let currentScoreAdd = strategy === 'max' ? tCand.maxScore : tCand.minScore;
            
            let b1 = getBase(team.c1), b2 = getBase(team.c2), b3 = getBase(team.c3);
            let b1Id = allCharsList.indexOf(b1), b2Id = allCharsList.indexOf(b2), b3Id = allCharsList.indexOf(b3);
            let limit1 = limitMap[b1] || 1, limit2 = limitMap[b2] || 1, limit3 = limitMap[b3] || 1;

            stepCount++;
            if (stepCount % 2 === 0 || stepCount === 1) {
                updateProgress(Math.floor((stepCount / totalSteps) * 100), t(`建構中 (`) + `${stepCount}/${totalSteps})...`);
                await yieldToMain(); 
            }

            let nextEvals = new Float64Array(MAX_NODES);
            let nextScores = new Float64Array(MAX_NODES);
            let nextTeamCounts = new Int32Array(MAX_NODES);
            let nextUsages = new Int8Array(MAX_NODES * charCount);
            let nextTeamId = new Int32Array(MAX_NODES);
            let nextParentId = new Int32Array(MAX_NODES);
            let nextCount = 0;

            // 🌟 修復核心：使用 BigInt 位元壓縮，取代字串拼接
            let getUsageHash = (usageOffset) => {
                let hash = 0n;
                for (let i = 0; i < charCount; i++) {
                    let u = nextUsages[usageOffset + i];
                    if (u > 0) {
                        hash |= (BigInt(u) << BigInt(i * 3));
                    }
                }
                return hash;
            };

            let seenStates = new Map();

            for (let i = 0; i < currentCount; i++) {
                let cScore = currentScores[i];
                let cTeamCount = currentTeamCounts[i];
                let cUsageOffset = i * charCount;

                // 選擇加入該隊伍的分支
                if (cTeamCount < maxAllowed) {
                    let u1 = currentUsages[cUsageOffset + b1Id] || 0;
                    let u2 = currentUsages[cUsageOffset + b2Id] || 0;
                    let u3 = currentUsages[cUsageOffset + b3Id] || 0;

                    if (u1 < limit1 && u2 < limit2 && u3 < limit3 && b1Id !== b2Id && b1Id !== b3Id && b2Id !== b3Id) {
                        let newTeamCount = cTeamCount + 1;
                        let newScore = cScore + currentScoreAdd;
                        let heuristic = getHeuristic(stepCount, maxAllowed - newTeamCount);
                        // 加上極小偏置值，同分時優先保留隊伍數多的
                        let newEval = newScore + heuristic + 0.0001; 
                        
                        let nUsageOffset = nextCount * charCount;
                        for(let k=0; k<charCount; k++) nextUsages[nUsageOffset + k] = currentUsages[cUsageOffset + k];
                        nextUsages[nUsageOffset + b1Id]++;
                        nextUsages[nUsageOffset + b2Id]++;
                        nextUsages[nUsageOffset + b3Id]++;

                        let stateHash = getUsageHash(nUsageOffset);
                        let existingEval = seenStates.get(stateHash);

                        if (existingEval === undefined || newEval > existingEval) {
                            seenStates.set(stateHash, newEval);
                            nextEvals[nextCount] = newEval;
                            nextScores[nextCount] = newScore;
                            nextTeamCounts[nextCount] = newTeamCount;
                            nextTeamId[nextCount] = candIdx;
                            nextParentId[nextCount] = i;
                            nextCount++;
                        }
                    }
                }

                // 不加入該隊伍的分支 (Skip)
                let skipHeuristic = getHeuristic(stepCount, maxAllowed - cTeamCount);
                let skipEval = cScore + skipHeuristic;
                
                let nUsageOffsetSkip = nextCount * charCount;
                for(let k=0; k<charCount; k++) nextUsages[nUsageOffsetSkip + k] = currentUsages[cUsageOffset + k];
                
                let skipHash = getUsageHash(nUsageOffsetSkip);
                let skipExistingEval = seenStates.get(skipHash);

                if (skipExistingEval === undefined || skipEval > skipExistingEval) {
                    seenStates.set(skipHash, skipEval);
                    nextEvals[nextCount] = skipEval;
                    nextScores[nextCount] = cScore;
                    nextTeamCounts[nextCount] = cTeamCount;
                    nextTeamId[nextCount] = -1; 
                    nextParentId[nextCount] = i;
                    nextCount++;
                }
            }

            if (nextCount > maxStatesReached) maxStatesReached = nextCount;

            let indices = new Int32Array(nextCount);
            for (let i = 0; i < nextCount; i++) indices[i] = i;
            
            indices.sort((a, b) => {
                let diff = nextEvals[b] - nextEvals[a];
                if (Math.abs(diff) > 0.00001) return diff;
                return nextTeamCounts[b] - nextTeamCounts[a];
            });

            currentCount = Math.min(finalBeamWidth, nextCount);
            
            let hTeam = historyTeamIdx[candIdx];
            let hParent = historyParentIdx[candIdx];

            for (let i = 0; i < currentCount; i++) {
                let idx = indices[i];
                currentEvals[i] = nextEvals[idx];
                currentScores[i] = nextScores[idx];
                currentTeamCounts[i] = nextTeamCounts[idx];
                
                let nOffset = idx * charCount;
                let cOffset = i * charCount;
                for(let k=0; k<charCount; k++) currentUsages[cOffset + k] = nextUsages[nOffset + k];
                
                hTeam[i] = currentTeamIdx[i] = nextTeamId[idx];
                hParent[i] = currentParentIdx[i] = nextParentId[idx];
            }
        }
        
        let finalOptimizedTeams = [];
        let traceIdx = 0; 
        for (let step = totalSteps - 1; step >= 0; step--) {
            let teamIndexInPool = historyTeamIdx[step][traceIdx];
            if (teamIndexInPool !== -1) {
                finalOptimizedTeams.unshift(teamsWithScore[teamIndexInPool].team);
            }
            traceIdx = historyParentIdx[step][traceIdx];
        }
        finalOptimizedTeams.reverse(); 
        
        updateProgress(100, t('自動編隊完成！'));
        setTimeout(() => document.getElementById('sim-progress-container').style.display='none', 800);

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
