// ==========================================
// 鳴潮矩陣編隊工具 - Beta 測試版 [核心運算模組]
// 檔案：beta_core.js
// 職責：資料存取、數學推演、DPS 計算、狀態管理
// ==========================================
// --- 0. 全域崩潰攔截系統 ---
let currentErrorInfo = null;

window.onerror = function(message, source, lineno, colno, error) {
    currentErrorInfo = {
        message: message,
        location: `${source} (行: ${lineno}, 列: ${colno})`,
        stack: error && error.stack ? error.stack.substring(0, 600) : '無堆疊追蹤',
        userAgent: navigator.userAgent,
        time: new Date().toLocaleString()
    };
    if (typeof showErrorModal === 'function') showErrorModal(currentErrorInfo);
    return false; 
};

window.addEventListener('unhandledrejection', function(event) {
    currentErrorInfo = {
        message: 'Promise 錯誤: ' + (event.reason ? event.reason.message || event.reason : '未知錯誤'),
        location: '非同步運算 (Async Rejection)',
        stack: event.reason && event.reason.stack ? event.reason.stack.substring(0, 600) : '無堆疊追蹤',
        userAgent: navigator.userAgent,
        time: new Date().toLocaleString()
    };
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
function t(str) { 
    if (!isSimp || !str || typeof str !== 'string' || typeof phraseDict === 'undefined') return str; 
    let res = str;
    for (let [tw, cn] of phraseDict) res = res.split(tw).join(cn);
    return res;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) { 
        clearTimeout(timeout); 
        timeout = setTimeout(() => func.apply(this, args), wait); 
    };
}

function safeStorageGet(key, fallback = null) {
    try {
        let item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch(e) {
        console.warn(`Storage Parse Error for ${key}:`, e);
        return fallback;
    }
}

function safeStorageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } 
    catch(e) { console.warn(`Storage Save Error for ${key}:`, e); }
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

// --- 3. 資料初始化與存取 (Data Init & Storage) ---
function initCoreData() {
    // 判斷語系
    let savedLang = localStorage.getItem('ww_lang');
    isSimp = (savedLang === 'zh-CN' || savedLang === '"zh-CN"');

    // 載入排軸與自訂資料
    if (typeof teamDB !== 'undefined' && typeof charData !== 'undefined') {
        for (let c1 in teamDB) {
            teamDB[c1].forEach(tData => {
                dpsData.push({ id: 'rot_' + rotIdCounter++, c1: c1, c2: tData.c2, c3: tData.c3, dps: tData.dps, rot: tData.rot, diff: tData.diff, gen: charData[c1]?charData[c1].gen:1 });
            });
        }
    }
    
    customRotations = safeStorageGet('ww_custom_rotations_v2', []);
    customRotations.forEach(cr => {
        if(typeof charData !== 'undefined') {
            dpsData.push({ id: 'custom_rot_' + cr.id, c1: cr.c1, c2: cr.c2, c3: cr.c3, dps: cr.dps, rot: cr.rot, diff: cr.diff, gen: charData[cr.c1]?charData[cr.c1].gen:1, isUserCustom: true });
        }
    });

    savedLineups = safeStorageGet('ww_saved_lineups', []);
    customStatsMap = safeStorageGet('ww_custom_stats', {});

    // 初始化角色池勾選狀態
    let parsedRoster = safeStorageGet('ww_roster', null);
    if (Array.isArray(parsedRoster)) {
        parsedRoster.forEach(name => { if (charData[name] || ['光主','暗主','風主'].includes(name)) ownedCharacters.add(name); });
    } else {
        ownedCharacters = new Set(Object.keys(charData));
    }

    // 初始化排軸勾選狀態
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
        resPenalty: parseFloat(document.getElementById('env-res').value) || 40 
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
                bossHPMap[key] = { 
                    value: (r === 1) ? env.r1_hp : (r === 2 && i === 1) ? 546.67 : (r === 2) ? env.r2_hp : (r === 3) ? env.r3_hp : env.r3_hp * (1 + env.growth * ((r - 4) * 4 + i)), 
                    isDefault: true 
                }; 
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
        if(s.value && s.closest('tr') && !s.closest('tr').classList.contains('hidden-row')) {
            used[getBase(s.value)]++; 
        }
    });
    return used;
}

function getMaxTeams(usedObj) {
    let baseRemains = {};
    for(let name of ownedCharacters) { 
        let b = getBase(name); 
        if(charData[b]) { 
            let r = charData[b].max - (usedObj[b]||0); 
            if(r>0) baseRemains[b] = r; 
        } 
    }
    let counts = Object.values(baseRemains), teams = 0;
    while(counts.length >= 3) { 
        counts.sort((a,b)=>b-a); 
        counts[0]--; counts[1]--; counts[2]--; 
        teams++; 
        counts = counts.filter(c=>c>0); 
    }
    return Math.min(16, teams);
}

