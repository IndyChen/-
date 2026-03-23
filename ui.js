// ==========================================
// 鳴潮矩陣編隊工具 v4.8.2版 [畫面渲染與互動模組]
// 檔案：ui.js
// 職責：DOM 操作、事件監聽、畫面更新、圖表與彈窗
// ==========================================

// ==========================================
// --- 1. 防呆原生防抖事件綁定 ---
// ==========================================
let _trackerTimeout = null;
function debouncedUpdateTracker() {
    clearTimeout(_trackerTimeout);
    _trackerTimeout = setTimeout(() => { updateTracker(); }, 300);
}

let _renderTimeout = null;
function debouncedRenderAndTrack() {
    clearTimeout(_renderTimeout);
    _renderTimeout = setTimeout(() => { renderRotations(); updateTracker(); updateToggleButtons(); }, 150);
}

// ==========================================
// --- 2. 語系與 DOM 翻譯 ---
// ==========================================
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
    if (document.originalTitle === undefined) document.originalTitle = document.title;
    document.title = isSimp ? t(document.originalTitle) : document.originalTitle;
}

function toggleLang() { 
    isSimp = !isSimp; 
    try { localStorage.setItem('ww_lang', isSimp ? 'zh-CN' : 'zh-TW'); } catch(e){} 
    window.location.reload(); 
}

function switchTab(pageId, btnElement) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    btnElement.classList.add('active');
    window.scrollTo(0, 0);
}

// ==========================================
// --- 3. UI 按鈕與篩選器狀態控制 ---
// ==========================================
function toggleRarity(s) { 
    s == 5 ? show5Star = !show5Star : show4Star = !show4Star; 
    document.getElementById(`btn-${s}star`).classList.toggle(`active-${s}star`, s==5?show5Star:show4Star); 
    filterCharacters(); 
}

function toggleGen(g) { 
    if(g==1) showG1=!showG1; if(g==2) showG2=!showG2; if(g==3) showG3=!showG3; 
    document.getElementById(`btn-g${g}`).classList.toggle('active-gen', g==1?showG1:g==2?showG2:showG3); 
    filterCharacters(); 
}

function rosterCheckboxButton() {
    const visibleBoxes = Array.from(document.querySelectorAll('#roster-setup .checkbox-item')).filter(l => l.style.display !== 'none').map(l => l.querySelector('input'));
    if(!visibleBoxes.length) return;
    const anyChecked = visibleBoxes.some(i => i.checked);
    visibleBoxes.forEach(i => i.checked = !anyChecked); 
    updateOwnedCharacters();
}

function toggleAllRotations() { 
    const b = Array.from(document.querySelectorAll('#rotation-setup input[type="checkbox"]')).filter(i => i.closest('div').style.display !== 'none'); 
    if(!b.length) return; 
    const a = b.some(i => i.checked); 
    b.forEach(i => i.checked = !a); 
    updateRotationState(); 
}

function toggleDifficulty(diff) { 
    let idx = diff === '🟩' ? 1 : diff === '🔵' ? 2 : diff === '⭐' ? 3 : diff === '⚠️' ? 4 : 5;
    let btn = document.getElementById(`btn-diff-${idx}`);
    let activeClass = `active-diff-${idx}`;
    let isActive = btn.classList.contains(activeClass);
    let newState = !isActive;
    
    if (newState) btn.classList.add(activeClass);
    else btn.classList.remove(activeClass);
    
    const b = Array.from(document.querySelectorAll('#rotation-setup input[type="checkbox"]')).filter(i => i.closest('div').style.display !== 'none' && i.closest('div').innerText.includes(diff)); 
    b.forEach(i => i.checked = newState); 
    updateRotationState(); 
}

function updateToggleButtons() {
    const rBoxes = Array.from(document.querySelectorAll('#roster-setup .checkbox-item')).filter(l => l.style.display !== 'none').map(l => l.querySelector('input'));
    if (rBoxes.length > 0) {
        const rAnyChecked = rBoxes.some(i => i.checked);
        let rBtn = document.getElementById('roster-switch');
        if(rBtn) {
            rBtn.innerHTML = rAnyChecked ? "🗑️ " + t("清空角色勾選") : "☑️ " + t("全選可見角色");
            rBtn.className = rAnyChecked ? "btn-action-clear ratio-71" : "btn-action-all ratio-71";
        }
    }

    const rotBoxes = Array.from(document.querySelectorAll('#rotation-setup input[type="checkbox"]')).filter(i => i.closest('div').style.display !== 'none');
    if (rotBoxes.length > 0) {
        const rotAnyChecked = rotBoxes.some(i => i.checked);
        let rotBtn = document.getElementById('rot-all-btn');
        if(rotBtn) {
            rotBtn.innerHTML = rotAnyChecked ? "🗑️ " + t("清空可見排軸") : "☑️ " + t("全選可見排軸");
            rotBtn.className = rotAnyChecked ? "btn-action-clear ratio-71" : "btn-action-all ratio-71";
        }
    }
}

// ==========================================
// --- 4. 選單與清單渲染 (UI Rendering) ---
// ==========================================
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

