// ==========================================
// 鳴潮矩陣編隊工具v4.7.6 [核心運算模組]
// 檔案：core.js
// 職責：資料存取、數學推演、DPS 計算、狀態管理
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
function t(str) { 
    if (!isSimp || !str || typeof str !== 'string' || typeof phraseDict === 'undefined') return str; 
    let res = str;
    for (let [tw, cn] of phraseDict) res = res.split(tw).join(cn);
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

// ==========================================
// 🛡️ 核心特權過濾器 (確保自訂隊伍不被忽略)
// ==========================================
function getBestPossibleRots(c1, c2, c3) {
    let possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3 && checkedRotations.has(d.id));
    possibleRots.sort((a, b) => {
        if (a.isUserCustom && !b.isUserCustom) return -1; // 自訂優先
        if (!a.isUserCustom && b.isUserCustom) return 1;
        return getRotDpsRange(b).min - getRotDpsRange(a).min;
    });
    return possibleRots;
}

function getUniqueValidTeams() {
    let validTeams = dpsData.filter(d => checkedRotations.has(d.id) && isOwned(d.c1) && isOwned(d.c2) && isOwned(d.c3));
    let map = new Map();
    validTeams.forEach(t => {
        let key = `${t.c1}-${t.c2}-${t.c3}`;
        if (!map.has(key)) map.set(key, t);
        else {
            let existing = map.get(key);
            if (t.isUserCustom && !existing.isUserCustom) map.set(key, t); // 自訂優先
            else if (t.isUserCustom === existing.isUserCustom && getRotDpsRange(t).min > getRotDpsRange(existing).min) map.set(key, t);
        }
    });
    return Array.from(map.values());
}