// --- 5. 核心推演引擎 (The Simulation Engine) ---
function runSimulations(env) {
    let simMode = document.getElementById('sim-mode') ? document.getElementById('sim-mode').value : 'auto';
    let results = {
        totalMatrixScoreMin: 0, totalMatrixScoreMax: 0, actualTotalScore: 0,
        totalManualBaseScore: 0, totalManualMaxScore: 0, simMode: simMode, rowsData: []
    };

    let auto_r_min = 1, auto_idx_min = 1, auto_hp_min = getBossMaxHP(1, 1);
    let auto_r_max = 1, auto_idx_max = 1, auto_hp_max = getBossMaxHP(1, 1);
    let man_start_r = 1, man_start_idx = 1, man_start_hp_pct = 100;

    let getCumDmg = (r, idx, hpPct) => {
        let dmg = 0;
        for (let i = 1; i <= r; i++) {
            let maxJ = (i === r) ? idx : 4;
            for (let j = 1; j <= maxJ; j++) {
                let maxHp = getBossMaxHP(i, j);
                if (i === r && j === idx) dmg += maxHp * (1 - hpPct / 100);
                else dmg += maxHp;
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
        
        let chk_res = [
            row.querySelector('.res-chk-1') ? row.querySelector('.res-chk-1').checked : false, 
            row.querySelector('.res-chk-2') ? row.querySelector('.res-chk-2').checked : false, 
            row.querySelector('.res-chk-3') ? row.querySelector('.res-chk-3').checked : false, 
            row.querySelector('.res-chk-4') ? row.querySelector('.res-chk-4').checked : false
        ];

        if (c1 && c2 && c3) {
            rowResult.valid = true;
            if (!isNaN(scoreInputVal)) results.actualTotalScore += scoreInputVal;

            if (simMode === 'auto') {
                let possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3 && checkedRotations.has(d.id));
                if (possibleRots.length > 0) {
                    possibleRots.sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min);
                    let dpsRange = getRotDpsRange(possibleRots[0]);
                    
                    if (dpsRange.max <= 0) { 
                        rowResult.html = `<span style="color:#ff5252; font-weight:bold;">${t("DPS過低")}</span>`; 
                    } else {
                        let simulate = (hp, r, idx, dps) => {
                            let t_left = env.battleTime, dmg = 0, startStr = `R${r}-${idx}(${(hp/getBossMaxHP(r,idx)*100).toFixed(0)}%)`;
                            let loopGuard = 0;
                            while (t_left > 0 && loopGuard < 50) {
                                loopGuard++;
                                let eff_dps = Math.max(0.0001, dps * (chk_res[idx - 1] ? (1 - env.resPenalty / 100) : 1)); 
                                let ttk = hp / eff_dps;
                                if (ttk <= t_left) { 
                                    dmg += hp; t_left -= (ttk + env.transTime); 
                                    idx++; if (idx > 4) { r++; idx = 1; } 
                                    hp = getBossMaxHP(r, idx); 
                                } else { 
                                    dmg += eff_dps * t_left; hp -= eff_dps * t_left; t_left = 0; 
                                }
                            }
                            return { hp, r, idx, dmg, endStr: `R${r}-${idx}(${(hp/getBossMaxHP(r,idx)*100).toFixed(0)}%)`, startStr };
                        };
                        
                        let resMin = simulate(auto_hp_min, auto_r_min, auto_idx_min, dpsRange.min);
                        auto_hp_min = resMin.hp; auto_r_min = resMin.r; auto_idx_min = resMin.idx; 
                        results.totalMatrixScoreMin += resMin.dmg * env.scoreRatio;
                        
                        let resMax = simulate(auto_hp_max, auto_r_max, auto_idx_max, dpsRange.max);
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
                    
                    results.totalManualBaseScore += baseScore;
                    results.totalManualMaxScore += maxScore;
                    
                    let startStr = `R${man_start_r}-${man_start_idx}(${man_start_hp_pct === 100 ? '100%' : t('剩')+man_start_hp_pct.toFixed(2)+'%'})`;
                    let endStr = `R${ebRInt}-${ebIdxInt}(${t('剩')}${ebHpPct.toFixed(2)}%)`;
                    
                    let confHtml = "";
                    if (!isNaN(scoreInputVal) && scoreInputVal > 0) {
                        let conf = Math.max(0, (1 - Math.abs(scoreInputVal - baseScore) / scoreInputVal) * 100);
                        let cColor = conf >= 80 ? "var(--neon-green)" : "#ff5252";
                        let cIcon = conf >= 80 ? "✅" : "⚠️";
                        confHtml = `<div style="margin-top: 5px; color:${cColor}; font-size:0.9em;">${cIcon} ${t('單排置信度')}: <strong>${conf.toFixed(1)}%</strong></div>`;
                        if (conf < 70) {
                            confHtml += `<div style="color:#ff5252; font-size:0.8em;">⚠️ ${t('偏差過大，請確認血量或實戰得分')}</div>`;
                        }
                    }
                    
                    rowResult.html = `
                        <div style="text-align: left; padding: 4px;">
                            <div style="color:var(--neon-green); font-size: 1.05em;">✅ ${t('預估得分')}：<strong>${baseScore}</strong></div>
                            <div style="color:#aaa; font-size: 0.85em; margin: 4px 0;">📊 ${t('推演區間')}：${baseScore} ~ ${maxScore}</div>
                            <div style="color:var(--gold); font-size: 0.9em;">🎯 ${t('擊殺進度')}：<br>${startStr} ➔ ${endStr}</div>
                            ${confHtml}
                        </div>
                    `;
                    
                    man_start_r = ebRInt;
                    man_start_idx = ebIdxInt;
                    man_start_hp_pct = ebHpPct;
                } else {
                    rowResult.html = `<span style="color:#ffaa00;">⚠️ ${t('需設定終點王與血量')}</span>`;
                }
            }
        }
        results.rowsData.push(rowResult);
    });

    return results;
}