function buildOptionsHTML(slotType, v1, v2, v3, curRaw, used, teamBases) {
    let html = `<option value="">-- ${slotType==1 ? t('主C') : slotType==2 ? t('副C') : t('生存')} --</option>`;
    let recs = new Map(), hasContext = (slotType === 1 && (v2 || v3)) || (slotType === 2 && (v1 || v3)) || (slotType === 3 && (v1 || v2));
    
    let availableDisplayChars = [];
    let availableSet = new Set(); 

    for (let name of ownedCharacters) { 
        if (name === '漂泊者') { 
            availableDisplayChars.push('光主', '暗主', '風主'); 
            availableSet.add('光主').add('暗主').add('風主'); 
        } else { 
            availableDisplayChars.push(name); 
            availableSet.add(name); 
        } 
    }

    dpsData.forEach(d => {
        let match = hasContext ? ((slotType === 1 || !v1 || d.c1 === v1) && (slotType === 2 || !v2 || d.c2 === v2) && (slotType === 3 || !v3 || d.c3 === v3)) : checkedRotations.has(d.id);
        if(match) {
            let target = slotType==1 ? d.c1 : slotType==2 ? d.c2 : d.c3;
            
            if(availableSet.has(target)) {
                let c1Avail = (slotType === 1) || (d.c1 === v1 || (used[getBase(d.c1)]||0) < (charData[getBase(d.c1)]?.max||1));
                let c2Avail = (slotType === 2) || (d.c2 === v2 || (used[getBase(d.c2)]||0) < (charData[getBase(d.c2)]?.max||1));
                let c3Avail = (slotType === 3) || (d.c3 === v3 || (used[getBase(d.c3)]||0) < (charData[getBase(d.c3)]?.max||1));
                if (!recs.has(target)) recs.set(target, { maxDPS: 0, buildable: false });
                if (c1Avail && c2Avail && c3Avail) { 
                    recs.get(target).buildable = true; 
                    let r = getRotDpsRange(d); 
                    if (r.min > recs.get(target).maxDPS) recs.get(target).maxDPS = r.min; 
                }
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
    
    validOthers.sort((a, b) => {
        let typeA = charData[getBase(a)]?.type || "";
        let typeB = charData[getBase(b)]?.type || "";
        if (slotType === 3 && typeA !== typeB) {
            return typeB.indexOf("生存") !== -1 ? 1 : -1;
        }
        return (typeof characterOrder !== 'undefined') ? characterOrder.indexOf(getBase(a)) - characterOrder.indexOf(getBase(b)) : 0;
    });

    validOthers.forEach(name => { 
        let inTeam = teamBases.has(getBase(name)) && getBase(curRaw)!==getBase(name); 
        html += `<option value="${name}" ${inTeam?'disabled':''}>${t(name)}${inTeam?` 🛑[${t('在隊')}]`:''}</option>`; 
    });
    html += '</optgroup>'; 
    return html;
}

function renderIndividualHPPanel() {
    let container = document.getElementById('individual-hp-container'); if (!container) return; let html = '';
    for (let r = 1; r <= 10; r++) {
        for (let i = 1; i <= 4; i++) {
            let key = `R${r}-${i}`, data = bossHPMap[key], btnHtml = '', estHtml = '';
            if (bossHPHistory[key] && bossHPHistory[key].length >= 1) {
                let validHistory = bossHPHistory[key].filter(h => !isNaN(h.dmg) && h.dmg > 0);
                if (validHistory.length >= 1) {
                    let avg = validHistory.reduce((sum, h) => sum + h.dmg, 0) / validHistory.length; 
                    estHtml = `<div style="color: #00ffaa; font-size: 0.75em; margin-top: 2px;">📊 ${t('預估')}: ${avg.toFixed(2)} ${t('萬')}</div>`;
                    
                    if (validHistory.length >= 3 && Math.abs(avg - getBaseEnvHP(r, i)) / getBaseEnvHP(r, i) > 0.05 && data && data.isDefault) {
                        btnHtml = `<button class="btn-calib" onclick="applyCalibratedHP('${key}', ${avg})">⚠️ ${t('套用校正')}</button>`;
                    }
                }
            }
            let safeValue = (data && data.value !== undefined) ? data.value : (typeof data === 'number' ? data : 400);
            let isCalibrated = data && data.isDefault === false;
            html += `<div class="hp-item"><span class="hp-label">${key}</span><input type="number" class="hp-input ${isCalibrated?'calibrated':''}" id="hp_${key}" value="${safeValue.toFixed(2)}" step="10" onchange="manualUpdateHP('${key}')">${estHtml}${btnHtml}</div>`;
        }
    }
    container.innerHTML = html;
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
                                <span>🩸剩(%):</span><input type="number" class="hp-calc-input end-boss-hp" placeholder="99.99~0" step="0.01" onchange="clampHpPct(this); updateTracker();">
                            </div>
                            <div style="font-size:0.7em; color:#888; text-align:center; margin-bottom:6px;">(範圍限制: 99.99 ~ 0.00%)</div>
                        </td>
                        <td data-label="🏁 ${t('推演戰果')}：" class="relay-result">-</td>`;
        b.appendChild(tr);
    }
    
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

function updateRowNumbers() { 
    document.querySelectorAll('#team-board tr').forEach((row, idx) => { 
        const td = row.querySelector('td:first-child'); 
        if(td) td.innerHTML = `${t("第")} ${idx + 1} ${t("隊")}`; 
    }); 
}

// ==========================================
// --- 5. Tracker 與儀表板更新 (Dashboard Updates) ---
// ==========================================
function updateTracker() {
    initBossHPMap();
    renderIndividualHPPanel();
    
    let env = getEnvSettings();
    let usedCharacters = getUsedCharacters();

    updateRosterAndSelects(usedCharacters);
    let simResults = runSimulations(env);
    
    document.querySelectorAll('#team-board tr').forEach((row, index) => {
        if (!row.classList.contains('hidden-row') && simResults.rowsData[index]) {
            let resTd = row.querySelector('.relay-result');
            if(resTd) resTd.innerHTML = simResults.rowsData[index].html;
        }
    });

    renderDashboard(simResults, env);
    saveData();
}

function updateRosterAndSelects(used) {
    document.querySelectorAll('#team-board tr').forEach(row => {
        if (row.classList.contains('hidden-row')) return; 
        let ss = row.querySelectorAll('select.char-select');
        let v1=ss[0].value, v2=ss[1].value, v3=ss[2].value;
        let bases = new Set([v1,v2,v3].filter(x=>x).map(x=>getBase(x)));
        
        ss.forEach((s, i) => {
            let h = buildOptionsHTML(i+1, v1, v2, v3, s.value, used, bases);
            if(s.innerHTML !== h) { let old = s.value; s.innerHTML = h; s.value = old; }
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

    const ps = document.getElementById('preset-select');
    let ph = `<option value="">-- ${t("選擇推薦配隊")} --</option>`;
    if (ps) {
        dpsData.filter(d => checkedRotations.has(d.id) && isOwned(d.c1) && isOwned(d.c2) && isOwned(d.c3) && 
            (activePresetAttrs.size===0 || activePresetAttrs.has(typeof charAttrMap !== 'undefined' ? charAttrMap[d.c1] : "未知")) &&
            (activePresetGens.size===0 || activePresetGens.has(d.gen.toString()))
        ).forEach(d => {
            let r = getRotDpsRange(d), dpsStr = (r.max > 0 || r.isCustom) ? `${r.min.toFixed(2)}~${r.max.toFixed(2)}w` : t('無DPS');
            ph += `<option value="${d.c1},${d.c2},${d.c3}">${t(d.c1)} + ${t(d.c2)} + ${t(d.c3)} (${dpsStr})</option>`;
        });
        ps.innerHTML = ph;
    }
}

// ==========================================
// --- 6. 互動與微調邏輯 (Interactions & Sliders) ---
// ==========================================
function updateOwnedCharacters() { 
    ownedCharacters.clear(); 
    document.querySelectorAll('#roster-setup input:checked').forEach(i => ownedCharacters.add(i.value)); 
    debouncedRenderAndTrack(); 
}

function updateRotationState() { 
    checkedRotations.clear(); 
    document.querySelectorAll('#rotation-setup input:checked').forEach(i => checkedRotations.add(i.value)); 
    debouncedRenderAndTrack(); 
}

let _filterCharTimeout = null;
function filterCharacters() {
    clearTimeout(_filterCharTimeout);
    _filterCharTimeout = setTimeout(() => {
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
}

let _filterRotTimeout = null;
function filterRotations() {
    clearTimeout(_filterRotTimeout);
    _filterRotTimeout = setTimeout(() => {
        let q = document.getElementById('rot-search').value.toLowerCase();
        document.querySelectorAll('#rotation-setup .rot-row').forEach(row => { 
            row.style.display = row.getAttribute('data-search').includes(q) ? 'inline-flex' : 'none'; 
        });
        document.querySelectorAll('#rotation-setup > div').forEach(g => { 
            g.style.display = Array.from(g.querySelectorAll('.rot-row')).some(l => l.style.display !== 'none') ? 'block' : 'none'; 
        });
        updateToggleButtons();
    }, 150);
}

function togglePresetAttr(attr) { activePresetAttrs.has(attr) ? activePresetAttrs.delete(attr) : activePresetAttrs.add(attr); document.querySelector(`button[data-attr="${attr}"]`).classList.toggle(`active-attr-${attr}`); debouncedRenderAndTrack(); }
function togglePresetGen(gen) { activePresetGens.has(gen) ? activePresetGens.delete(gen) : activePresetGens.add(gen); document.querySelector(`button[data-gen="${gen}"]`).classList.toggle(`active-gen`); debouncedRenderAndTrack(); }

function manualUpdateHP(key) { let val = parseFloat(document.getElementById(`hp_${key}`).value); if (!isNaN(val) && val > 0) { bossHPMap[key] = { value: val, isDefault: false }; safeStorageSet('ww_boss_hp', bossHPMap); renderIndividualHPPanel(); updateTracker(); } }
function applyCalibratedHP(key, avgValue) { bossHPMap[key] = { value: avgValue, isDefault: false }; safeStorageSet('ww_boss_hp', bossHPMap); renderIndividualHPPanel(); updateTracker(); alert(t(`已成功校正為平均值`) + `：${avgValue.toFixed(2)} ` + t(`萬`) + `！`); }
function resetIndividualHP() { bossHPMap = {}; bossHPHistory = {}; try { localStorage.removeItem('ww_boss_hp'); localStorage.removeItem('ww_boss_hp_history'); } catch(e) {} initBossHPMap(); renderIndividualHPPanel(); updateTracker(); }

// 🚀 全局操作達成率：加入物理下限與永久記憶
function updateMasterSkill() {
    let slider = document.getElementById('skill-slider');
    if (!slider) return;
    let val = parseInt(slider.value);

    // 🚀 物理下限防護：強制操作達成率最低只能到 50%，不允許歸零
    if (val < 50) { val = 50; slider.value = 50; }

    safeStorageSet('ww_skill_slider', val); // 🚀 狀態記憶：存入 localStorage
    
    let displayEl = document.getElementById('skill-display');
    if (displayEl) displayEl.innerText = val + '%';
    
    // 🚀 數學下限防護：為各難度設定絕對最低保底 (避免高難度掉到 0 傷害)
    diffStability['⚠️'] = Math.max(10, 100 - (100 - val) * 1.8); 
    diffStability['⭐'] = Math.max(20, 100 - (100 - val) * 1.4);
    diffStability['🔵'] = Math.max(30, 100 - (100 - val) * 1.1); 
    diffStability['🟩'] = Math.max(40, 100 - (100 - val) * 0.8); 
    diffStability['🧩'] = Math.max(50, 100 - (100 - val) * 1.0);

    if(document.getElementById('slider-diff-4')) {
        document.getElementById('slider-diff-4').value = diffStability['⚠️']; document.getElementById('val-diff-4').innerText = Math.round(diffStability['⚠️']) + '%';
        document.getElementById('slider-diff-3').value = diffStability['⭐']; document.getElementById('val-diff-3').innerText = Math.round(diffStability['⭐']) + '%';
        document.getElementById('slider-diff-2').value = diffStability['🔵']; document.getElementById('val-diff-2').innerText = Math.round(diffStability['🔵']) + '%';
        document.getElementById('slider-diff-1').value = diffStability['🟩']; document.getElementById('val-diff-1').innerText = Math.round(diffStability['🟩']) + '%';
        document.getElementById('slider-diff-5').value = diffStability['🧩']; document.getElementById('val-diff-5').innerText = Math.round(diffStability['🧩']) + '%';
    }
    debouncedRenderAndTrack();
}

function updateIndividualSkill(diffKey, val, displayId) {
    let num = parseInt(val);
    diffStability[diffKey] = num;
    if(document.getElementById(displayId)) document.getElementById(displayId).innerText = num + '%';
    debouncedRenderAndTrack();
}

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
                    needsTrackerUpdate = true;
                }
            }
        }
    });
    if (needsTrackerUpdate) updateTracker();
}

function applyPreset() {
    let val = document.getElementById('preset-select').value; if(!val) return;
    let cs = val.split(','), rows = document.querySelectorAll('#team-board tr'), applied = false;
    let maxAllowed = parseInt(document.getElementById('team-count-select').value) || 16;
    for (let i = 0; i < maxAllowed; i++) {
        let r = rows[i]; if (!r) continue;
        let ss = r.querySelectorAll('select.char-select');
        if(!ss[0].value && !ss[1].value && !ss[2].value) { ss[0].value=cs[0]; ss[1].value=cs[1]; ss[2].value=cs[2]; applied = true; break; }
    }
    if(!applied) alert(t("當前顯示的隊伍中已經沒有空位了！")); updateTracker();
}

function resetTeams() { 
    if(!confirm(t("確定清空編隊表嗎？"))) return; 
    document.querySelectorAll('.char-select, .score-input, .end-boss-hp, .end-boss-r, .end-boss-idx').forEach(el => el.value=""); 
    updateTracker(); 
}

function resetRowDps(btn) {
    let row = btn.closest('tr'); let ss = row.querySelectorAll('select.char-select');
    let c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value;
    if (!c1 || !c2 || !c3) return alert(t("請先排滿該隊伍的成員。"));
    let possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3);
    if(possibleRots.length > 0) { possibleRots.forEach(r => { delete customStatsMap[r.id]; }); safeStorageSet('ww_custom_stats', customStatsMap); row.querySelector('.score-input').value = ""; renderRotations(); updateTracker(); alert(t("已重設該隊伍的 DPS 為預設值。")); }
}

// ==========================================
// --- 7. Modals (彈窗邏輯 - 計算器、自訂編隊、資料管理) ---
// ==========================================
let speedTestCallback = null; 
let lastCalculatedStability = 100;

function openCalcModal(callback = null) { 
    speedTestCallback = callback; 
    let modal = document.getElementById('calc-modal');
    modal.style.display = 'flex'; 
    modal.style.zIndex = '2050'; 
    document.getElementById('calc-result').style.display = 'none'; 
    document.getElementById('calc-base-time').value = '';
    document.getElementById('calc-times').value = '';
}

function closeCalcModal() { 
    document.getElementById('calc-modal').style.display = 'none'; 
    speedTestCallback = null; 
}

function calculateStability() {
    let baseTime = parseFloat(document.getElementById('calc-base-time').value);
    let times = document.getElementById('calc-times').value.split(/[\n,]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
    if (isNaN(baseTime) || baseTime <= 0 || times.length < 2) { alert(t("請確認資料正確並輸入至少2筆。")); return; }
    let n = times.length, mean = times.reduce((a, b) => a + b, 0) / n, stdDev = Math.sqrt(times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
    let stability = Math.max(0, Math.min(100, ((baseTime / mean) * 100) - (stdDev * 1.5)));
    lastCalculatedStability = Math.round(stability);
    document.getElementById('calc-res-mean').innerText = mean.toFixed(2) + ' 秒'; document.getElementById('calc-res-std').innerText = stdDev.toFixed(2) + ' 秒';
    document.getElementById('calc-res-stab').innerText = lastCalculatedStability + ' %'; document.getElementById('calc-result').style.display = 'block';
}

function applyCalculatedStability() { 
    if (typeof speedTestCallback === 'function') {
        speedTestCallback(lastCalculatedStability);
    } else {
        document.getElementById('skill-slider').value = lastCalculatedStability; 
        if(typeof updateMasterSkill === 'function') updateMasterSkill(); 
    }
    closeCalcModal(); 
}

function openStatsModal(e, rotId) {
    e.preventDefault(); e.stopPropagation(); currentEditRotId = rotId;
    let d = dpsData.find(x => x.id === rotId); 
    document.getElementById('stats-modal-rot').innerText = `${t(d.c1)} + ${t(d.c2)} + ${t(d.c3)}`;
    
    let stats = customStatsMap[rotId];
    if (stats) { 
        document.getElementById('stats-dps').value = parseFloat(stats.dps).toFixed(2); 
        document.getElementById('stats-stab').value = parseFloat(stats.stability).toFixed(1); 
        document.getElementById('stats-nuke-cr').value = stats.nukeCR || '';
        document.getElementById('stats-nuke-loss').value = stats.nukeLoss || '';
        document.getElementById('stats-curve-k').value = stats.curvePoints ? JSON.stringify(stats.curvePoints) : (stats.curveK || ''); 
    } else { 
        document.getElementById('stats-dps').value = d.dps > 0 ? parseFloat(d.dps).toFixed(2) : ''; 
        document.getElementById('stats-stab').value = 100; 
        document.getElementById('stats-nuke-cr').value = '';
        document.getElementById('stats-nuke-loss').value = '';
        document.getElementById('stats-curve-k').value = ''; 
        document.getElementById('stats-burst-t').value = '';
        document.getElementById('stats-burst-d').value = '';
    }
    
    document.getElementById('magic-total-time').value = d.duration || 25;
    document.getElementById('magic-total-dmg').value = d.totalDmg || (d.dps && d.duration ? (d.dps * d.duration).toFixed(2) : '');

    document.getElementById('stats-modal').style.display = 'flex';
}

function openCustomTeamModal() {
    let m = document.getElementById('custom-team-modal');
    if (typeof charData === 'undefined') return;
    
    let charOpts = '';
    if (typeof characterOrder !== 'undefined') {
        characterOrder.forEach(n => { 
            if (n === '漂泊者') { charOpts += `<option value="光主">${t("光主")}</option><option value="暗主">${t("暗主")}</option><option value="風主">${t("風主")}</option>`; } 
            else if (charData[n]) { charOpts += `<option value="${n}">${t(n)}</option>`; } 
        });
    }

    m.innerHTML = `
        <div style="background:var(--bg-panel); backdrop-filter:blur(20px); padding:25px; border-radius:16px; border:1px solid var(--gold); width:450px; max-width:90%; max-height:85vh; overflow-y:auto; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="margin-top:0; color:var(--gold); text-align:center;">➕ ${t('新增自訂編隊')}</h3>
            
            <select id="ct-c1" class="char-select" style="margin-bottom:10px;"><option value="">-- ${t('選擇主輸出')} --</option>${charOpts}</select>
            <select id="ct-c2" class="char-select" style="margin-bottom:10px;"><option value="">-- ${t('選擇副C/輔助')} --</option>${charOpts}</select>
            <select id="ct-c3" class="char-select" style="margin-bottom:10px;"><option value="">-- ${t('選擇生存/輔助')} --</option>${charOpts}</select>
            
            <div style="display:flex; gap:8px; margin-bottom:10px; align-items: stretch;">
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                    <label style="color:#aaa; font-size:0.8em;">循環軸長 (秒) <span style="color:var(--neon-green)">*必填</span></label>
                    <input type="number" id="ct-duration" value="25" class="score-input" style="margin-bottom:0; border-color:var(--neon-green); color:var(--neon-green);">
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                    <label style="color:#aaa; font-size:0.8em;">預設 DPS (萬)</label>
                    <input type="number" id="ct-dps" placeholder="例: 6.5" class="score-input" style="margin-bottom:0;">
                </div>
            </div>

            <details style="margin-bottom: 10px; border-top: 1px dashed #ffaa00; padding-top: 10px;">
                <summary style="color:#ffaa00; font-size:0.9em; cursor:pointer; outline:none;">🎲 蒙地卡羅期望運算設定</summary>
                <div style="display:flex; gap:10px; margin-top:8px;">
                    <label style="flex:1; color:#fff; font-size:0.8em;">🎯 核心暴率(%): <input type="number" id="ct-nuke-cr" class="score-input" placeholder="例: 75" style="margin-top:4px; border-color:#ffaa00; color:#ffaa00;"></label>
                    <label style="flex:1; color:#fff; font-size:0.8em;">📉 未暴損失(萬): <input type="number" id="ct-nuke-loss" class="score-input" placeholder="例: 15" style="margin-top:4px; border-color:#ffaa00; color:#ffaa00;"></label>
                </div>
            </details>

            <details style="margin-bottom: 15px; border-top: 1px dashed var(--gold); padding-top: 10px;">
                <summary style="color:var(--gold); font-size:0.9em; cursor:pointer; outline:none;">📊 貼上動作排軸解析傷害曲線 (點擊展開)</summary>
                <div style="margin-top: 8px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 1px solid #555;">
                    
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <label style="flex:2; color:#aaa; font-size:0.75em; margin-bottom:0;">
                            解析模式:
                            <select id="ct-magic-parse-mode" class="score-input" style="width:100%; height:28px; padding:0 4px; margin-top:4px; margin-bottom:0; font-size:1em;">
                                <option value="auto">🤖 自動偵測 (2~3欄)</option>
                                <option value="2col">⚖️ 雙欄 (動作, 傷害)</option>
                                <option value="3col-dur">⏱️ 三欄 (動作, 耗時, 傷害)</option>
                                <option value="3col-time">⏳ 三欄 (動作, 出傷時間, 傷害)</option>
                            </select>
                        </label>
                        <label style="flex:1; color:#aaa; font-size:0.75em; margin-bottom:0;">
                            總傷害(萬):
                            <input type="number" id="ct-magic-total-dmg" class="score-input" placeholder="選填" step="1" style="width:100%; height:28px; padding:2px 4px; margin-top:4px; margin-bottom:0; font-size:1em;">
                        </label>
                    </div>

                    <div style="display:flex; gap:8px; margin-bottom: 8px;">
                        <label style="flex:1; color:#fff; font-size:0.75em;">
                            🕒 參考時間(%): <input type="number" id="ct-burst-t" class="score-input" style="margin-top:4px;" oninput="autoCalcK_CT()">
                        </label>
                        <label style="flex:1; color:#fff; font-size:0.75em;">
                            💥 累積總傷(%): <input type="number" id="ct-burst-d" class="score-input" style="margin-top:4px;" oninput="autoCalcK_CT()">
                        </label>
                        <label style="flex:1; color:#fff; font-size:0.75em;">
                            🧮 曲線參數: <input type="text" id="ct-curve-k" class="score-input" style="margin-top:4px; border-color:var(--neon-green); color:var(--neon-green);">
                        </label>
                    </div>
                    <textarea id="ct-magic-paste" placeholder="請依上方模式貼上排軸數值資料..." style="width:100%; height:80px; background:rgba(0,0,0,0.5); color:#fff; border:1px solid var(--border-glass); padding:8px; border-radius:6px; outline:none; font-family:monospace; resize:vertical; font-size:0.8em; box-sizing:border-box;"></textarea>
                    <button type="button" onclick="runMagicParser_CT()" style="width:100%; margin-top:8px; background:var(--gold); color:#000; font-weight:bold; border:none; padding:6px; border-radius:6px; cursor:pointer; box-shadow: 0 0 10px rgba(212, 175, 55, 0.4);">
                        📊 匯入解析並填入曲線參數與 DPS
                    </button>
                </div>
            </details>

            <select id="ct-diff" class="char-select" style="margin-bottom:20px;">
                <option value="🟩">🟩 ${t('輪椅')}</option><option value="🔵">🔵 ${t('中等')}</option><option value="⭐" selected>⭐ ${t('進階')}</option><option value="⚠️">⚠️ ${t('極難')}</option><option value="🧩">🧩 ${t('非主流')}</option>
            </select>
            
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('custom-team-modal').style.display='none'" class="btn-action-clear" style="flex:1; background:#555; border:none;">${t('取消')}</button>
                <button onclick="saveCustomTeam()" class="btn-action-all" style="flex:1;">${t('儲存')}</button>
            </div>
        </div>`;
        
    if (typeof translateDOM === 'function') translateDOM(m);
    m.style.display = 'flex';
}

function extractKeyframes(parsedPoints, d_total, t_total, mode) {
    let cumulativeDmg = 0;
    let cumulativeTime = 0;
    let normalizedPath = [{ t: 0, d: 0 }];
    
    for (let i = 0; i < parsedPoints.length; i++) {
        let currentT;
        if (parsedPoints[i].time !== null && parsedPoints[i].time !== undefined) {
            if (mode === '3col-dur') {
                cumulativeTime += parsedPoints[i].time;
                currentT = cumulativeTime / t_total;
            } else if (mode === '3col-time') {
                currentT = parsedPoints[i].time / t_total;
            } else {
                currentT = (i + 1) / parsedPoints.length;
            }
        } else {
            currentT = (i + 1) / parsedPoints.length;
        }
        
        currentT = Math.min(1.0, Math.max(0, currentT));
        
        cumulativeDmg += parsedPoints[i].dmg;
        let currentD = cumulativeDmg / d_total;
        normalizedPath.push({ t: currentT, d: currentD });
    }

    let keyframes = [{ t: 0, d: 0 }];
    let avgSlope = 1.0; 
    
    for (let i = 1; i < normalizedPath.length; i++) {
        let prev = normalizedPath[i - 1];
        let curr = normalizedPath[i];
        
        let t_diff = curr.t - prev.t;
        if (t_diff <= 0) t_diff = 0.0001;
        
        let slope = (curr.d - prev.d) / t_diff;
        
        if (slope > avgSlope * 2.5 || (curr.d - prev.d) > 0.08) {
            if (keyframes.length === 0 || Math.abs(keyframes[keyframes.length - 1].t - prev.t) > 0.02) {
                keyframes.push({ t: parseFloat(prev.t.toFixed(3)), d: parseFloat(prev.d.toFixed(3)) });
            }
            keyframes.push({ t: parseFloat(curr.t.toFixed(3)), d: parseFloat(curr.d.toFixed(3)) });
        }
    }
    
    if (Math.abs(keyframes[keyframes.length - 1].t - 1) > 0.01) {
        keyframes.push({ t: 1, d: 1 });
    }
    return keyframes;
}

function autoCalcK() {
    let tPct = parseFloat(document.getElementById('stats-burst-t').value);
    let dPct = parseFloat(document.getElementById('stats-burst-d').value);
    if (!isNaN(tPct) && !isNaN(dPct) && tPct > 0 && tPct < 100 && dPct > 0 && dPct < 100) {
        let calcK = Math.log(dPct / 100) / Math.log(tPct / 100);
        document.getElementById('stats-curve-k').value = Math.max(0.01, calcK).toFixed(3);
    }
}
function autoCalcK_CT() {
    let tPct = parseFloat(document.getElementById('ct-burst-t').value);
    let dPct = parseFloat(document.getElementById('ct-burst-d').value);
    if (!isNaN(tPct) && !isNaN(dPct) && tPct > 0 && tPct < 100 && dPct > 0 && dPct < 100) {
        let calcK = Math.log(dPct / 100) / Math.log(tPct / 100);
        document.getElementById('ct-curve-k').value = Math.max(0.01, calcK).toFixed(3);
    }
}

function runMagicParser_CT() {
    let mode = document.getElementById('ct-magic-parse-mode').value;
    let totalDmgStr = document.getElementById('ct-magic-total-dmg').value;
    let rawData = document.getElementById('ct-magic-paste').value;
    
    if (!rawData.trim()) return alert(t("請先在文字框貼上排軸資料！"));
    
    let lines = rawData.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return alert(t("資料過少，無法解析！"));

    let d_total = 0;
    let parsedPoints = [];

    lines.forEach(line => {
        let parts = line.replace(/[\s\t]+/g, '\t').split('\t'); 
        if (parts.length >= 2) {
            let dmgMatch = parts[parts.length - 1].replace(/,/g, '').match(/[\d.]+/);
            let timeVal = null;
            
            if (mode === '3col-time' || mode === '3col-dur') {
                dmgMatch = parts.length >= 3 ? parts[2].replace(/,/g, '').match(/[\d.]+/) : dmgMatch;
                let timeMatch = parts.length >= 3 ? parts[1].replace(/,/g, '').match(/[\d.]+/) : null;
                if (timeMatch) timeVal = parseFloat(timeMatch[0]);
            }
            
            if (dmgMatch) {
                let dmgVal = parseFloat(dmgMatch[0]);
                parsedPoints.push({ raw: line, dmg: dmgVal, time: timeVal });
                d_total += dmgVal;
            }
        }
    });

    if (parsedPoints.length < 2) return alert(t("無法從貼上的文字中辨識出有效的數值格式！"));
    if (totalDmgStr && !isNaN(parseFloat(totalDmgStr))) d_total = parseFloat(totalDmgStr);

    let t_total = parseFloat(document.getElementById('ct-duration').value) || 25;
    let inferredDps = d_total / t_total;
    document.getElementById('ct-dps').value = inferredDps.toFixed(2);

    let maxPoint = parsedPoints.reduce((max, p) => p.dmg > max.dmg ? p : max, parsedPoints[0]);
    let burstDmgPct = (maxPoint.dmg / d_total) * 100;
    document.getElementById('ct-burst-t').value = 60;
    document.getElementById('ct-burst-d').value = burstDmgPct.toFixed(1);

    let keyframes = extractKeyframes(parsedPoints, d_total, t_total, mode);
    document.getElementById('ct-curve-k').value = JSON.stringify(keyframes);

    let pointCount = keyframes.length;
    alert(t("解析完成。\n共擷取 ") + pointCount + t(" 個特徵轉折點，\n已套用多點線性插值矩陣。"));
}

function runMagicParser() {
    let mode = document.getElementById('magic-parse-mode').value;
    let totalTimeStr = document.getElementById('magic-total-time').value;
    let totalDmgStr = document.getElementById('magic-total-dmg').value;
    let rawData = document.getElementById('magic-paste-area').value;
    
    if (!rawData.trim()) return alert(t("請先在文字框貼上排軸資料！"));
    
    let lines = rawData.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return alert(t("資料過少，無法解析！"));

    let t_total = parseFloat(totalTimeStr) || 25; 
    let d_total = 0;
    let parsedPoints = [];

    lines.forEach(line => {
        let parts = line.replace(/[\s\t]+/g, '\t').split('\t'); 
        if (parts.length >= 2) {
            let dmgMatch = parts[parts.length - 1].replace(/,/g, '').match(/[\d.]+/);
            let timeVal = null;
            
            if (mode === '3col-time' || mode === '3col-dur') {
                dmgMatch = parts.length >= 3 ? parts[2].replace(/,/g, '').match(/[\d.]+/) : dmgMatch;
                let timeMatch = parts.length >= 3 ? parts[1].replace(/,/g, '').match(/[\d.]+/) : null;
                if (timeMatch) timeVal = parseFloat(timeMatch[0]);
            }
            
            if (dmgMatch) {
                let dmgVal = parseFloat(dmgMatch[0]);
                parsedPoints.push({ raw: line, dmg: dmgVal, time: timeVal });
                d_total += dmgVal;
            }
        }
    });

    if (parsedPoints.length < 2) return alert(t("無法從貼上的文字中辨識出有效的數值格式！"));
    if (totalDmgStr && !isNaN(parseFloat(totalDmgStr))) d_total = parseFloat(totalDmgStr);

    let maxPoint = parsedPoints.reduce((max, p) => p.dmg > max.dmg ? p : max, parsedPoints[0]);
    let burstDmgPct = (maxPoint.dmg / d_total) * 100;
    
    document.getElementById('stats-burst-t').value = 60;
    document.getElementById('stats-burst-d').value = burstDmgPct.toFixed(1);
    
    let keyframes = extractKeyframes(parsedPoints, d_total, t_total, mode);
    document.getElementById('stats-curve-k').value = JSON.stringify(keyframes);

    let pointCount = keyframes.length;
    alert(t("解析完成。\n共擷取 ") + pointCount + t(" 個特徵轉折點，\n已套用多點線性插值矩陣。"));
}

function saveCustomTeam() {
    let c1 = document.getElementById('ct-c1').value, c2 = document.getElementById('ct-c2').value, c3 = document.getElementById('ct-c3').value;
    let dps = parseFloat(document.getElementById('ct-dps').value) || 0, diff = document.getElementById('ct-diff').value;
    let duration = parseFloat(document.getElementById('ct-duration').value) || 25; 
    
    let curveKVal = document.getElementById('ct-curve-k') ? document.getElementById('ct-curve-k').value : "";
    let nukeCrVal = document.getElementById('ct-nuke-cr') ? parseFloat(document.getElementById('ct-nuke-cr').value) || 0 : 0;
    let nukeLossVal = document.getElementById('ct-nuke-loss') ? parseFloat(document.getElementById('ct-nuke-loss').value) || 0 : 0;
    
    if (!c1 || !c2 || !c3) return alert(t('請完整選擇三名角色！'));
    if (dps <= 0) return alert(t('請輸入有效大於0的 DPS！(或透過匯入排軸自動產生)'));
    
    let totalDmg = dps * duration; 
    let newId = Date.now(), internalId = 'custom_rot_' + newId;
    let newRot = { id: newId, c1: c1, c2: c2, c3: c3, dps: dps, rot: "自訂", diff: diff, duration: duration, totalDmg: totalDmg };
    
    customRotations.push(newRot); 
    safeStorageSet('ww_custom_rotations_v2', customRotations);
    
    let genVal = charData[getBase(c1)] ? charData[getBase(c1)].gen : 1;
    dpsData.push({ id: internalId, c1: c1, c2: c2, c3: c3, dps: dps, rot: "自訂", diff: diff, gen: genVal, isUserCustom: true, duration: duration, totalDmg: totalDmg });
    
    if (curveKVal || nukeCrVal > 0) {
        let diffKey = diff.includes('⚠️') ? '⚠️' : diff.includes('⭐') ? '⭐' : diff.includes('🔵') ? '🔵' : diff.includes('🟩') ? '🟩' : '🧩';
        let isArray = curveKVal.trim().startsWith('[');
        let parsedPointsArray = null;
        
        if (isArray) {
            try { 
                parsedPointsArray = JSON.parse(curveKVal); 
            } catch (e) { 
                return alert(t("⚠️ 特徵陣列格式錯誤，請確認 JSON 格式！(或清空以使用預設值)")); 
            }
        }
        
        customStatsMap[internalId] = {
            dps: dps,
            stability: diffStability[diffKey] || 100,
            buff: 0,
            nukeCR: nukeCrVal,
            nukeLoss: nukeLossVal,
            curveK: isArray ? null : curveKVal,
            curvePoints: parsedPointsArray
        };
        safeStorageSet('ww_custom_stats', customStatsMap);
    }

    checkedRotations.add(internalId);
    safeStorageSet('ww_rotations', [...checkedRotations]);

    ownedCharacters.add(getBase(c1)); ownedCharacters.add(getBase(c2)); ownedCharacters.add(getBase(c3));
    safeStorageSet('ww_roster', [...ownedCharacters]);
    document.querySelectorAll('#roster-setup input[type="checkbox"]').forEach(chk => {
        if ([getBase(c1), getBase(c2), getBase(c3)].includes(chk.value)) chk.checked = true;
    });

    document.getElementById('custom-team-modal').style.display = 'none'; 
    debouncedRenderAndTrack(); 
    alert(t('自訂編隊已成功加入！'));
}

function closeStatsModal() { document.getElementById('stats-modal').style.display = 'none'; currentEditRotId = null; }
function clearStatsModal() { if (currentEditRotId) { delete customStatsMap[currentEditRotId]; safeStorageSet('ww_custom_stats', customStatsMap); debouncedRenderAndTrack(); } closeStatsModal(); }

function saveStatsModal() {
    let dpsVal = parseFloat(document.getElementById('stats-dps').value);
    let stabVal = parseFloat(document.getElementById('stats-stab').value);
    let nukeCrVal = parseFloat(document.getElementById('stats-nuke-cr').value) || 0;
    let nukeLossVal = parseFloat(document.getElementById('stats-nuke-loss').value) || 0;
    let curveKVal = document.getElementById('stats-curve-k').value;

    if (isNaN(dpsVal) || isNaN(stabVal)) return alert(t("請輸入有效的數字！"));
    
    if (currentEditRotId) { 
        let isArray = curveKVal.trim().startsWith('[');
        let parsedPointsArray = null;
        
        if (isArray) {
            try { 
                parsedPointsArray = JSON.parse(curveKVal); 
            } catch (e) { 
                return alert(t("⚠️ 特徵陣列格式錯誤，請確認 JSON 格式！(或清空以使用預設值)")); 
            }
        }
        
        customStatsMap[currentEditRotId] = { 
            dps: dpsVal, 
            stability: Math.min(100, Math.max(0, stabVal)), 
            buff: 0,
            nukeCR: nukeCrVal,
            nukeLoss: nukeLossVal,
            curveK: isArray ? null : curveKVal,
            curvePoints: parsedPointsArray
        }; 
        safeStorageSet('ww_custom_stats', customStatsMap); 
        debouncedRenderAndTrack(); 
    }
    closeStatsModal();
}

function openDataManager() {
    let content = document.getElementById('data-manager-content'); if (!content) return;
    content.innerHTML = `<div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;"><div style="flex: 1; background: rgba(0, 255, 170, 0.1); border: 1px solid var(--neon-green); padding: 10px; border-radius: 8px; text-align: center;"><div style="font-size: 1.5em; font-weight: bold; color: var(--neon-green);">${ownedCharacters.size}</div><div style="font-size: 0.8em; color: #aaa;">👤 ${t('已解鎖角色')}</div></div><div style="flex: 1; background: rgba(212, 175, 55, 0.1); border: 1px solid var(--gold); padding: 10px; border-radius: 8px; text-align: center;"><div style="font-size: 1.5em; font-weight: bold; color: var(--gold);">${customRotations.length}</div><div style="font-size: 0.8em; color: #aaa;">⚔️ ${t('自訂編隊')}</div></div><div style="flex: 1; background: rgba(207, 0, 255, 0.1); border: 1px solid var(--neon-purple); padding: 10px; border-radius: 8px; text-align: center;"><div style="font-size: 1.5em; font-weight: bold; color: var(--neon-purple);">${savedLineups.length}</div><div style="font-size: 0.8em; color: #aaa;">💾 ${t('已記憶編隊')}</div></div></div><div style="margin-bottom:20px;"><p style="color:#aaa; font-size:0.9em;">${t('備份將包含上述所有數據及當前排軸設定與隊伍編排。')}</p><textarea id="dm-code" rows="3" style="width:100%; padding:10px; background:rgba(0,0,0,0.5); color:var(--neon-green); border:1px solid var(--border-glass); border-radius:8px; resize:none;"></textarea><div style="display:flex; gap:10px; margin-top:10px;"><button onclick="generateExportCode()" class="btn-action-all" style="flex:1;">📥 ${t('產生備份代碼')}</button><button onclick="confirmImportFromCode()" class="btn-action-clear" style="flex:1; background:#ff9800; border-color:#ff9800;">📤 ${t('匯入存檔代碼')}</button></div></div><div style="border-top:1px dashed var(--border-glass); padding-top:15px;"><h4 style="color:var(--gold); margin-top:0;">📝 ${t('自訂編隊庫管理')}</h4><div id="dm-teams" style="max-height: 150px; overflow-y: auto; padding-right: 5px;"></div></div>`;
    document.getElementById('dm-teams').innerHTML = customRotations.length === 0 ? `<p style="color:#666; text-align:center;">${t('無自訂資料')}</p>` : customRotations.map((cr, i) => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:8px; border: 1px solid var(--border-glass);"><span style="color:#ddd; font-size: 0.95em;">${cr.diff} <span style="color:var(--gold); font-weight:bold;">${t(cr.c1)} + ${t(cr.c2)} + ${t(cr.c3)}</span> (DPS: ${cr.dps}w)</span><button onclick="deleteCustomTeam(${i})" class="btn-action-clear" style="padding:4px 10px; font-size:0.85em; border-radius:6px; box-shadow:none;">❌ ${t('刪除')}</button></div>`).join('');
    document.getElementById('data-manager-modal').style.display = 'flex';
}

function closeDataManager() { document.getElementById('data-manager-modal').style.display = 'none'; }

function generateExportCode() {
    let currentEnv = getEnvSettings();
    let data = { 
        roster: [...ownedCharacters], 
        rotations: [...checkedRotations], 
        customStats: customStatsMap, 
        bossHp: bossHPHistory, 
        customTeams: customRotations, 
        savedLineups: savedLineups, 
        bossHPMap: bossHPMap,
        envSettings: currentEnv 
    };
    document.getElementById('dm-code').value = btoa(encodeURIComponent(JSON.stringify(data))); 
    alert(t('✅ 存檔代碼已產生，請複製保存。'));
}

function confirmImportFromCode() { if(confirm(t('這將會覆寫您目前所有的自訂與記憶隊伍設定，確定執行嗎？'))) { importFromCode(); } }

function importFromCode() {
    let code = document.getElementById('dm-code').value; if(!code) return;
    try {
        let data = JSON.parse(decodeURIComponent(atob(code)));
        if(data.roster) safeStorageSet('ww_roster', data.roster);
        if(data.rotations) safeStorageSet('ww_rotations', data.rotations);
        if(data.customStats) safeStorageSet('ww_custom_stats', data.customStats);
        if(data.bossHp) safeStorageSet('ww_boss_hp_history', data.bossHp);
        if(data.customTeams) safeStorageSet('ww_custom_rotations_v2', data.customTeams);
        if(data.savedLineups) safeStorageSet('ww_saved_lineups', data.savedLineups);
        if(data.bossHPMap) safeStorageSet('ww_boss_hp', data.bossHPMap);
        
        if(data.envSettings) {
            let e = data.envSettings;
            let setVal = (id, val) => { if(val !== undefined && document.getElementById(id)) document.getElementById(id).value = val; };
            
            setVal('env-ratio', e.scoreRatio);
            setVal('env-r1', e.r1_hp);
            setVal('env-r2', e.r2_hp);
            setVal('env-r3', e.r3_hp);
            setVal('env-growth', e.growth ? e.growth * 100 : undefined); 
            setVal('env-trans', e.transTime);
            setVal('env-time', e.battleTime);
            setVal('env-res', e.resPenalty);
            setVal('env-pen110', e.pen110);
            setVal('env-pen120', e.pen120);
            
            if (e.resTags && Array.isArray(e.resTags)) {
                setVal('env-res-1', e.resTags[0]);
                setVal('env-res-2', e.resTags[1]);
                setVal('env-res-3', e.resTags[2]);
                setVal('env-res-4', e.resTags[3]);
            }
        }
        alert(t('✅ 設定與全域環境參數已完整還原！即將重新載入頁面。')); window.location.reload();
    } catch(e) { alert(t('❌ 解析失敗，請確認代碼正確。')); }
}

function deleteCustomTeam(index) {
    if(!confirm(t('確定刪除？'))) return; let cr = customRotations.splice(index, 1)[0]; safeStorageSet('ww_custom_rotations_v2', customRotations); dpsData = dpsData.filter(d => d.id !== 'custom_rot_' + cr.id); debouncedRenderAndTrack(); openDataManager(); 
}

// ==========================================
// --- 9. 實戰等級減傷校正器 (Anti-Ninja Nerf) ---
// ==========================================
function calibratePenalty(level) {
    let baseStr = prompt(t("請輸入打 Lv.100 怪物的【基礎傷害】（未衰減）：\n（例如今汐噴了：100000）"), "100000");
    if (!baseStr) return;
    let baseDmg = parseFloat(baseStr);
    
    let defaultActual = level === 110 ? "97500" : "95100";
    let actualStr = prompt(t("請輸入打 Lv.") + level + t(" 怪物的【實測傷害】（已衰減）：\n（例如實際只噴了：") + defaultActual + t("）"), defaultActual);
    if (!actualStr) return;
    let actualDmg = parseFloat(actualStr);

    if (isNaN(baseDmg) || isNaN(actualDmg) || baseDmg <= 0) {
        return alert(t("⚠️ 請輸入有效的數字！"));
    }

    let penalty = actualDmg / baseDmg;
    
    if (level === 110) {
        let el = document.getElementById('env-pen110');
        if(el) el.value = penalty.toFixed(3);
    } else if (level === 120) {
        let el = document.getElementById('env-pen120');
        if(el) el.value = penalty.toFixed(3);
    }
    
    alert(t("🎯 Lv.") + level + t(" 減傷係數已自動校正為：") + penalty.toFixed(3));
    if (typeof updateTracker === 'function') updateTracker();
}

// ==========================================
// --- 10. 記憶編隊管理 (Lineup Memory) ---
// ==========================================
function saveCurrentLineup() {
    let teams = []; let totalActualScore = 0; let rows = document.querySelectorAll('#team-board tr');
    rows.forEach((r) => {
        if (r.classList.contains('hidden-row')) return;
        let ss = r.querySelectorAll('select.char-select'), scoreInput = r.querySelector('.score-input').value, score = parseFloat(scoreInput) || 0;
        let ebR = r.querySelector('.end-boss-r').value, ebIdx = r.querySelector('.end-boss-idx').value, ebHp = r.querySelector('.end-boss-hp').value;
        if (ss[0].value || ss[1].value || ss[2].value) { 
            teams.push({ c1: ss[0].value, c2: ss[1].value, c3: ss[2].value, scoreInput: scoreInput, score: score, ebR: ebR, ebIdx: ebIdx, ebHp: ebHp }); 
            totalActualScore += score; 
        }
    });
    if (teams.length === 0) return alert(t("編隊為空，無法記憶！請先編排隊伍。"));
    let name = prompt(t("請為此實戰編隊輸入記憶名稱："), `${new Date().toLocaleDateString()} 實戰`); if (!name) return;
    let lineup = { id: Date.now(), name: name, totalScore: totalActualScore, teams: teams };
    savedLineups.unshift(lineup); if (savedLineups.length > 10) savedLineups.pop();
    safeStorageSet('ww_saved_lineups', savedLineups); alert(t("✅ 實戰編隊已成功記憶！"));
}

function openLineupModal() {
    let container = document.getElementById('lineup-list');
    if (savedLineups.length === 0) {
        container.innerHTML = `<p style="color:#aaa; text-align:center;">${t('尚無記憶的編隊，請先在沙盤點擊「💾 記憶當前實戰」')}</p>`;
    } else {
        container.innerHTML = savedLineups.map((l, i) => `<div style="background:rgba(0,0,0,0.4); border:1px solid #555; border-radius:8px; padding:12px; margin-bottom:10px;"><div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #444; padding-bottom:8px; margin-bottom:8px;"><strong style="color:var(--neon-purple); font-size:1.1em;">${l.name}</strong><span style="color:#ffaa00; font-weight:bold;">🎯 ${t('總分')}: ${l.totalScore.toLocaleString()}</span></div><div style="font-size:0.85em; color:#aaa; margin-bottom:10px;">${l.teams.map(t => `<span style="color:#ddd">${t.c1?t.c1:'?'}</span>+${t.c2?t.c2:'?'}+${t.c3?t.c3:'?'}`).join(' | ')}</div><div style="display:flex; gap:10px;"><button onclick="loadLineup(${i})" class="btn-action-all" style="flex:1; padding:6px;">📥 ${t('載入此編隊')}</button><button onclick="deleteLineup(${i})" class="btn-action-clear" style="padding:6px 12px; background:#555; border:none; box-shadow:none;">❌ ${t('刪除')}</button></div></div>`).join('');
    }
    document.getElementById('lineup-modal').style.display = 'flex';
}

function loadLineup(index) {
    if(!confirm(t("將清空當前沙盤畫面並載入該記憶編隊，確定？"))) return;
    let lineup = savedLineups[index];
    document.querySelectorAll('.char-select, .score-input, .end-boss-r, .end-boss-idx, .end-boss-hp').forEach(el => el.value = ""); 
    let rows = document.querySelectorAll('#team-board tr');
    lineup.teams.forEach((tData, i) => {
        if (rows[i]) {
            let ss = rows[i].querySelectorAll('select.char-select');
            if(tData.c1 && ss[0].querySelector(`option[value="${tData.c1}"]`) == null) ss[0].innerHTML += `<option value="${tData.c1}">${tData.c1}</option>`;
            if(tData.c2 && ss[1].querySelector(`option[value="${tData.c2}"]`) == null) ss[1].innerHTML += `<option value="${tData.c2}">${tData.c2}</option>`;
            if(tData.c3 && ss[2].querySelector(`option[value="${tData.c3}"]`) == null) ss[2].innerHTML += `<option value="${tData.c3}">${tData.c3}</option>`;
            if (tData.c1) ss[0].value = tData.c1; if (tData.c2) ss[1].value = tData.c2; if (tData.c3) ss[2].value = tData.c3;
            rows[i].querySelector('.score-input').value = tData.scoreInput || ""; rows[i].querySelector('.end-boss-r').value = tData.ebR || ""; rows[i].querySelector('.end-boss-idx').value = tData.ebIdx || ""; rows[i].querySelector('.end-boss-hp').value = tData.ebHp || "";
        }
    });
    document.getElementById('lineup-modal').style.display = 'none';
    let neededCount = 3; while(neededCount < lineup.teams.length && neededCount < 16) neededCount += 3; if(neededCount > 16) neededCount = 16;
    if(parseInt(document.getElementById('team-count-select').value) < neededCount) { document.getElementById('team-count-select').value = neededCount; }
    updateTeamDisplayCount(); alert(t("✅ 記憶編隊載入成功！"));
}

function deleteLineup(index) { 
    if(!confirm(t("確定刪除此紀錄？"))) return; 
    savedLineups.splice(index, 1); 
    safeStorageSet('ww_saved_lineups', savedLineups); 
    openLineupModal(); 
}

// ==========================================
// --- 11. 匯出、分享與大數據收集 (Export & Share) ---
// ==========================================
function exportImage() {
    try {
        const rows = document.querySelectorAll('#team-board tr'); let completed = [];
        let env = typeof getEnvSettings === 'function' ? getEnvSettings() : {};
        let globalResInfo = [];
        if(env.resTags && env.resTags[0]) globalResInfo.push(`[1]${env.resTags[0]}`);
        if(env.resTags && env.resTags[1]) globalResInfo.push(`[2]${env.resTags[1]}`);
        if(env.resTags && env.resTags[2]) globalResInfo.push(`[3]${env.resTags[2]}`);
        if(env.resTags && env.resTags[3]) globalResInfo.push(`[4]${env.resTags[3]}`);
        let envResStr = globalResInfo.length > 0 ? ` 🛡️ 各王抗性: ${globalResInfo.join(", ")}` : '';

        rows.forEach((r, i) => {
            if (r.classList.contains('hidden-row')) return;
            let ss = r.querySelectorAll('select.char-select'), resTd = r.querySelector('.relay-result');
            let scoreInput = r.querySelector('.score-input'), ebR = r.querySelector('.end-boss-r').value, ebIdx = r.querySelector('.end-boss-idx').value, ebHp = r.querySelector('.end-boss-hp').value;
            if(ss.length >= 3 && ss[0].value && ss[1].value && ss[2].value) {
                let resText = resTd ? resTd.innerText.replace(/\n/g, ' | ') : '';
                let score = scoreInput ? scoreInput.value : ''; let finalScore = score ? `🎯 ${t('實得分')}: ${score}` : resText;
                if(ebR && ebIdx && ebHp) finalScore += ` 🩸 ${t('終點')}: R${ebR}-${ebIdx}(${t('剩')}${ebHp}%)`;
                completed.push({id: i+1, c1: ss[0].value, c2: ss[1].value, c3: ss[2].value, res: finalScore});
            }
        });
        if(!completed.length) return alert(t("請先完成至少一支滿編隊伍！"));
        let box = document.createElement('div'); box.style = "position:absolute; left:-9999px; background:#1e1e24; color:#fff; padding:30px; border-radius:15px; width:1000px; font-family:'Segoe UI',sans-serif;";
        let h = `<h2 style="color:#d4af37; text-align:center; border-bottom:2px solid #d4af37; padding-bottom:10px;">${t("鳴潮矩陣實戰推演編隊表")}</h2><table style="width:100%; border-collapse:collapse; margin-top:20px; text-align:center; font-size:1.1em;">`;
        h += `<tr style="background:#3f3f4e; color:#d4af37;"><th>${t("關卡")}</th><th>${t("主輸出")}</th><th>${t("副C/輔助")}</th><th>${t("生存/輔助")}</th><th style="color:#00ffaa;">${t("推演戰果 / 實戰與環境資訊")}</th></tr>`;
        completed.forEach(tData => h += `<tr><td style="border:1px solid #555; padding:15px; font-weight:bold; color:#4caf50;">${t("第")} ${tData.id} ${t("隊")}</td><td style="border:1px solid #555; padding:15px;">${t(tData.c1)}</td><td style="border:1px solid #555; padding:15px;">${t(tData.c2)}</td><td style="border:1px solid #555; padding:15px;">${t(tData.c3)}</td><td style="border:1px solid #555; padding:15px; font-size:0.85em; text-align:left;">${tData.res}</td></tr>`);
        let scoreElem = document.getElementById('dashboard-scores'); let currentScore = scoreElem ? scoreElem.innerText.replace(/\n/g, '  ') : '0 分';
        box.innerHTML = h + `</table><div style="margin-top:20px; text-align:right; color:#888; font-size:0.9em;">${t("全局數據統計")}：${currentScore}${envResStr} | ${t("生成時間")}：${new Date().toLocaleString()}</div>`;
        document.body.appendChild(box); html2canvas(box, { backgroundColor: '#1e1e24', scale: 2 }).then(c => { let l = document.createElement('a'); l.download = '鳴潮矩陣推演編隊表.png'; l.href = c.toDataURL('image/png'); l.click(); document.body.removeChild(box); });
    } catch(err) { alert(t("截圖失敗，請確定隊伍資料填寫完整。錯誤資訊：") + err.message); }
}

function submitToGoogleForm() {
    if(!confirm(t("您即將匿名提交當前表單上的數據，是否繼續？"))) return;
    try {
        let dataParams = []; let rows = document.querySelectorAll('#team-board tr'); let env = getEnvSettings();
        dataParams.push("主C,副C,生存,實戰分數,真實DPS,終點王R,終點王隻數,剩餘血量%,推算王血量,王1抗,王2抗,王3抗,王4抗");
        rows.forEach((r) => {
            if (r.classList.contains('hidden-row')) return;
            let ss = r.querySelectorAll('select.char-select'), scoreInput = r.querySelector('.score-input');
            let score = scoreInput ? parseFloat(scoreInput.value) : NaN, ebR = parseInt(r.querySelector('.end-boss-r').value), ebIdx = parseInt(r.querySelector('.end-boss-idx').value), ebHp = parseFloat(r.querySelector('.end-boss-hp').value);
            if(ss.length >= 3 && ss[0].value && ss[1].value && ss[2].value && !isNaN(score)) {
                let c1 = ss[0].value;
                let teamAttr = typeof charAttrMap !== 'undefined' ? charAttrMap[c1] : null;

                let dmg_left = score / Math.max(0.0001, env.scoreRatio), kills = 0, effective_dmg_sum = 0, tmp_r = 1, tmp_idx = 1, tmp_hp = getBossMaxHP(1, 1), dmgDealtToKilledBosses = 0;
                let calculatedTotalHP = 0, loopGuard = 0;
                
                while (dmg_left > 0 && loopGuard < 50) { 
                    loopGuard++; 
                    let isResisted = teamAttr && teamAttr === env.resTags[tmp_idx - 1];
                    let r_factor = isResisted ? (1 - env.resPenalty / 100) : 1; 
                    if (r_factor <= 0) r_factor = 0.1; 
                    if (dmg_left >= tmp_hp) { dmg_left -= tmp_hp; dmgDealtToKilledBosses += tmp_hp; effective_dmg_sum += (tmp_hp / r_factor); kills++; tmp_idx++; if (tmp_idx > 4) { tmp_r++; tmp_idx = 1; } tmp_hp = getBossMaxHP(tmp_r, tmp_idx); } 
                    else { effective_dmg_sum += (dmg_left / r_factor); if (!isNaN(ebR) && !isNaN(ebIdx) && !isNaN(ebHp) && ebR === tmp_r && ebIdx === tmp_idx) { let dmgDoneToEndBoss = (score / env.scoreRatio) - dmgDealtToKilledBosses; let hp_factor = 1 - (ebHp / 100); if (hp_factor <= 0) hp_factor = 0.0001; calculatedTotalHP = dmgDoneToEndBoss / hp_factor; } dmg_left = 0; }
                }
                
                let effective_time = env.battleTime - (kills * env.transTime), trueBaseDps = effective_time > 0 ? (effective_dmg_sum / effective_time) : 0;
                let t1 = env.resTags && env.resTags[0] ? env.resTags[0] : '無';
                let t2 = env.resTags && env.resTags[1] ? env.resTags[1] : '無';
                let t3 = env.resTags && env.resTags[2] ? env.resTags[2] : '無';
                let t4 = env.resTags && env.resTags[3] ? env.resTags[3] : '無';
                dataParams.push(`${ss[0].value},${ss[1].value},${ss[2].value},${score},${trueBaseDps.toFixed(2)},${ebR||''},${ebIdx||''},${ebHp||''},${calculatedTotalHP ? calculatedTotalHP.toFixed(2) : ''},${t1},${t2},${t3},${t4}`);
            }
        });
        if (dataParams.length === 1) return alert(t("請先在編隊表中填寫【實戰得分】！"));
        let csvReport = dataParams.join('\n'); window.open(`https://docs.google.com/forms/d/e/1FAIpQLSfB2g_uLwL7D2O1uUuM1iEaWkO7q29Xm9eG-8yPqg6Vw/viewform?usp=pp_url&entry.956555135=${encodeURIComponent(csvReport)}`, '_blank');
    } catch(err) { alert(t("傳送失敗，錯誤資訊：") + err.message); }
}

// ==========================================
// --- 12. 雜項與輔助介面 (Misc UI Interactions) ---
// ==========================================
function toggleGuideMode(mode) {
    const btnBriefs = document.querySelectorAll('.btn-guide-brief');
    const btnDetails = document.querySelectorAll('.btn-guide-detail');
    const guideBriefs = document.querySelectorAll('.guide-brief-content');
    const guideDetails = document.querySelectorAll('.guide-detail-content');

    if (mode === 'brief') {
        btnBriefs.forEach(btn => { btn.style.background = 'var(--neon-green)'; btn.style.color = '#1e1e24'; btn.style.border = '1px solid var(--neon-green)'; btn.style.boxShadow = '0 0 10px rgba(0,255,170,0.4)'; });
        btnDetails.forEach(btn => { btn.style.background = 'transparent'; btn.style.color = '#aaa'; btn.style.border = '1px solid #555'; btn.style.boxShadow = 'none'; });
        guideDetails.forEach(el => el.style.display = 'none');
        guideBriefs.forEach(el => el.style.display = 'block');
    } else {
        btnDetails.forEach(btn => { btn.style.background = 'var(--neon-purple)'; btn.style.color = '#fff'; btn.style.border = '1px solid var(--neon-purple)'; btn.style.boxShadow = '0 0 10px rgba(207,0,255,0.4)'; });
        btnBriefs.forEach(btn => { btn.style.background = 'transparent'; btn.style.color = '#aaa'; btn.style.border = '1px solid #555'; btn.style.boxShadow = 'none'; });
        guideBriefs.forEach(el => el.style.display = 'none');
        guideDetails.forEach(el => el.style.display = 'block');
    }
}

// ==========================================
// --- 13. 系統報錯與防呆機制 (Error Handling) ---
// ==========================================
const DEVELOPER_EMAIL = "dpm.builder@outlook.com"; 

function showErrorModal(info) {
    const preview = document.getElementById('error-preview');
    if (preview) {
        preview.textContent = `[${t('時間')}]: ${info.time}\n[${t('錯誤')}]: ${info.message}\n[${t('位置')}]: ${info.location}\n[${t('設備')}]: ${info.userAgent.substring(0, 50)}...`;
    }
    const modal = document.getElementById('error-modal');
    if (modal) modal.style.display = 'flex';
}

function closeErrorModal() {
    const modal = document.getElementById('error-modal');
    if (modal) modal.style.display = 'none';
    currentErrorInfo = null;
}

function sendErrorReport() {
    if (!currentErrorInfo) return;
    const subject = encodeURIComponent(`[矩陣編隊工具 - 自動報錯] ${currentErrorInfo.message.substring(0, 40)}`);
    const rawBody = `開發者您好，我在使用矩陣編隊工具時遇到了錯誤。

【錯誤詳細資訊】
時間: ${currentErrorInfo.time}
錯誤訊息: ${currentErrorInfo.message}
發生位置: ${currentErrorInfo.location}

【玩家設備與環境】
瀏覽器: ${currentErrorInfo.userAgent}

【堆疊追蹤 (Stack Trace)】
${currentErrorInfo.stack}
`;
    window.location.href = `mailto:${DEVELOPER_EMAIL}?subject=${subject}&body=${encodeURIComponent(rawBody)}`;
    closeErrorModal();
}

// ==========================================
// --- 13.5. 畫面初始化 (App Bootstrapper) ---
// ==========================================
function initializeApp() {
    initCoreData(); 
    initBoard(); 
    
    if (isSimp) document.getElementById('lang-toggle').innerText = "🌐 繁 / 简";
    
    let savedCount = localStorage.getItem('ww_display_count');
    if (savedCount && document.getElementById('team-count-select')) {
        document.getElementById('team-count-select').value = savedCount;
    }

    let savedSkill = safeStorageGet('ww_skill_slider', 100);
    let skillSlider = document.getElementById('skill-slider');
    if (skillSlider) {
        skillSlider.value = savedSkill;
    }
    updateMasterSkill();
    renderCheckboxes(); 
    renderRotations();
    
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
    if(document.querySelectorAll('.tab-btn').length > 0) document.querySelectorAll('.tab-btn')[0].click(); 
    translateDOM(document.body);
    requestAnimationFrame(() => {
        document.body.classList.add('loaded');
    });
}

// ==========================================
// --- 14. 系統啟動 (App Bootstrap) ---
// ==========================================
// 確保所有模組與函數加載完畢後，再執行初始化
initializeApp();