// --- 3. 資料初始化與存取 (Data Init & Storage) ---
function initCoreData() {
    let savedLang = localStorage.getItem('ww_lang');
    isSimp = (savedLang === 'zh-CN' || savedLang === '"zh-CN"');

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
        resTags: [
            document.getElementById('env-res-1') ? document.getElementById('env-res-1').value : "",
            document.getElementById('env-res-2') ? document.getElementById('env-res-2').value : "",
            document.getElementById('env-res-3') ? document.getElementById('env-res-3').value : "",
            document.getElementById('env-res-4') ? document.getElementById('env-res-4').value : ""
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
function runSimulations(env) {
    let simMode = document.getElementById('sim-mode') ? document.getElementById('sim-mode').value : 'auto';
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
                let possibleRots = getBestPossibleRots(c1, c2, c3); // 🛡️ 使用特權過濾器
                if (possibleRots.length > 0) {
                    let dpsRange = getRotDpsRange(possibleRots[0]);
                    
                    if (dpsRange.max <= 0) { 
                        rowResult.html = `<span style="color:#ff5252; font-weight:bold;">${t("DPS過低")}</span>`; 
                    } else {
                        let simulate = (hp, r, idx, dps) => {
                            let t_left = env.battleTime, dmg = 0, startStr = `R${r}-${idx}(${(hp/getBossMaxHP(r,idx)*100).toFixed(0)}%)`;
                            let loopGuard = 0;
                            while (t_left > 0 && loopGuard < 50) {
                                loopGuard++;
                                let isResisted = teamAttr && teamAttr === env.resTags[idx - 1];
                                let eff_dps = Math.max(0.0001, dps * (isResisted ? (1 - env.resPenalty / 100) : 1)); 
                                let ttk = hp / eff_dps;
                                if (ttk <= t_left) { dmg += hp; t_left -= (ttk + env.transTime); idx++; if (idx > 4) { r++; idx = 1; } hp = getBossMaxHP(r, idx); } 
                                else { dmg += eff_dps * t_left; hp -= eff_dps * t_left; t_left = 0; }
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

// --- 8. 進階推演與編隊功能 ---
function reverseInferAndOptimize() {
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
            let actualScore = parseFloat(scoreInput), ebRInt = parseInt(ebR), ebIdxInt = parseInt(ebIdx), ebHpPct = parseFloat(ebHp);
            let calculatedMinDps = 0; 
            
            let rotId = null;
            let possibleRots = getBestPossibleRots(c1, c2, c3); // 🛡️ 使用特權過濾器
            if (possibleRots.length > 0) rotId = possibleRots[0].id;

            if (!isNaN(actualScore) && actualScore > 0 && possibleRots.length > 0) {
                let dmg_left = actualScore / Math.max(0.0001, env.scoreRatio), kills = 0, effective_dmg_sum = 0, tmp_r = start_r, tmp_idx = start_idx, tmp_hp = start_hp, dmgDealtToKilledBosses = 0;
                let teamAttr = typeof charAttrMap !== 'undefined' ? charAttrMap[c1] : null;
                let loopGuard = 0;
                
                while (dmg_left > 0 && loopGuard < 50) {
                    loopGuard++;
                    let isResisted = teamAttr && teamAttr === env.resTags[tmp_idx - 1];
                    let r_factor = isResisted ? (1 - env.resPenalty / 100) : 1; 
                    if (r_factor <= 0) r_factor = 0.1;
                    
                    if (dmg_left >= tmp_hp) { 
                        dmg_left -= tmp_hp; dmgDealtToKilledBosses += tmp_hp; effective_dmg_sum += (tmp_hp / r_factor); 
                        kills++; tmp_idx++; if (tmp_idx > 4) { tmp_r++; tmp_idx = 1; } tmp_hp = getBossMaxHP(tmp_r, tmp_idx); 
                    } else {
                        effective_dmg_sum += (dmg_left / r_factor);
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

                let effective_time = env.battleTime - (kills * env.transTime), trueBaseDps = effective_time > 0 ? (effective_dmg_sum / effective_time) : 0;
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
                        newDps = originalBaseDps; newStab = currentStab;
                    } else if (restoredBaseDps > maxDps) {
                        newDps = restoredBaseDps; newStab = 100;
                    } else if (restoredBaseDps < minDps) {
                        newDps = originalBaseDps; newStab = (restoredBaseDps / originalBaseDps) * 100;
                    }
                    
                    customStatsMap[rotId] = { dps: newDps, stability: newStab, buff: currStats.buff || 0 }; 
                    calculatedMinDps = trueBaseDps; 
                } else if (rotId) { 
                    calculatedMinDps = getRotDpsRange(possibleRots[0]).min; 
                }
                
                let sim_dmg = actualScore / Math.max(0.0001, env.scoreRatio), sim_r = start_r, sim_idx = start_idx, sim_hp = start_hp;
                let simLoopGuard = 0;
                while (sim_dmg >= sim_hp && simLoopGuard < 50) { simLoopGuard++; sim_dmg -= sim_hp; sim_idx++; if (sim_idx > 4) { sim_r++; sim_idx = 1; } sim_hp = getBossMaxHP(sim_r, sim_idx); }
                if (sim_dmg > 0) sim_hp -= sim_dmg;
                start_r = sim_r; start_idx = sim_idx; start_hp = sim_hp;

            } else if (rotId) {
                calculatedMinDps = getRotDpsRange(possibleRots[0]).min;
                let dpsRange = getRotDpsRange(possibleRots[0]);
                let dps = dpsRange.min;
                let teamAttr = typeof charAttrMap !== 'undefined' ? charAttrMap[c1] : null;

                let t_left = env.battleTime;
                let simLoopGuard = 0;
                while (t_left > 0 && simLoopGuard < 50) {
                    simLoopGuard++;
                    let isResisted = teamAttr && teamAttr === env.resTags[start_idx - 1];
                    let eff_dps = Math.max(0.0001, dps * (isResisted ? (1 - env.resPenalty / 100) : 1)); 
                    let ttk = start_hp / eff_dps;
                    if (ttk <= t_left) { t_left -= (ttk + env.transTime); start_idx++; if (start_idx > 4) { start_r++; start_idx = 1; } start_hp = getBossMaxHP(start_r, start_idx); } 
                    else { start_hp -= eff_dps * t_left; t_left = 0; }
                }
            }

            currentTeams.push({ c1: c1, c2: c2, c3: c3, scoreInput: scoreInput, ebR: ebR, ebIdx: ebIdx, ebHp: ebHp, calculatedMinDps: calculatedMinDps });
        }
    });

    safeStorageSet('ww_custom_stats', customStatsMap); // ⚠️ 強制寫入硬碟永久保存

    if (currentTeams.length > 0) {
        let maxAllowed = parseInt(document.getElementById('team-count-select').value) || 16;
        let fillFromDB = confirm(t("是否要從資料庫自動填補剩下的空位？\n\n[確定]：保留現有隊伍，並自動用最高分隊伍填滿剩下的空位。\n[取消]：僅針對當前已有隊伍進行重新排序。"));
        
        let poolToPermute = [...currentTeams];

        if (fillFromDB) {
            let tempUsage = {};
            currentTeams.forEach(tData => {
                let b1 = getBase(tData.c1), b2 = getBase(tData.c2), b3 = getBase(tData.c3);
                tempUsage[b1] = (tempUsage[b1] || 0) + 1; tempUsage[b2] = (tempUsage[b2] || 0) + 1; tempUsage[b3] = (tempUsage[b3] || 0) + 1;
            });
            
            let validDBTeams = getUniqueValidTeams(); // 🛡️ 使用特權過濾器去重
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
                            c1: dbTeam.c1, c2: dbTeam.c2, c3: dbTeam.c3, scoreInput: "", ebR: "", ebIdx: "", ebHp: "", calculatedMinDps: getRotDpsRange(dbTeam).min 
                        });
                    }
                }
            }
        }

        let n = poolToPermute.length;
        let estValidCombos = 1;
        for (let i = 1; i <= n; i++) estValidCombos *= i;

        let opsPerSec = 2000000;
        let fullSearchSeconds = (estValidCombos / opsPerSec).toFixed(2);
        let comboString = estValidCombos > 100000000 ? (estValidCombos / 100000000).toFixed(2) + t(" 億") : (estValidCombos > 10000 ? (estValidCombos / 10000).toFixed(2) + t(" 萬") : estValidCombos);
        let fullTimeString = fullSearchSeconds < 0.1 ? t("小於 0.1 秒") + t(" (低階設備約 1 秒)") : fullSearchSeconds + t(" 秒");

        let suggestedDepth = estValidCombos <= 5000 ? estValidCombos : 500;
        let widthChoice = prompt(t(`洗牌引擎準備就緒！預計穿插重排 ${n} 隊。\n理論排列組合數約為：【${comboString}】種。\n全域搜索約需 ${fullTimeString}。\n\n請輸入搜尋深度 (Beam Width)。\n建議值：${suggestedDepth}。\n(註：若輸入大於組合數將執行全域搜索)：`), suggestedDepth.toString());
        if (widthChoice === null) return; 
        
        let beamWidth = parseInt(widthChoice);
        if (isNaN(beamWidth) || beamWidth <= 0) beamWidth = 500;

        let states = [{ score: 0, sequence: [], remaining: poolToPermute, r: 1, idx: 1, hp: getBossMaxHP(1, 1) }];

        for (let step = 0; step < n; step++) {
            let nextStates = [];
            for (let state of states) {
                for (let i = 0; i < state.remaining.length; i++) {
                    let team = state.remaining[i];
                    let t_left = env.battleTime, dmgDone = 0, tmp_r = state.r, tmp_idx = state.idx, tmp_hp = state.hp;
                    let teamAttr = typeof charAttrMap !== 'undefined' ? charAttrMap[team.c1] : null;
                    let loopGuard = 0;

                    while (t_left > 0 && loopGuard < 50) {
                        loopGuard++;
                        let isResisted = teamAttr && teamAttr === env.resTags[tmp_idx - 1];
                        let r_factor = isResisted ? (1 - env.resPenalty / 100) : 1;
                        let eff_dps = Math.max(0.0001, team.calculatedMinDps * r_factor);
                        let ttk = tmp_hp / eff_dps;

                        if (ttk <= t_left) { dmgDone += tmp_hp; t_left -= (ttk + env.transTime); tmp_idx++; if (tmp_idx > 4) { tmp_r++; tmp_idx = 1; } tmp_hp = getBossMaxHP(tmp_r, tmp_idx); } 
                        else { dmgDone += eff_dps * t_left; tmp_hp -= eff_dps * t_left; t_left = 0; }
                    }

                    let newRemaining = [...state.remaining];
                    newRemaining.splice(i, 1); 
                    nextStates.push({ score: state.score + dmgDone, sequence: [...state.sequence, team], remaining: newRemaining, r: tmp_r, idx: tmp_idx, hp: tmp_hp });
                }
            }
            nextStates.sort((a, b) => b.score - a.score);
            states = nextStates.slice(0, beamWidth);
        }

        let bestSequence = states[0].sequence;
        document.querySelectorAll('.char-select, .score-input, .end-boss-r, .end-boss-idx, .end-boss-hp').forEach(el => el.value = ""); 
        
        bestSequence.forEach((tData, index) => {
            if (index < maxAllowed && rows[index]) {
                let row = rows[index];
                let ss = row.querySelectorAll('select.char-select');
                ss[0].innerHTML = `<option value="${tData.c1}">${tData.c1}</option>`; ss[1].innerHTML = `<option value="${tData.c2}">${tData.c2}</option>`; ss[2].innerHTML = `<option value="${tData.c3}">${tData.c3}</option>`;
                ss[0].value = tData.c1; ss[1].value = tData.c2; ss[2].value = tData.c3;
            }
        });
        
        let successMsg = fillFromDB ? t("✅ 實戰反推與穿插最佳化完成，並已自動填補空位！") : t("✅ 實戰反推完成，已為您計算出能避開抗性與轉場浪費的最佳順序！");
        alert(successMsg);
    }
    updateTracker();
}

