// ==========================================
// 鳴潮矩陣編隊工具 - Beta 測試版核心邏輯 (效能優化版)
// ==========================================

if (typeof phraseDict !== 'undefined') phraseDict.sort((a, b) => b[0].length - a[0].length);
let isSimp = false;

// ==========================================
// 工具函式 (Utils)
// ==========================================
function t(str) { 
    if (!isSimp || !str || typeof str !== 'string' || typeof phraseDict === 'undefined') return str; 
    let res = str;
    for (let [tw, cn] of phraseDict) res = res.split(tw).join(cn);
    return res;
}

function translateDOM(node) {
    let walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
    let n;
    while(n = walker.nextNode()) {
        if (n.parentNode.tagName === 'SCRIPT' || n.parentNode.tagName === 'STYLE') continue;
        if (n.nodeValue.trim() !== '') {
            if (n.originalValue === undefined) n.originalValue = n.nodeValue;
            n.nodeValue = isSimp ? t(n.originalValue) : n.originalValue;
        }
    }
    document.querySelectorAll('input[placeholder], textarea[placeholder], option, td[data-label]').forEach(el => {
        if (el.tagName === 'OPTION' && el.label) {
            if (el.originalLabel === undefined) el.originalLabel = el.label;
            el.label = isSimp ? t(el.originalLabel) : el.originalLabel;
        }
        if (el.placeholder) {
            if (el.originalPlaceholder === undefined) el.originalPlaceholder = el.placeholder;
            el.placeholder = isSimp ? t(el.originalPlaceholder) : el.originalPlaceholder;
        }
        if (el.hasAttribute('data-label')) {
            if (el.originalDataLabel === undefined) el.originalDataLabel = el.getAttribute('data-label');
            el.setAttribute('data-label', isSimp ? t(el.originalDataLabel) : el.originalDataLabel);
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) { 
        clearTimeout(timeout); 
        timeout = setTimeout(() => func.apply(this, args), wait); 
    };
}

// 安全讀取 LocalStorage (避免 JSON parse 報錯崩潰)
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

// ==========================================
// 全域狀態 (State)
// ==========================================
let dpsData = [];
let rotIdCounter = 0;
let ownedCharacters = new Set();
let checkedRotations = new Set();
let show5Star = true, show4Star = true, showG1 = true, showG2 = true, showG3 = true;
let customStatsMap = {};
let diffStability = { '⚠️': 100, '⭐': 100, '🔵': 100, '🟩': 100, '🧩': 100 };
let bossHPMap = {};
let bossHPHistory = {};
let customRotations = [];
let savedLineups = [];

// 建立帶有防抖的更新函式，專給 Input 事件使用
const debouncedUpdateTracker = debounce(() => { updateTracker(); }, 300);
const debouncedRenderAndTrack = debounce(() => { renderRotations(); updateTracker(); updateToggleButtons(); }, 150);

// ==========================================
// 初始化模組 (Init)
// ==========================================
function initializeApp() {
    initDpsData(); 
    savedLineups = safeStorageGet('ww_saved_lineups', []);
    initBoard(); 
    
    isSimp = localStorage.getItem('ww_lang') === 'zh-CN';
    if (isSimp) document.getElementById('lang-toggle').innerText = "🌐 繁 / 简";
    
    // 初始化角色池
    let parsedRoster = safeStorageGet('ww_roster', null);
    if (Array.isArray(parsedRoster)) {
        parsedRoster.forEach(name => { if (charData[name] || ['光主','暗主','風主'].includes(name)) ownedCharacters.add(name); });
    } else {
        ownedCharacters = new Set(Object.keys(charData));
    }

    // 初始化排軸
    let parsedRots = safeStorageGet('ww_rotations', null);
    if (Array.isArray(parsedRots)) {
        const validIds = new Set(dpsData.map(d => d.id));
        parsedRots.forEach(id => { if (validIds.has(id)) checkedRotations.add(id); });
    } else {
        checkedRotations = new Set(dpsData.map(d => d.id));
    }

    customStatsMap = safeStorageGet('ww_custom_stats', {});
    
    let savedCount = localStorage.getItem('ww_display_count');
    if (savedCount && document.getElementById('team-count-select')) {
        document.getElementById('team-count-select').value = savedCount;
    }

    document.getElementById('skill-slider').value = 100; 
    updateMasterSkill();
    renderCheckboxes(); 
    renderRotations();
    
    // 初始化表格內容
    const savedTeams = safeStorageGet('ww_teams', null);
    if (Array.isArray(savedTeams)) {
        document.querySelectorAll('#team-board tr').forEach((r, i) => {
            if (savedTeams[i]) {
                let ss = r.querySelectorAll('select.char-select');
                if (savedTeams[i][0]) { ss[0].innerHTML = `<option value="${savedTeams[i][0]}">${t(savedTeams[i][0])}</option>`; ss[0].value = savedTeams[i][0]; }
                if (savedTeams[i][1]) { ss[1].innerHTML = `<option value="${savedTeams[i][1]}">${t(savedTeams[i][1])}</option>`; ss[1].value = savedTeams[i][1]; }
                if (savedTeams[i][2]) { ss[2].innerHTML = `<option value="${savedTeams[i][2]}">${t(savedTeams[i][2])}</option>`; ss[2].value = savedTeams[i][2]; }
            }
        });
    }
    
    updateTeamDisplayCount(); 
    updateToggleButtons(); 
    document.querySelectorAll('.tab-btn')[0].click(); 
    translateDOM(document.body);
}

function initDpsData() {
    if (typeof teamDB === 'undefined' || typeof charData === 'undefined') return;
    for (let c1 in teamDB) {
        teamDB[c1].forEach(tData => {
            dpsData.push({ id: 'rot_' + rotIdCounter++, c1: c1, c2: tData.c2, c3: tData.c3, dps: tData.dps, rot: tData.rot, diff: tData.diff, gen: charData[c1]?charData[c1].gen:1 });
        });
    }
    loadCustomRotations();
}

function loadCustomRotations() {
    customRotations = safeStorageGet('ww_custom_rotations_v2', []);
    customRotations.forEach(cr => {
        if(typeof charData !== 'undefined') {
            dpsData.push({ id: 'custom_rot_' + cr.id, c1: cr.c1, c2: cr.c2, c3: cr.c3, dps: cr.dps, rot: cr.rot, diff: cr.diff, gen: charData[cr.c1]?charData[cr.c1].gen:1, isUserCustom: true });
        }
    });
}

function initBoard() {
    const b = document.getElementById('team-board');
    let rOpts = `<option value="">R?</option>` + Array.from({length:10}, (_,i)=>`<option value="${i+1}">R${i+1}</option>`).join('');
    let idxOpts = `<option value="">${t("號?")}</option>` + [1,2,3,4].map(idx=>`<option value="${idx}">${idx}</option>`).join('');
    
    for(let i=1; i<=16; i++) {
        let tr = document.createElement('tr'); tr.className = 'draggable-row'; tr.draggable = true; 
        tr.innerHTML = `<td>${t("第")} ${i} ${t("隊")}</td>
                        <td data-label="⚔️ ${t('主C')}："><select class="char-select" onchange="updateTracker()"></select></td>
                        <td data-label="🗡️ ${t('副C')}："><select class="char-select" onchange="updateTracker()"></select></td>
                        <td data-label="🛡️ ${t('生存')}："><select class="char-select" onchange="updateTracker()"></select><button onclick="resetRowDps(this)" class="btn-reset-dps" style="margin-top:5px; padding:4px 8px; border-radius:4px; font-size:0.8em; background:#2b2b36; color:#aaa; border:1px solid #555; cursor:pointer;">🔄 ${t('重設預設')} DPS</button></td>
                        <td data-label="📊 ${t('實戰得分')} / ${t('殘血設定')}：">
                            <input type="number" class="score-input" placeholder="${t('實戰得分')}" oninput="debouncedUpdateTracker()"><br>
                            <div style="display:flex; justify-content:center; align-items:center; gap:4px; flex-wrap:wrap; margin-bottom:2px; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; border:1px solid var(--neon-green);">
                                <span>🎯尾王:</span><select class="hp-calc-select end-boss-r" onchange="updateTracker()">${rOpts}</select>
                                <span>-</span><select class="hp-calc-select end-boss-idx" onchange="updateTracker()">${idxOpts}</select>
                                <span>🩸剩(%):</span><input type="number" class="hp-calc-input end-boss-hp" placeholder="99~0" onchange="clampHpPct(this); updateTracker();">
                            </div>
                            <div style="font-size:0.7em; color:#888; text-align:center; margin-bottom:6px;">(範圍限制: 99.99 ~ 0.00%)</div>
                            <div class="res-chk-group" style="flex-wrap: wrap;">
                                <label><input type="checkbox" class="res-chk-1" onchange="updateTracker()">[1]</label>
                                <label><input type="checkbox" class="res-chk-2" onchange="updateTracker()">[2]</label>
                                <label><input type="checkbox" class="res-chk-3" onchange="updateTracker()">[3]</label>
                                <label><input type="checkbox" class="res-chk-4" onchange="updateTracker()">[4]</label>
                            </div>
                        </td>
                        <td data-label="🏁 ${t('推演戰果')}：" class="relay-result">-</td>`;
        b.appendChild(tr);
    }
    
    // Drag and Drop 邏輯
    let draggedRow = null;
    b.addEventListener('dragstart', e => { draggedRow = e.target.closest('tr'); if(draggedRow) draggedRow.classList.add('dragging'); });
    b.addEventListener('dragover', e => {
        e.preventDefault(); const targetRow = e.target.closest('tr');
        if(targetRow && targetRow !== draggedRow && targetRow.classList.contains('draggable-row')) {
            const bounding = targetRow.getBoundingClientRect();
            if(e.clientY - (bounding.y + bounding.height/2) > 0) targetRow.after(draggedRow); else targetRow.before(draggedRow);
            updateRowNumbers();
        }
    });
    b.addEventListener('dragend', e => { if(draggedRow) draggedRow.classList.remove('dragging'); draggedRow = null; updateRowNumbers(); debouncedRenderAndTrack(); });
}

// ==========================================
// 核心邏輯 - 拆解為三大區塊：Roster, Simulation, Dashboard
// ==========================================
function updateTracker() {
    initBossHPMap();
    let env = getEnvSettings();
    let usedCharacters = getUsedCharacters();

    // 1. 更新選單與數量追蹤
    updateRosterAndSelects(usedCharacters);

    // 2. 執行推演並渲染戰果
    let simResults = runSimulations(env);

    // 3. 渲染全局儀表板
    renderDashboard(simResults, env);
    
    saveData();
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

function updateRosterAndSelects(used) {
    document.querySelectorAll('#team-board tr').forEach(row => {
        if (row.classList.contains('hidden-row')) return; 
        let ss = row.querySelectorAll('select.char-select');
        let v1=ss[0].value, v2=ss[1].value, v3=ss[2].value;
        let bases = new Set([v1,v2,v3].filter(x=>x).map(x=>getBase(x)));
        
        ss.forEach((s, i) => {
            let h = buildOptionsHTML(i+1, v1, v2, v3, s.value, used, bases);
            if(s.innerHTML !== h) { 
                let old = s.value; 
                s.innerHTML = h; 
                s.value = old; 
            }
            s.style.borderColor = (s.value && used[getBase(s.value)] > charData[getBase(s.value)].max) ? '#ff5252' : '';
        });
    });

    const tracker = document.getElementById('tracker');
    if (tracker) {
        tracker.innerHTML = `<div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:12px; margin-bottom:15px; text-align:center; border:1px solid var(--gold);">📊 ${t('理論最大')}：<span style="color:var(--neon-green); font-size:1.2em; font-weight:bold;">${getMaxTeams({})}</span> | ⏳ ${t('剩餘可排')}：<span style="color:var(--gold); font-size:1.2em; font-weight:bold;">${getMaxTeams(used)}</span></div>`;
        let groups = { "surv": [], "dps": [] };
        ownedCharacters.forEach(name => { 
            let base = getBase(name); 
            if(charData[base]) { if(charData[base].type.includes("生存")) groups["surv"].push(name); else groups["dps"].push(name); }
        });

        ['surv', 'dps'].forEach(type => {
            if(groups[type].length > 0) {
                tracker.innerHTML += `<div class="type-title">${t(type==='surv'?'生存位':'一般角色')}</div>`;
                groups[type].sort((a,b) => {
                    let rA = charData[getBase(a)].max - (used[getBase(a)]||0), rB = charData[getBase(b)].max - (used[getBase(b)]||0);
                    if(rA > 0 && rB <= 0) return -1; if(rA <= 0 && rB > 0) return 1; return characterOrder.indexOf(a) - characterOrder.indexOf(b);
                }).forEach(name => {
                    let rem = charData[getBase(name)].max - (used[getBase(name)]||0);
                    tracker.innerHTML += `<div class="char-row"><span>${t(name)}</span><span class="count-badge ${rem<=0?'count-empty':''}">${rem<=0?t('耗盡'):rem}</span></div>`;
                });
            }
        });
    }
}

function runSimulations(env) {
    let simMode = document.getElementById('sim-mode') ? document.getElementById('sim-mode').value : 'auto';
    let results = {
        totalMatrixScoreMin: 0, totalMatrixScoreMax: 0, actualTotalScore: 0,
        totalManualBaseScore: 0, totalManualMaxScore: 0, simMode: simMode
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
        let ss = row.querySelectorAll('select.char-select'), c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value;
        let resTd = row.querySelector('.relay-result'), ebR = row.querySelector('.end-boss-r').value, ebIdx = row.querySelector('.end-boss-idx').value, ebHp = row.querySelector('.end-boss-hp').value;
        let chk_res = [
            row.querySelector('.res-chk-1') ? row.querySelector('.res-chk-1').checked : false, 
            row.querySelector('.res-chk-2') ? row.querySelector('.res-chk-2').checked : false, 
            row.querySelector('.res-chk-3') ? row.querySelector('.res-chk-3').checked : false, 
            row.querySelector('.res-chk-4') ? row.querySelector('.res-chk-4').checked : false
        ];

        let scoreInputVal = parseFloat(row.querySelector('.score-input').value);

        if (c1 && c2 && c3) {
            if (!isNaN(scoreInputVal)) results.actualTotalScore += scoreInputVal;

            if (simMode === 'auto') {
                let possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3 && checkedRotations.has(d.id));
                if (possibleRots.length > 0) {
                    possibleRots.sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min);
                    let dpsRange = getRotDpsRange(possibleRots[0]);
                    if (dpsRange.max <= 0) { resTd.innerHTML = `<span style="color:#ff5252; font-weight:bold;">${t("DPS過低")}</span>`; return; }

                    let simulate = (hp, r, idx, dps) => {
                        let t_left = env.battleTime, dmg = 0, startStr = `R${r}-${idx}(${(hp/getBossMaxHP(r,idx)*100).toFixed(0)}%)`;
                        let loopGuard = 0; // 防呆：避免無窮迴圈
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
                    auto_hp_min = resMin.hp; auto_r_min = resMin.r; auto_idx_min = resMin.idx; results.totalMatrixScoreMin += resMin.dmg * env.scoreRatio;
                    
                    let resMax = simulate(auto_hp_max, auto_r_max, auto_idx_max, dpsRange.max);
                    auto_hp_max = resMax.hp; auto_r_max = resMax.r; auto_idx_max = resMax.idx; results.totalMatrixScoreMax += resMax.dmg * env.scoreRatio;

                    resTd.innerHTML = `<span style="color:#aaa;">${t('下限')}: </span><span style="color:var(--gold);">${resMin.startStr} ➔ ${resMin.endStr}</span><br><span style="color:#aaa;">${t('上限')}: </span><span style="color:var(--neon-green);">${resMax.startStr} ➔ ${resMax.endStr}</span><br><span style="color:var(--neon-purple); font-weight:bold; font-size:1.1em;">${Math.floor(resMin.dmg * env.scoreRatio).toLocaleString()} ~ ${Math.floor(resMax.dmg * env.scoreRatio).toLocaleString()} ${t('分')}</span>`;
                } else { resTd.innerHTML = "-"; }
            } else if (simMode === 'manual') {
                let ebRInt = parseInt(ebR), ebIdxInt = parseInt(ebIdx), ebHpPct = parseFloat(ebHp);
                if (!isNaN(ebRInt) && !isNaN(ebIdxInt) && !isNaN(ebHpPct) && ebHpPct >= 0 && ebHpPct <= 99.99) {
                    let startDmg = getCumDmg(man_start_r, man_start_idx, man_start_hp_pct);
                    let endDmg = getCumDmg(ebRInt, ebIdxInt, ebHpPct);
                    let rowDmg = Math.max(0, endDmg - startDmg);
                    let baseScore = Math.floor(rowDmg * env.scoreRatio);
                    
                    let stagesCleared = (ebRInt - man_start_r) * 4 + (ebIdxInt - man_start_idx);
                    let timeBonus = Math.max(0, stagesCleared * 100 + 50);
                    let maxScore = baseScore + timeBonus;
                    
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
                    
                    resTd.innerHTML = `
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
                    resTd.innerHTML = `<span style="color:#ffaa00;">⚠️ ${t('需設定終點王與血量')}</span>`;
                }
            }
        } else { resTd.innerHTML = "-"; }
    });

    return results;
}

function renderDashboard(res, env) {
    let dashboard = document.getElementById('dashboard-scores');
    if (!dashboard) return;

    if (res.simMode === 'auto') {
        dashboard.innerHTML = `
            <div>
                <span style="color:var(--neon-green); font-weight:bold; font-size: 1.1em;">⚔️ ${t('自動推演區間 (依DPS)')}：</span><br>
                <span style="color:var(--neon-purple); font-weight:900; font-size:1.4em; text-shadow:0 0 10px rgba(207,0,255,0.5);">${Math.floor(res.totalMatrixScoreMin).toLocaleString()} ~ ${Math.floor(res.totalMatrixScoreMax).toLocaleString()} ${t('分')}</span>
            </div>
            <div style="width: 1px; height: 40px; background: var(--border-glass);"></div>
            <div>
                <span style="color:#ffaa00; font-weight:bold; font-size: 1.1em;">🎯 ${t('當前實戰總分')}：</span><br>
                <span style="color:#ffaa00; font-weight:900; font-size:1.4em;">${Math.floor(res.actualTotalScore).toLocaleString()} ${t('分')}</span>
            </div>
        `;
    } else {
        let confHtml = "";
        if (res.actualTotalScore > 0 && res.totalManualBaseScore > 0) {
            let conf = Math.max(0, (1 - Math.abs(res.actualTotalScore - res.totalManualBaseScore) / res.actualTotalScore) * 100);
            let color = conf >= 80 ? "var(--neon-green)" : "#ff5252";
            confHtml = `
                <div style="width: 1px; height: 40px; background: var(--border-glass);"></div>
                <div>
                    <span style="color:${color}; font-weight:bold; font-size: 1.1em;">📈 ${t('數據置信度')}：</span><br>
                    <span style="color:${color}; font-weight:900; font-size:1.4em;">${conf.toFixed(1)}%</span>
                </div>
            `;
        }

        dashboard.innerHTML = `
            <div style="flex: 1; min-width: 250px;">
                <span style="color:var(--gold); font-weight:bold; font-size: 1.1em;">🗺️ ${t('實戰總得分')}：</span><br>
                <span style="color:var(--gold); font-weight:900; font-size:1.4em;">${Math.floor(res.actualTotalScore).toLocaleString()} ${t('分')}</span>
            </div>
            <div style="width: 1px; height: 40px; background: var(--border-glass);"></div>
            <div style="flex: 1; min-width: 250px;">
                <span style="color:#aaa; font-weight:bold; font-size: 1.1em;">📊 ${t('殘血推演預估')}：</span><br>
                <span style="color:#aaa; font-weight:900; font-size:1.4em;">${Math.floor(res.totalManualBaseScore).toLocaleString()} ~ ${Math.floor(res.totalManualMaxScore).toLocaleString()} ${t('分')}</span>
            </div>
            ${confHtml}
        `;
    }
}

// ==========================================
// 其他輔助函式與互動邏輯
// ==========================================
function switchTab(pageId, btnElement) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    btnElement.classList.add('active');
    window.scrollTo(0, 0);
}

function toggleLang() { 
    isSimp = !isSimp; 
    safeStorageSet('ww_lang', isSimp ? 'zh-CN' : 'zh-TW');
    window.location.reload(); 
}

function updateMasterSkill() {
    let val = parseInt(document.getElementById('skill-slider').value); 
    document.getElementById('skill-display').innerText = val + '%';
    diffStability['⚠️'] = Math.max(0, 100 - (100 - val) * 1.8); diffStability['⭐'] = Math.max(0, 100 - (100 - val) * 1.4);
    diffStability['🔵'] = Math.max(0, 100 - (100 - val) * 1.1); diffStability['🟩'] = Math.max(0, 100 - (100 - val) * 0.8); diffStability['🧩'] = Math.max(0, 100 - (100 - val) * 1.0);
    debouncedRenderAndTrack();
}

function buildOptionsHTML(slotType, v1, v2, v3, curRaw, used, teamBases) {
    let html = `<option value="">-- ${slotType==1 ? t('主C') : slotType==2 ? t('副C') : t('生存')} --</option>`;
    let recs = new Map(), hasContext = (slotType === 1 && (v2 || v3)) || (slotType === 2 && (v1 || v3)) || (slotType === 3 && (v1 || v2));
    let availableDisplayChars = [];
    for (let name of ownedCharacters) { if (name === '漂泊者') { availableDisplayChars.push('光主', '暗主', '風主'); } else { availableDisplayChars.push(name); } }

    dpsData.forEach(d => {
        let match = hasContext ? ((slotType === 1 || !v1 || d.c1 === v1) && (slotType === 2 || !v2 || d.c2 === v2) && (slotType === 3 || !v3 || d.c3 === v3)) : checkedRotations.has(d.id);
        if(match) {
            let target = slotType==1 ? d.c1 : slotType==2 ? d.c2 : d.c3;
            if(availableDisplayChars.includes(target)) {
                let c1Avail = (slotType === 1) || (d.c1 === v1 || (used[getBase(d.c1)]||0) < (charData[getBase(d.c1)]?.max||1));
                let c2Avail = (slotType === 2) || (d.c2 === v2 || (used[getBase(d.c2)]||0) < (charData[getBase(d.c2)]?.max||1));
                let c3Avail = (slotType === 3) || (d.c3 === v3 || (used[getBase(d.c3)]||0) < (charData[getBase(d.c3)]?.max||1));
                if (!recs.has(target)) recs.set(target, { maxDPS: 0, buildable: false });
                if (c1Avail && c2Avail && c3Avail) { recs.get(target).buildable = true; let r = getRotDpsRange(d); if (r.min > recs.get(target).maxDPS) recs.get(target).maxDPS = r.min; }
            }
        }
    });

    if(recs.size > 0) {
        html += `<optgroup label="🔥 ${t('適配推薦')}">`;
        Array.from(recs.entries()).sort((a,b)=>b[1].maxDPS - a[1].maxDPS).forEach(([name, data]) => {
            let b = getBase(name), u = used[b]||0, m = charData[b]?.max||1, isEx = u >= m && getBase(curRaw)!==b;
            if(slotType==1 && isEx) return; 
            let tag = isEx ? ` 🛑[${t('耗盡')}]` : teamBases.has(b) && getBase(curRaw)!==b ? ` 🛑[${t('在隊')}]` : "";
            html += `<option value="${name}" class="recommended" ${tag?"disabled":""}>⭐ ${t(name)} ${data.buildable && data.maxDPS > 0 ? `(${data.maxDPS.toFixed(2)}w)` : ''}${tag}</option>`;
        });
        html += '</optgroup>';
    }
    
    html += `<optgroup label="🔸 ${t('其他角色')}">`;
    let validOthers = availableDisplayChars.filter(name => !recs.has(name) && !(used[getBase(name)] >= (charData[getBase(name)]?.max || 1) && getBase(curRaw) !== getBase(name)));
    validOthers.sort((a, b) => (slotType === 3 && charData[getBase(a)]?.type !== charData[getBase(b)]?.type) ? (charData[getBase(b)]?.type.includes("生存") ? 1 : -1) : (typeof characterOrder !== 'undefined' ? characterOrder.indexOf(getBase(a)) - characterOrder.indexOf(getBase(b)) : 0));
    validOthers.forEach(name => { let inTeam = teamBases.has(getBase(name)) && getBase(curRaw)!==getBase(name); html += `<option value="${name}" ${inTeam?'disabled':''}>${t(name)}${inTeam?` 🛑[${t('在隊')}]`:''}</option>`; });
    html += '</optgroup>'; return html;
}

function getMaxTeams(usedObj) {
    let baseRemains = {};
    for(let name of ownedCharacters) { let b = getBase(name); if(charData[b]) { let r = charData[b].max - (usedObj[b]||0); if(r>0) baseRemains[b] = r; } }
    let counts = Object.values(baseRemains), teams = 0;
    while(counts.length >= 3) { counts.sort((a,b)=>b-a); counts[0]--; counts[1]--; counts[2]--; teams++; counts = counts.filter(c=>c>0); }
    return Math.min(16, teams);
}

function getRotDpsRange(d) {
    let buffMult = customStatsMap[d.id] && customStatsMap[d.id].buff ? 1 + (customStatsMap[d.id].buff / 100) : 1;
    if (customStatsMap[d.id]) { let s = customStatsMap[d.id]; let max = s.dps * buffMult; return { min: Math.max(0, max * (s.stability / 100)), max: max, isCustom: true }; }
    let max = d.dps * buffMult; if (max === 0) return { min: 0, max: 0, isCustom: false };
    let diffKey = d.diff.includes('⚠️') ? '⚠️' : d.diff.includes('⭐') ? '⭐' : d.diff.includes('🔵') ? '🔵' : d.diff.includes('🟩') ? '🟩' : '🧩';
    let stab = diffStability[diffKey] !== undefined ? diffStability[diffKey] : 100;
    return { min: Math.max(0, max * (stab / 100)), max: max, isCustom: false };
}

function initBossHPMap() {
    let env = { r1_hp: parseFloat(document.getElementById('env-r1').value) || 400.89, r2_hp: parseFloat(document.getElementById('env-r2').value) || 783.56, r3_hp: parseFloat(document.getElementById('env-r3').value) || 1384.9, growth: (parseFloat(document.getElementById('env-growth').value) || 5) / 100 };
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
    renderIndividualHPPanel();
}

function renderIndividualHPPanel() {
    let container = document.getElementById('individual-hp-container'); if (!container) return; let html = '';
    for (let r = 1; r <= 10; r++) {
        for (let i = 1; i <= 4; i++) {
            let key = `R${r}-${i}`, data = bossHPMap[key], btnHtml = '', estHtml = '';
            if (bossHPHistory[key] && bossHPHistory[key].length >= 1) {
                let avg = bossHPHistory[key].reduce((sum, h) => sum + h.dmg, 0) / Math.max(0.0001, bossHPHistory[key].reduce((sum, h) => sum + h.pct, 0)); 
                estHtml = `<div style="color: #00ffaa; font-size: 0.75em; margin-top: 2px;">📊 ${t('預估')}: ${avg.toFixed(2)}W</div>`;
                
                if (bossHPHistory[key].length >= 3 && Math.abs(avg - getBaseEnvHP(r, i)) / getBaseEnvHP(r, i) > 0.10 && data && data.isDefault) {
                    btnHtml = `<button class="btn-calib" onclick="applyCalibratedHP('${key}', ${avg})">⚠️ ${t('套用校正')}</button>`;
                }
            }
            
            let safeValue = (data && data.value !== undefined) ? data.value : (typeof data === 'number' ? data : 400);
            let isCalibrated = data && data.isDefault === false;
            
            html += `<div class="hp-item"><span class="hp-label">${key}</span><input type="number" class="hp-input ${isCalibrated?'calibrated':''}" id="hp_${key}" value="${safeValue.toFixed(2)}" step="10" onchange="manualUpdateHP('${key}')">${estHtml}${btnHtml}</div>`;
        }
    }
    container.innerHTML = html;
}

function getBaseEnvHP(r, index) { let env = getEnvSettings(); if (r === 1) return env.r1_hp; if (r === 2) return index === 1 ? 546.67 : env.r2_hp; if (r === 3) return env.r3_hp; return env.r3_hp * (1 + env.growth * ((r - 4) * 4 + index)); }

function getBossMaxHP(r, index) { 
    let d = bossHPMap[`R${r}-${index}`];
    let safeValue = (d && d.value !== undefined) ? d.value : (typeof d === 'number' ? d : 400);
    return Math.max(0.1, safeValue); 
}

function manualUpdateHP(key) { let val = parseFloat(document.getElementById(`hp_${key}`).value); if (!isNaN(val) && val > 0) { bossHPMap[key] = { value: val, isDefault: false }; safeStorageSet('ww_boss_hp', bossHPMap); renderIndividualHPPanel(); updateTracker(); } }
function applyCalibratedHP(key, avgValue) { bossHPMap[key] = { value: avgValue, isDefault: false }; safeStorageSet('ww_boss_hp', bossHPMap); renderIndividualHPPanel(); updateTracker(); alert(t(`已成功校正為平均值`) + `：${avgValue.toFixed(2)} ` + t(`萬`) + `！`); }
function resetIndividualHP() { bossHPMap = {}; bossHPHistory = {}; try { localStorage.removeItem('ww_boss_hp'); localStorage.removeItem('ww_boss_hp_history'); } catch(e) {} initBossHPMap(); }

function getEnvSettings() { return { scoreRatio: parseFloat(document.getElementById('env-ratio').value) || 10, r1_hp: parseFloat(document.getElementById('env-r1').value) || 400.89, r2_hp: parseFloat(document.getElementById('env-r2').value) || 783.56, r3_hp: parseFloat(document.getElementById('env-r3').value) || 1384.9, growth: (parseFloat(document.getElementById('env-growth').value) || 5) / 100, transTime: parseFloat(document.getElementById('env-trans').value) || 1.5, battleTime: parseFloat(document.getElementById('env-time').value) || 120, resPenalty: parseFloat(document.getElementById('env-res').value) || 40 }; }

function saveData() { 
    safeStorageSet('ww_roster', [...ownedCharacters]); 
    safeStorageSet('ww_rotations', [...checkedRotations]); 
    let teams = []; 
    document.querySelectorAll('#team-board tr').forEach(r => teams.push([...r.querySelectorAll('select.char-select')].map(s=>s.value))); 
    safeStorageSet('ww_teams', teams); 
}

function updateRowNumbers() { document.querySelectorAll('#team-board tr').forEach((row, idx) => { const td = row.querySelector('td:first-child'); if(td) td.innerHTML = `${t("第")} ${idx + 1} ${t("隊")}`; }); }

function updateTeamDisplayCount() {
    let count = parseInt(document.getElementById('team-count-select').value) || 16;
    safeStorageSet('ww_display_count', count);
    
    let rows = document.querySelectorAll('#team-board tr');
    let needsTrackerUpdate = false;
    
    rows.forEach((row, index) => {
        if (index < count) {
            row.classList.remove('hidden-row');
        } else {
            if (!row.classList.contains('hidden-row')) {
                row.classList.add('hidden-row');
                let selects = row.querySelectorAll('select.char-select');
                let hasData = Array.from(selects).some(s => s.value !== "");
                if (hasData || row.querySelector('.score-input').value !== "") {
                    selects.forEach(s => s.value = "");
                    row.querySelector('.score-input').value = "";
                    row.querySelector('.end-boss-r').value = "";
                    row.querySelector('.end-boss-idx').value = "";
                    row.querySelector('.end-boss-hp').value = "";
                    row.querySelectorAll('input[type="checkbox"][class^="res-chk"]').forEach(c => c.checked = false);
                    needsTrackerUpdate = true;
                }
            }
        }
    });
    
    if (needsTrackerUpdate) updateTracker();
}

function renderRotations() {
    const container = document.getElementById('rotation-setup');
    if (!container) return;
    const valid = dpsData.filter(d => isOwned(d.c1) && isOwned(d.c2) && isOwned(d.c3));
    if(!valid.length) { container.innerHTML = `<p style="color:#888;">${t('請先在上方勾選擁有的角色，以解鎖可組建的排軸')}</p>`; return; }
    let groups = {}; valid.forEach(d => { if(!groups[d.c1]) groups[d.c1] = []; groups[d.c1].push(d); });
    let html = '';
    for(let c1 in groups) {
        html += `<div style="margin-bottom:15px; padding:12px; background:rgba(0,0,0,0.3); border-radius:12px; border-left: 4px solid var(--gold);"><strong style="color: var(--gold);">🎯 ${t(c1)}</strong><div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">`;
        groups[c1].sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min).forEach(d => {
            let r = getRotDpsRange(d), dpsStr = (r.max > 0 || r.isCustom) ? `[${r.min.toFixed(2)}~${r.max.toFixed(2)}w]` : t('[無預設/點擊自訂]'), colorStyle = r.isCustom ? 'color:var(--neon-green); text-decoration:underline dashed;' : (r.min < r.max ? 'color:var(--gold);' : 'color:#fff;');
            let searchStr = `${t(d.c1)} ${t(d.c2)} ${t(d.c3)} ${t(d.rot)} ${t(d.diff)}`.toLowerCase();
            html += `<div class="rot-row" data-search="${searchStr}" style="background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; font-size:0.9em; border: 1px solid var(--border-glass); display:inline-flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="chk_${d.id}" value="${d.id}" ${checkedRotations.has(d.id)?'checked':''} onchange="updateRotationState()">
                        <label for="chk_${d.id}" style="cursor:pointer; margin:0;">${t(d.diff)}</label>
                        <span onclick="openStatsModal(event, '${d.id}')" style="cursor:pointer; font-weight:bold; ${colorStyle};">${dpsStr}</span>
                        <label for="chk_${d.id}" style="cursor:pointer; margin:0;">${d.isUserCustom?'<b style="color:var(--neon-green)">['+t('自訂')+']</b> ':''}${t(d.c2)}/${t(d.c3)} (${t(d.rot)})</label>
                    </div>`;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

const debouncedFilterRotations = debounce(() => {
    let q = document.getElementById('rot-search').value.toLowerCase();
    document.querySelectorAll('#rotation-setup .rot-row').forEach(row => { 
        row.style.display = row.getAttribute('data-search').includes(q) ? 'inline-flex' : 'none'; 
    });
    document.querySelectorAll('#rotation-setup > div').forEach(g => { 
        g.style.display = Array.from(g.querySelectorAll('.rot-row')).some(l => l.style.display !== 'none') ? 'block' : 'none'; 
    });
    updateToggleButtons();
}, 150);

function filterRotations() { debouncedFilterRotations(); }

function toggleAllRotations() { 
    const b = Array.from(document.querySelectorAll('#rotation-setup input[type="checkbox"]')).filter(i => i.closest('div').style.display !== 'none'); 
    if(!b.length) return; 
    const a = b.some(i => i.checked); 
    b.forEach(i => i.checked = !a); 
    updateRotationState(); 
}

function toggleDifficulty(diff) { 
    const b = Array.from(document.querySelectorAll('#rotation-setup input[type="checkbox"]')).filter(i => i.closest('div').style.display !== 'none' && i.closest('div').innerText.includes(diff)); 
    if(!b.length) return; 
    const a = b.every(i => i.checked); 
    b.forEach(i => i.checked = !a); 
    updateRotationState(); 
}

function updateRotationState() { 
    checkedRotations.clear(); 
    document.querySelectorAll('#rotation-setup input:checked').forEach(i => checkedRotations.add(i.value)); 
    debouncedRenderAndTrack(); 
}

function reverseInferAndOptimize() {
    initBossHPMap(); let env = getEnvSettings(), currentTeams = [], rows = document.querySelectorAll('#team-board tr'), start_r = 1, start_idx = 1, start_hp = getBossMaxHP(1, 1);
    rows.forEach((row) => {
        if (row.classList.contains('hidden-row')) return;
        let ss = row.querySelectorAll('select.char-select'), c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value, scoreInput = row.querySelector('.score-input').value, ebR = row.querySelector('.end-boss-r').value, ebIdx = row.querySelector('.end-boss-idx').value, ebHp = row.querySelector('.end-boss-hp').value;
        let chk_res = [
            row.querySelector('.res-chk-1') ? row.querySelector('.res-chk-1').checked : false, 
            row.querySelector('.res-chk-2') ? row.querySelector('.res-chk-2').checked : false, 
            row.querySelector('.res-chk-3') ? row.querySelector('.res-chk-3').checked : false, 
            row.querySelector('.res-chk-4') ? row.querySelector('.res-chk-4').checked : false
        ];
        if (c1) { 
            let rotId = null, calculatedMinDps = 0, possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3 && checkedRotations.has(d.id));
            if (possibleRots.length > 0) { possibleRots.sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min); rotId = possibleRots[0].id; }
            let actualScore = parseFloat(scoreInput);
            if (!isNaN(actualScore) && actualScore > 0 && rotId) {
                let dmg_left = actualScore / Math.max(0.0001, env.scoreRatio), kills = 0, effective_dmg_sum = 0, tmp_r = start_r, tmp_idx = start_idx, tmp_hp = start_hp, dmgDealtToKilledBosses = 0;
                let loopGuard = 0;
                while (dmg_left > 0 && loopGuard < 50) {
                    loopGuard++;
                    let r_factor = chk_res[tmp_idx - 1] ? (1 - env.resPenalty / 100) : 1; if (r_factor <= 0) r_factor = 0.1; 
                    if (dmg_left >= tmp_hp) { dmg_left -= tmp_hp; dmgDealtToKilledBosses += tmp_hp; effective_dmg_sum += (tmp_hp / r_factor); kills++; tmp_idx++; if (tmp_idx > 4) { tmp_r++; tmp_idx = 1; } tmp_hp = getBossMaxHP(tmp_r, tmp_idx); } 
                    else {
                        effective_dmg_sum += (dmg_left / r_factor);
                        let ebRInt = parseInt(ebR), ebIdxInt = parseInt(ebIdx), ebHpPct = parseFloat(ebHp);
                        if (!isNaN(ebRInt) && !isNaN(ebIdxInt) && !isNaN(ebHpPct) && ebHpPct >= 0 && ebHpPct <= 99.99) {
                            let hKey = `R${ebRInt}-${ebIdxInt}`; if (!bossHPHistory[hKey]) bossHPHistory[hKey] = [];
                            let hp_factor = 1 - (ebHpPct / 100);
                            if (hp_factor <= 0) hp_factor = 0.0001; 
                            bossHPHistory[hKey].push({ dmg: (actualScore / env.scoreRatio) - dmgDealtToKilledBosses, pct: hp_factor });
                        }
                        tmp_hp -= dmg_left; dmg_left = 0;
                    }
                }
                let effective_time = env.battleTime - (kills * env.transTime), trueBaseDps = effective_time > 0 ? (effective_dmg_sum / effective_time) : 0;
                if (trueBaseDps > 0) { let currStats = customStatsMap[rotId] || { stability: 100, buff: 0 }; customStatsMap[rotId] = { dps: trueBaseDps, stability: currStats.stability, buff: currStats.buff }; calculatedMinDps = trueBaseDps * (currStats.stability / 100); }
                start_r = tmp_r; start_idx = tmp_idx; start_hp = tmp_hp;
            } else if (rotId) { calculatedMinDps = getRotDpsRange(possibleRots[0]).min; }
            currentTeams.push({ c1, c2, c3, scoreInput, ebR, ebIdx, ebHp, chk_res, calculatedMinDps });
        }
    });
    
    safeStorageSet('ww_custom_stats', customStatsMap); 
    safeStorageSet('ww_boss_hp_history', bossHPHistory);
    renderIndividualHPPanel(); renderRotations();
    
    if (currentTeams.length > 0) {
        currentTeams.sort((a, b) => b.calculatedMinDps - a.calculatedMinDps);
        document.querySelectorAll('.char-select, .score-input, .end-boss-r, .end-boss-idx, .end-boss-hp').forEach(el => el.value = ""); 
        document.querySelectorAll('input[type="checkbox"][class^="res-chk"]').forEach(c => c.checked = false);
        
        let maxAllowed = parseInt(document.getElementById('team-count-select').value) || 16;
        currentTeams.forEach((tData, index) => {
            if (index < maxAllowed && rows[index]) {
                let row = rows[index];
                let ss = row.querySelectorAll('select.char-select');
                ss[0].innerHTML = `<option value="${tData.c1}">${tData.c1}</option>`; ss[1].innerHTML = `<option value="${tData.c2}">${tData.c2}</option>`; ss[2].innerHTML = `<option value="${tData.c3}">${tData.c3}</option>`;
                ss[0].value = tData.c1; ss[1].value = tData.c2; ss[2].value = tData.c3;
                row.querySelector('.score-input').value = tData.scoreInput || ""; row.querySelector('.end-boss-r').value = tData.ebR || ""; row.querySelector('.end-boss-idx').value = tData.ebIdx || ""; row.querySelector('.end-boss-hp').value = tData.ebHp || "";
                tData.chk_res.forEach((res, i) => {
                    let chk = row.querySelector(`.res-chk-${i+1}`);
                    if(chk) chk.checked = res;
                });
            }
        });
        alert(t("✅ 實戰反推與無損洗牌完成！"));
    }
    updateTracker();
}

function autoBuildMaxDpsTeams() {
    if(!confirm(t("將清空當前編隊並自動生成極限陣容，確定執行？"))) return;
    let validTeams = dpsData.filter(d => checkedRotations.has(d.id) && isOwned(d.c1) && isOwned(d.c2) && isOwned(d.c3));
    validTeams.sort((a, b) => getRotDpsRange(b).min - getRotDpsRange(a).min);
    let charUsageCount = {}; for(let n in charData) charUsageCount[n] = 0;
    let finalOptimizedTeams = [];
    
    let maxAllowed = parseInt(document.getElementById('team-count-select').value) || 16;
    
    for (let team of validTeams) {
        let b1 = getBase(team.c1), b2 = getBase(team.c2), b3 = getBase(team.c3), u1 = charUsageCount[b1] || 0, u2 = charUsageCount[b2] || 0, u3 = charUsageCount[b3] || 0;
        if (u1 < (charData[b1]?.max||1) && u2 < (charData[b2]?.max||1) && u3 < (charData[b3]?.max||1)) { if (b1 === b2 || b1 === b3 || b2 === b3) continue; finalOptimizedTeams.push(team); charUsageCount[b1]=u1+1; charUsageCount[b2]=u2+1; charUsageCount[b3]=u3+1; }
        if (finalOptimizedTeams.length >= maxAllowed) break; 
    }
    document.querySelectorAll('.char-select, .score-input, .end-boss-hp, .end-boss-r, .end-boss-idx').forEach(el => el.value=""); 
    document.querySelectorAll('input[type="checkbox"][class^="res-chk"]').forEach(c => c.checked=false);
    let rows = document.querySelectorAll('#team-board tr');
    finalOptimizedTeams.forEach((tData, index) => { if(rows[index] && index < maxAllowed) { let ss = rows[index].querySelectorAll('select.char-select'); ss[0].innerHTML = `<option value="${tData.c1}">${tData.c1}</option>`; ss[1].innerHTML = `<option value="${tData.c2}">${tData.c2}</option>`; ss[2].innerHTML = `<option value="${tData.c3}">${tData.c3}</option>`; ss[0].value = tData.c1; ss[1].value = tData.c2; ss[2].value = tData.c3; } });
    updateTracker(); alert(t(`一鍵配置完成！共組建 `) + finalOptimizedTeams.length + t(` 隊。`));
}

function applyPreset() {
    let val = document.getElementById('preset-select').value; if(!val) return;
    let cs = val.split(','), rows = document.querySelectorAll('#team-board tr'), applied = false;
    let maxAllowed = parseInt(document.getElementById('team-count-select').value) || 16;
    
    for (let i = 0; i < maxAllowed; i++) {
        let r = rows[i];
        if (!r) continue;
        let ss = r.querySelectorAll('select.char-select');
        if(!ss[0].value && !ss[1].value && !ss[2].value) { ss[0].value=cs[0]; ss[1].value=cs[1]; ss[2].value=cs[2]; applied = true; break; }
    }
    if(!applied) alert(t("當前顯示的隊伍中已經沒有空位了！")); updateTracker();
}

function resetTeams() { if(!confirm(t("確定清空編隊表嗎？"))) return; document.querySelectorAll('.char-select, .score-input, .end-boss-hp, .end-boss-r, .end-boss-idx').forEach(el => el.value=""); document.querySelectorAll('input[type="checkbox"][class^="res-chk"]').forEach(c => c.checked=false); updateTracker(); }

function exportImage() {
    try {
        const rows = document.querySelectorAll('#team-board tr'); let completed = [];
        rows.forEach((r, i) => {
            if (r.classList.contains('hidden-row')) return;
            let ss = r.querySelectorAll('select.char-select'), resTd = r.querySelector('.relay-result');
            let scoreInput = r.querySelector('.score-input'), ebR = r.querySelector('.end-boss-r').value, ebIdx = r.querySelector('.end-boss-idx').value, ebHp = r.querySelector('.end-boss-hp').value;
            
            if(ss.length >= 3 && ss[0].value && ss[1].value && ss[2].value) {
                let resText = resTd ? resTd.innerText.replace(/\n/g, ' | ') : '';
                let score = scoreInput ? scoreInput.value : '';
                let finalScore = score ? `🎯 ${t('實得分')}: ${score}` : resText;
                
                let resInfo = [];
                if(r.querySelector('.res-chk-1') && r.querySelector('.res-chk-1').checked) resInfo.push("[1]");
                if(r.querySelector('.res-chk-2') && r.querySelector('.res-chk-2').checked) resInfo.push("[2]");
                if(r.querySelector('.res-chk-3') && r.querySelector('.res-chk-3').checked) resInfo.push("[3]");
                if(r.querySelector('.res-chk-4') && r.querySelector('.res-chk-4').checked) resInfo.push("[4]");
                if(resInfo.length > 0) finalScore += ` ⚠️ ${t('抗性')}: ${resInfo.join(",")}`;
                
                if(ebR && ebIdx && ebHp) finalScore += ` 🩸 ${t('終點')}: R${ebR}-${ebIdx}(${t('剩')}${ebHp}%)`;
                
                completed.push({id: i+1, c1: ss[0].value, c2: ss[1].value, c3: ss[2].value, res: finalScore});
            }
        });
        if(!completed.length) return alert(t("請先完成至少一支滿編隊伍！"));
        let box = document.createElement('div'); box.style = "position:absolute; left:-9999px; background:#1e1e24; color:#fff; padding:30px; border-radius:15px; width:1000px; font-family:'Segoe UI',sans-serif;";
        let h = `<h2 style="color:#d4af37; text-align:center; border-bottom:2px solid #d4af37; padding-bottom:10px;">${t("鳴潮矩陣實戰推演編隊表")}</h2><table style="width:100%; border-collapse:collapse; margin-top:20px; text-align:center; font-size:1.1em;">`;
        h += `<tr style="background:#3f3f4e; color:#d4af37;"><th>${t("關卡")}</th><th>${t("主輸出")}</th><th>${t("副C/輔助")}</th><th>${t("生存/輔助")}</th><th style="color:#00ffaa;">${t("推演戰果 / 實戰與環境資訊")}</th></tr>`;
        completed.forEach(tData => h += `<tr><td style="border:1px solid #555; padding:15px; font-weight:bold; color:#4caf50;">${t("第")} ${tData.id} ${t("隊")}</td><td style="border:1px solid #555; padding:15px;">${t(tData.c1)}</td><td style="border:1px solid #555; padding:15px;">${t(tData.c2)}</td><td style="border:1px solid #555; padding:15px;">${t(tData.c3)}</td><td style="border:1px solid #555; padding:15px; font-size:0.85em; text-align:left;">${tData.res}</td></tr>`);
        
        let scoreElem = document.getElementById('dashboard-scores');
        let currentScore = scoreElem ? scoreElem.innerText.replace(/\n/g, '  ') : '0 分';
        
        box.innerHTML = h + `</table><div style="margin-top:20px; text-align:right; color:#888; font-size:0.9em;">${t("全局數據統計")}：${currentScore} | ${t("生成時間")}：${new Date().toLocaleString()}</div>`;
        document.body.appendChild(box);
        html2canvas(box, { backgroundColor: '#1e1e24', scale: 2 }).then(c => { let l = document.createElement('a'); l.download = '鳴潮矩陣推演編隊表.png'; l.href = c.toDataURL('image/png'); l.click(); document.body.removeChild(box); });
    } catch(err) {
        alert(t("截圖失敗，請確定隊伍資料填寫完整。錯誤資訊：") + err.message);
    }
}

function submitToGoogleForm() {
    if(!confirm(t("您即將匿名提交當前表單上的數據，是否繼續？"))) return;
    try {
        let dataParams = []; let rows = document.querySelectorAll('#team-board tr');
        let env = getEnvSettings();
        dataParams.push("主C,副C,生存,實戰分數,真實DPS,終點王R,終點王隻數,剩餘血量%,推算王血量,王1抗,王2抗,王3抗,王4抗");
        
        rows.forEach((r) => {
            if (r.classList.contains('hidden-row')) return;
            let ss = r.querySelectorAll('select.char-select');
            let scoreInput = r.querySelector('.score-input');
            let score = scoreInput ? parseFloat(scoreInput.value) : NaN;
            let ebR = parseInt(r.querySelector('.end-boss-r').value), ebIdx = parseInt(r.querySelector('.end-boss-idx').value), ebHp = parseFloat(r.querySelector('.end-boss-hp').value);
            
            if(ss.length >= 3 && ss[0].value && ss[1].value && ss[2].value && !isNaN(score)) {
                let res1 = r.querySelector('.res-chk-1') && r.querySelector('.res-chk-1').checked ? 1 : 0;
                let res2 = r.querySelector('.res-chk-2') && r.querySelector('.res-chk-2').checked ? 1 : 0;
                let res3 = r.querySelector('.res-chk-3') && r.querySelector('.res-chk-3').checked ? 1 : 0;
                let res4 = r.querySelector('.res-chk-4') && r.querySelector('.res-chk-4').checked ? 1 : 0;
                
                let dmg_left = score / Math.max(0.0001, env.scoreRatio), kills = 0, effective_dmg_sum = 0, tmp_r = 1, tmp_idx = 1, tmp_hp = getBossMaxHP(1, 1), dmgDealtToKilledBosses = 0;
                let chk_res = [res1, res2, res3, res4];
                let calculatedTotalHP = 0;
                let loopGuard = 0;
                
                while (dmg_left > 0 && loopGuard < 50) { 
                    loopGuard++;
                    let r_factor = chk_res[tmp_idx - 1] ? (1 - env.resPenalty / 100) : 1; if (r_factor <= 0) r_factor = 0.1; 
                    if (dmg_left >= tmp_hp) {
                        dmg_left -= tmp_hp; dmgDealtToKilledBosses += tmp_hp; effective_dmg_sum += (tmp_hp / r_factor);
                        kills++; tmp_idx++; if (tmp_idx > 4) { tmp_r++; tmp_idx = 1; } tmp_hp = getBossMaxHP(tmp_r, tmp_idx);
                    } else {
                        effective_dmg_sum += (dmg_left / r_factor);
                        if (!isNaN(ebR) && !isNaN(ebIdx) && !isNaN(ebHp) && ebR === tmp_r && ebIdx === tmp_idx) {
                            let dmgDoneToEndBoss = (score / env.scoreRatio) - dmgDealtToKilledBosses;
                            let hp_factor = 1 - (ebHp / 100);
                            if (hp_factor <= 0) hp_factor = 0.0001; 
                            calculatedTotalHP = dmgDoneToEndBoss / hp_factor;
                        }
                        dmg_left = 0;
                    }
                }
                let effective_time = env.battleTime - (kills * env.transTime);
                let trueBaseDps = effective_time > 0 ? (effective_dmg_sum / effective_time) : 0;

                dataParams.push(`${ss[0].value},${ss[1].value},${ss[2].value},${score},${trueBaseDps.toFixed(2)},${ebR||''},${ebIdx||''},${ebHp||''},${calculatedTotalHP ? calculatedTotalHP.toFixed(2) : ''},${res1},${res2},${res3},${res4}`);
            }
        });
        if (dataParams.length === 1) return alert(t("請先在編隊表中填寫【實戰得分】！"));
        let csvReport = dataParams.join('\n');
        window.open(`https://docs.google.com/forms/d/e/1FAIpQLSfB2g_uLwL7D2O1uUuM1iEaWkO7q29Xm9eG-8yPqg6Vw/viewform?usp=pp_url&entry.956555135=${encodeURIComponent(csvReport)}`, '_blank');
    } catch(err) {
        alert(t("傳送失敗，錯誤資訊：") + err.message);
    }
}

function renderCheckboxes() {
    if(typeof characterOrder === 'undefined' || typeof charData === 'undefined') return;
    const grid = document.getElementById('roster-setup');
    grid.innerHTML = '<div id="roster-grid"></div>';
    const container = document.getElementById('roster-grid');
    characterOrder.forEach(name => {
        if(!charData[name]) return;
        let label = document.createElement('label');
        label.className = 'checkbox-item';
        label.style.borderLeft = charData[name].rarity === 5 ? '4px solid var(--gold)' : '4px solid #9b59b6';
        label.style.display = 'flex'; 
        label.innerHTML = `<input type="checkbox" value="${name}" ${ownedCharacters.has(name)?'checked':''} onchange="updateOwnedCharacters()"> ${t(name)}`;
        container.appendChild(label);
    });
    filterCharacters();
}

const debouncedFilterCharacters = debounce(() => {
    let q = document.getElementById('char-search').value.toLowerCase();
    document.querySelectorAll('.checkbox-item').forEach(l => {
        let inputEl = l.querySelector('input'); if (!inputEl) return;
        let name = inputEl.value, d = charData[name]; if (!d) return; 
        let searchTarget = name.toLowerCase() + t(name).toLowerCase();
        if (searchTarget.includes('漂泊者')) searchTarget += ' 光主 暗主 風主';
        let matchRarity = (d.rarity === 5 && show5Star) || (d.rarity === 4 && show4Star);
        let matchGen = (d.gen === 1 && showG1) || (d.gen === 2 && showG2) || (d.gen === 3 && showG3);
        let matchSearch = q === '' || searchTarget.includes(q);
        l.style.display = (matchSearch && matchRarity && matchGen) ? 'flex' : 'none';
    });
    updateToggleButtons();
}, 150);

function filterCharacters() { debouncedFilterCharacters(); }

function rosterCheckboxButton() {
    const visibleBoxes = Array.from(document.querySelectorAll('#roster-setup .checkbox-item')).filter(l => l.style.display !== 'none').map(l => l.querySelector('input'));
    if(!visibleBoxes.length) return;
    const anyChecked = visibleBoxes.some(i => i.checked);
    visibleBoxes.forEach(i => i.checked = !anyChecked); 
    updateOwnedCharacters();
}

function updateOwnedCharacters() { 
    ownedCharacters.clear(); 
    document.querySelectorAll('#roster-setup input:checked').forEach(i => ownedCharacters.add(i.value)); 
    debouncedRenderAndTrack(); 
}

// 啟動程式
initializeApp();