function autoBuildMaxDpsTeams() {
    let maxAllowed = parseInt(document.getElementById('team-count-select').value) || 16;
    let validTeams = getUniqueValidTeams(); // 🛡️ 使用特權過濾器
    
    if (validTeams.length === 0) return alert(t("沒有可用的排軸！請確認已勾選角色與排軸。"));

    let n = validTeams.length;
    let k = Math.min(maxAllowed, getMaxTeams({})); 

    let conflictCount = 0;
    let totalPairs = (n * (n - 1)) / 2;
    for (let i = 0; i < n; i++) {
        let t1 = validTeams[i], b1_1 = getBase(t1.c1), b1_2 = getBase(t1.c2), b1_3 = getBase(t1.c3);
        for (let j = i + 1; j < n; j++) {
            let t2 = validTeams[j], b2_1 = getBase(t2.c1), b2_2 = getBase(t2.c2), b2_3 = getBase(t2.c3);
            if ([b1_1, b1_2, b1_3].some(char => [b2_1, b2_2, b2_3].includes(char))) conflictCount++;
        }
    }
    let conflictRate = totalPairs > 0 ? conflictCount / totalPairs : 0;
    
    let estValidCombos = 1, currentAvail = n;
    for (let i = 0; i < k; i++) {
        if (currentAvail <= 0) { estValidCombos = 0; break; }
        estValidCombos *= currentAvail;
        currentAvail -= (1 + conflictRate * currentAvail);
    }
    let kFactorial = 1; for(let i = 1; i <= k; i++) kFactorial *= i;
    estValidCombos = Math.max(0, Math.floor(estValidCombos / kFactorial));

    let opsPerSec = 2000000;
    let fullSearchSeconds = (estValidCombos / opsPerSec).toFixed(2);
    let defaultBeamWidth = 500;
    let beamSearchOps = k * defaultBeamWidth * n;
    let beamSearchSeconds = (beamSearchOps / opsPerSec).toFixed(2);

    let comboString = estValidCombos > 100000000 ? (estValidCombos / 100000000).toFixed(2) + t(" 億") : (estValidCombos > 10000 ? (estValidCombos / 10000).toFixed(2) + t(" 萬") : estValidCombos);
    let fullTimeString = fullSearchSeconds < 0.1 ? t("小於 0.1 秒") + t(" (低階設備約 1 秒)") : fullSearchSeconds + t(" 秒");
    let beamTimeString = beamSearchSeconds < 0.1 ? t("小於 0.1 秒") + t(" (低階設備約 1 秒)") : beamSearchSeconds + t(" 秒");

    let modeChoice = prompt(t(`系統偵測到 ${n} 組可用排軸，預計編排 ${k} 隊。\n理論有效組合數約為：【${comboString}】種。\n\n⏳ 運算時間預估：\n- 全域搜索 (窮舉)：約需 ${fullTimeString}\n- 預設深度 (500)：約需 ${beamTimeString}\n\n請選擇編制策略：\n輸入 1 ➔ 追求【下限穩定度最高】\n輸入 2 ➔ 追求【上限理論值最高】\n輸入任意其他字元取消。`), "1");
    if (modeChoice !== "1" && modeChoice !== "2") return;
    
    let suggestedDepth = estValidCombos < 5000 && estValidCombos > 0 ? estValidCombos : 500;
    let widthChoice = prompt(t(`請輸入搜尋深度 (Beam Width)。\n\n建議值：${suggestedDepth}。\n(註：數值越大運算越久。若輸入大於組合數將執行全域搜索，請根據上方時間預估與設備效能斟酌)：`), suggestedDepth.toString());
    
    let beamWidth = parseInt(widthChoice);
    if (isNaN(beamWidth) || beamWidth <= 0) beamWidth = 500;
    
    let strategy = modeChoice === "1" ? 'min' : 'max';

    let states = [{ score: 0, teams: [], usage: {} }];
    let teamsWithScore = validTeams.map(t => ({ team: t, score: strategy === 'min' ? getRotDpsRange(t).min : getRotDpsRange(t).max })).filter(t => t.score > 0);
    
    teamsWithScore.sort((a, b) => b.score - a.score);
    
    for (let {team, score} of teamsWithScore) {
        let nextStates = [];
        let b1 = getBase(team.c1), b2 = getBase(team.c2), b3 = getBase(team.c3);
        let limit1 = charData[b1]?.max || 1, limit2 = charData[b2]?.max || 1, limit3 = charData[b3]?.max || 1;
        
        for (let state of states) {
            nextStates.push(state);
            if (state.teams.length < maxAllowed) {
                let u1 = state.usage[b1] || 0, u2 = state.usage[b2] || 0, u3 = state.usage[b3] || 0;
                if (u1 < limit1 && u2 < limit2 && u3 < limit3 && b1 !== b2 && b1 !== b3 && b2 !== b3) {
                    let newUsage = { ...state.usage };
                    newUsage[b1] = u1 + 1; newUsage[b2] = u2 + 1; newUsage[b3] = u3 + 1;
                    nextStates.push({ score: state.score + score, teams: [...state.teams, team], usage: newUsage });
                }
            }
        }
        nextStates.sort((a, b) => b.score - a.score);
        states = nextStates.slice(0, beamWidth);
    }
    
    let finalOptimizedTeams = states[0].teams; 
    finalOptimizedTeams.reverse(); 

    document.querySelectorAll('.char-select, .score-input, .end-boss-hp, .end-boss-r, .end-boss-idx').forEach(el => el.value=""); 
    let rows = document.querySelectorAll('#team-board tr');
    
    finalOptimizedTeams.forEach((tData, index) => { 
        if(rows[index] && index < maxAllowed) { 
            let ss = rows[index].querySelectorAll('select.char-select'); 
            ss[0].innerHTML = `<option value="${tData.c1}">${tData.c1}</option>`; ss[1].innerHTML = `<option value="${tData.c2}">${tData.c2}</option>`; ss[2].innerHTML = `<option value="${tData.c3}">${tData.c3}</option>`; 
            ss[0].value = tData.c1; ss[1].value = tData.c2; ss[2].value = tData.c3; 
        } 
    });
    
    updateTracker(); 
    let strategyName = strategy === 'min' ? t('下限穩定度') : t('上限理論值');
    alert(t(`配置完成！目標：[${strategyName}最高]。共組建 `) + finalOptimizedTeams.length + t(` 隊。`));
}
