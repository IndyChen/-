// ==========================================
// 鳴潮矩陣編隊工具 - Beta 測試版核心邏輯
// ==========================================

if (typeof phraseDict !== 'undefined') phraseDict.sort((a, b) => b[0].length - a[0].length);
let isSimp = false;

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

function toggleLang() { 
    isSimp = !isSimp; 
    try { localStorage.setItem('ww_lang', isSimp ? 'zh-CN' : 'zh-TW'); } catch(e){} 
    window.location.reload(); 
}

function debounce(func, wait) {
    let timeout;
    return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}

function switchTab(pageId, btnElement) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    btnElement.classList.add('active');
    window.scrollTo(0, 0);
}

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

function updateToggleButtons() {
    const rBoxes = Array.from(document.querySelectorAll('#roster-setup .checkbox-item')).filter(l => l.style.display !== 'none').map(l => l.querySelector('input'));
    const rAnyChecked = rBoxes.some(i => i.checked);
    let rBtn = document.getElementById('roster-switch');
    if(rBtn) {
        rBtn.innerHTML = rAnyChecked ? "🗑️ 清空角色勾選" : "☑️ 全選可見角色";
        rBtn.className = rAnyChecked ? "btn-action-clear ratio-71" : "btn-action-all ratio-71";
    }

    const rotBoxes = Array.from(document.querySelectorAll('#rotation-setup input[type="checkbox"]')).filter(i => i.closest('div').style.display !== 'none');
    const rotAnyChecked = rotBoxes.some(i => i.checked);
    let rotBtn = document.getElementById('rot-all-btn');
    if(rotBtn) {
        rotBtn.innerHTML = rotAnyChecked ? "🗑️ 清空可見排軸" : "☑️ 全選可見排軸";
        rotBtn.className = rotAnyChecked ? "btn-action-clear ratio-71" : "btn-action-all ratio-71";
    }
}

const debouncedRenderAndTrack = debounce(() => { renderRotations(); updateTracker(); updateToggleButtons(); }, 150);

function clampHpPct(el) {
    let val = parseFloat(el.value);
    if (isNaN(val)) { el.value = ''; return; }
    if (val < 0.01) el.value = 0.01;
    if (val > 100) el.value = 100;
}

function getBase(n) { return ['光主', '暗主', '風主'].includes(n) ? '漂泊者' : n; }
function isOwned(n) { return ['光主', '暗主', '風主'].includes(n) ? ownedCharacters.has('漂泊者') : ownedCharacters.has(n); }

function initDpsData() {
    if (typeof teamDB === 'undefined' || typeof charData === 'undefined') return;
    for (let c1 in teamDB) {
        teamDB[c1].forEach(tData => {
            dpsData.push({ id: 'rot_' + rotIdCounter++, c1: c1, c2: tData.c2, c3: tData.c3, dps: tData.dps, rot: tData.rot, diff: tData.diff, gen: charData[c1]?charData[c1].gen:1 });
        });
    }
}

function loadCustomRotations() {
    try { let stored = localStorage.getItem('ww_custom_rotations_v2'); if (stored) customRotations = JSON.parse(stored); } catch(e) {}
    customRotations.forEach(cr => {
        if(typeof charData !== 'undefined') dpsData.push({ id: 'custom_rot_' + cr.id, c1: cr.c1, c2: cr.c2, c3: cr.c3, dps: cr.dps, rot: cr.rot, diff: cr.diff, gen: charData[cr.c1]?charData[cr.c1].gen:1, isUserCustom: true });
    });
}

function openCustomTeamModal() {
    let m = document.getElementById('custom-team-modal');
    if(typeof charData === 'undefined') return;
    
    let charOpts = '';
    if (typeof characterOrder !== 'undefined') {
        characterOrder.forEach(n => {
            if (n === '漂泊者') {
                charOpts += `<option value="光主">${t("光主")}</option><option value="暗主">${t("暗主")}</option><option value="風主">${t("風主")}</option>`;
            } else if (charData[n]) {
                charOpts += `<option value="${n}">${t(n)}</option>`;
            }
        });
    } else {
        charOpts = Object.keys(charData).map(n => `<option value="${n}">${t(n)}</option>`).join('');
    }
    
    m.innerHTML = `
        <div style="background:var(--bg-panel); backdrop-filter:blur(20px); padding:25px; border-radius:16px; border:1px solid var(--gold); width:340px; max-width:90%;">
            <h3 style="margin-top:0; color:var(--gold); text-align:center;">➕ 新增自訂編隊</h3>
            <select id="ct-c1" class="char-select" style="margin-bottom:10px;"><option value="">-- 選擇主輸出 --</option>${charOpts}</select>
            <select id="ct-c2" class="char-select" style="margin-bottom:10px;"><option value="">-- 選擇副C/輔助 --</option>${charOpts}</select>
            <select id="ct-c3" class="char-select" style="margin-bottom:10px;"><option value="">-- 選擇生存/輔助 --</option>${charOpts}</select>
            <input type="number" id="ct-dps" placeholder="預設理論 DPS (萬)" class="score-input">
            <select id="ct-diff" class="char-select" style="margin-bottom:20px;">
                <option value="🟩">🟩 輪椅</option><option value="🔵">🔵 中等</option><option value="⭐">⭐ 進階</option><option value="⚠️">⚠️ 極難</option><option value="🧩">🧩 非主流</option>
            </select>
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('custom-team-modal').style.display='none'" class="btn-action-clear" style="flex:1;">取消</button>
                <button onclick="saveCustomTeam()" class="btn-action-all" style="flex:1;">儲存</button>
            </div>
        </div>`;
    m.style.display = 'flex';
}

function saveCustomTeam() {
    let c1 = document.getElementById('ct-c1').value, c2 = document.getElementById('ct-c2').value, c3 = document.getElementById('ct-c3').value;
    let dps = parseFloat(document.getElementById('ct-dps').value) || 0, diff = document.getElementById('ct-diff').value;
    if (!c1 || !c2 || !c3) return alert(t('請完整選擇三名角色！'));
    let newId = Date.now(), newRot = { id: newId, c1: c1, c2: c2, c3: c3, dps: dps, rot: "自訂", diff: diff };
    customRotations.push(newRot);
    try { localStorage.setItem('ww_custom_rotations_v2', JSON.stringify(customRotations)); } catch(e){}
    dpsData.push({ id: 'custom_rot_' + newId, c1: c1, c2: c2, c3: c3, dps: dps, rot: "自訂", diff: diff, gen: charData[c1]?charData[c1].gen:1, isUserCustom: true });
    document.getElementById('custom-team-modal').style.display = 'none'; debouncedRenderAndTrack(); alert(t('自訂編隊已成功加入。'));
}

function openDataManager() {
    let content = document.getElementById('data-manager-content');
    content.innerHTML = `
        <div style="margin-bottom:20px;">
            <p style="color:#aaa; font-size:0.9em;">包含角色、排軸、自訂編隊、血量校正紀錄。</p>
            <textarea id="dm-code" rows="3" style="width:100%; padding:10px; background:rgba(0,0,0,0.5); color:var(--neon-green); border:1px solid var(--border-glass); border-radius:8px; resize:none;"></textarea>
            <div style="display:flex; gap:10px; margin-top:10px;"><button onclick="generateExportCode()" class="btn-action-all" style="flex:1;">📥 產生代碼</button><button onclick="importFromCode()" class="btn-action-clear" style="flex:1; background:#ff9800; border-color:#ff9800;">📤 還原設定</button></div>
        </div>
        <div style="border-top:1px dashed var(--border-glass); padding-top:15px;"><h4 style="color:var(--gold); margin-top:0;">📝 自訂編隊管理</h4><div id="dm-teams"></div></div>
    `;
    let teamHtml = customRotations.length === 0 ? `<p style="color:#666;">無資料</p>` : customRotations.map((cr, i) => `<div style="display:flex; justify-content:space-between; margin-bottom:5px; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px;"><span>${cr.diff} ${t(cr.c1)}+${t(cr.c2)}+${t(cr.c3)} (${cr.dps}w)</span><button onclick="deleteCustomTeam(${i})" class="btn-action-clear" style="padding:2px 8px;">❌</button></div>`).join('');
    document.getElementById('dm-teams').innerHTML = teamHtml;
    document.getElementById('data-manager-modal').style.display = 'flex';
}
function closeDataManager() { document.getElementById('data-manager-modal').style.display = 'none'; }
function generateExportCode() {
    let data = { roster: [...ownedCharacters], rotations: [...checkedRotations], customStats: customStatsMap, bossHp: bossHPHistory, customTeams: customRotations };
    document.getElementById('dm-code').value = btoa(encodeURIComponent(JSON.stringify(data))); alert(t('✅ 代碼已產生。'));
}
function importFromCode() {
    let code = document.getElementById('dm-code').value; if(!code || !confirm(t('這將會覆寫所有設定，確定？'))) return;
    try {
        let data = JSON.parse(decodeURIComponent(atob(code)));
        if(data.roster) localStorage.setItem('ww_roster', JSON.stringify(data.roster));
        if(data.rotations) localStorage.setItem('ww_rotations', JSON.stringify(data.rotations));
        if(data.customStats) localStorage.setItem('ww_custom_stats', JSON.stringify(data.customStats));
        if(data.bossHp) localStorage.setItem('ww_boss_hp_history', JSON.stringify(data.bossHp));
        if(data.customTeams) localStorage.setItem('ww_custom_rotations_v2', JSON.stringify(data.customTeams));
        alert(t('✅ 設定已還原！')); window.location.reload();
    } catch(e) { alert(t('❌ 解析失敗。')); }
}
function deleteCustomTeam(index) {
    if(!confirm(t('確定刪除？'))) return; let cr = customRotations.splice(index, 1)[0];
    try { localStorage.setItem('ww_custom_rotations_v2', JSON.stringify(customRotations)); } catch(e){}
    dpsData = dpsData.filter(d => d.id !== 'custom_rot_' + cr.id); debouncedRenderAndTrack(); openDataManager(); 
}

function toggleRarity(s) { s == 5 ? show5Star = !show5Star : show4Star = !show4Star; document.getElementById(`btn-${s}star`).classList.toggle(`active-${s}star`, s==5?show5Star:show4Star); filterCharacters(); }
function toggleGen(g) { if(g==1) showG1=!showG1; if(g==2) showG2=!showG2; if(g==3) showG3=!showG3; document.getElementById(`btn-g${g}`).classList.toggle('active-gen', g==1?showG1:g==2?showG2:showG3); filterCharacters(); }

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
function updateOwnedCharacters() { ownedCharacters.clear(); document.querySelectorAll('#roster-setup input:checked').forEach(i => ownedCharacters.add(i.value)); debouncedRenderAndTrack(); }

function updateMasterSkill() {
    let val = parseInt(document.getElementById('skill-slider').value); document.getElementById('skill-display').innerText = val + '%';
    diffStability['⚠️'] = Math.max(0, 100 - (100 - val) * 1.8); diffStability['⭐'] = Math.max(0, 100 - (100 - val) * 1.4);
    diffStability['🔵'] = Math.max(0, 100 - (100 - val) * 1.1); diffStability['🟩'] = Math.max(0, 100 - (100 - val) * 0.8); diffStability['🧩'] = Math.max(0, 100 - (100 - val) * 1.0);
    debouncedRenderAndTrack();
}
function updateSubSkill(diffKey, sliderId, valId) { diffStability[diffKey] = parseInt(document.getElementById(sliderId).value); document.getElementById(valId).innerText = diffStability[diffKey] + '%'; debouncedRenderAndTrack(); }

function getRotDpsRange(d) {
    let buffMult = customStatsMap[d.id] && customStatsMap[d.id].buff ? 1 + (customStatsMap[d.id].buff / 100) : 1;
    if (customStatsMap[d.id]) { let s = customStatsMap[d.id]; let max = s.dps * buffMult; return { min: Math.max(0, max * (s.stability / 100)), max: max, isCustom: true }; }
    let max = d.dps * buffMult; if (max === 0) return { min: 0, max: 0, isCustom: false };
    let diffKey = d.diff.includes('⚠️') ? '⚠️' : d.diff.includes('⭐') ? '⭐' : d.diff.includes('🔵') ? '🔵' : d.diff.includes('🟩') ? '🟩' : '🧩';
    let stab = diffStability[diffKey] !== undefined ? diffStability[diffKey] : 100;
    return { min: Math.max(0, max * (stab / 100)), max: max, isCustom: false };
}

function resetRowDps(btn) {
    let row = btn.closest('tr'); let ss = row.querySelectorAll('select.char-select');
    let c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value;
    if (!c1 || !c2 || !c3) return alert(t("請先排滿該隊伍的成員。"));
    let possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3);
    if(possibleRots.length > 0) { possibleRots.forEach(r => { delete customStatsMap[r.id]; }); try { localStorage.setItem('ww_custom_stats', JSON.stringify(customStatsMap)); } catch(e){} row.querySelector('.score-input').value = ""; renderRotations(); updateTracker(); alert(t("已清除")); }
}

let currentEditRotId = null;
function openStatsModal(e, rotId) {
    e.preventDefault(); e.stopPropagation(); currentEditRotId = rotId;
    let d = dpsData.find(x => x.id === rotId); document.getElementById('stats-modal-rot').innerText = `${t(d.c1)} + ${t(d.c2)} + ${t(d.c3)}`;
    let stats = customStatsMap[rotId];
    if (stats) { document.getElementById('stats-dps').value = stats.dps; document.getElementById('stats-stab').value = stats.stability; }
    else { document.getElementById('stats-dps').value = d.dps > 0 ? d.dps : ''; document.getElementById('stats-stab').value = 100; }
    document.getElementById('stats-modal').style.display = 'flex';
}
function closeStatsModal() { document.getElementById('stats-modal').style.display = 'none'; currentEditRotId = null; }
function clearStatsModal() { if (currentEditRotId) { delete customStatsMap[currentEditRotId]; try { localStorage.setItem('ww_custom_stats', JSON.stringify(customStatsMap)); } catch(e) {} debouncedRenderAndTrack(); } closeStatsModal(); }
function saveStatsModal() {
    let dpsVal = parseFloat(document.getElementById('stats-dps').value), stabVal = parseFloat(document.getElementById('stats-stab').value);
    if (isNaN(dpsVal) || isNaN(stabVal)) return alert(t("請輸入有效的數字！"));
    if (currentEditRotId) { customStatsMap[currentEditRotId] = { dps: dpsVal, stability: Math.min(100, Math.max(0, stabVal)), buff: 0 }; try { localStorage.setItem('ww_custom_stats', JSON.stringify(customStatsMap)); } catch(e) {} debouncedRenderAndTrack(); }
    closeStatsModal();
}

let lastCalculatedStability = 100;
function openCalcModal() { document.getElementById('calc-modal').style.display = 'flex'; document.getElementById('calc-result').style.display = 'none'; }
function closeCalcModal() { document.getElementById('calc-modal').style.display = 'none'; }
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
function applyCalculatedStability() { document.getElementById('skill-slider').value = lastCalculatedStability; updateMasterSkill(); closeCalcModal(); }

function updateRowNumbers() { document.querySelectorAll('#team-board tr').forEach((row, idx) => { const td = row.querySelector('td:first-child'); if(td) td.innerHTML = `${t("第")} ${idx + 1} ${t("隊")}`; }); }

function initBoard() {
    const b = document.getElementById('team-board');
    let rOpts = `<option value="">R?</option>` + Array.from({length:10}, (_,i)=>`<option value="${i+1}">R${i+1}</option>`).join('');
    let idxOpts = `<option value="">${t("號?")}</option>` + [1,2,3,4].map(idx=>`<option value="${idx}">${idx}</option>`).join('');
    for(let i=1; i<=16; i++) {
        let tr = document.createElement('tr'); tr.className = 'draggable-row'; tr.draggable = true; 
        tr.innerHTML = `<td>${t("第")} ${i} ${t("隊")}</td>
                        <td data-label="⚔️ ${t('主C')}："><select class="char-select" onchange="updateTracker()"></select></td>
                        <td data-label="🗡️ ${t('副C')}："><select class="char-select" onchange="updateTracker()"></select></td>
                        <td data-label="🛡️ ${t('生存')}："><select class="char-select" onchange="updateTracker()"></select><button onclick="resetRowDps(this)" class="btn-reset-dps" style="margin-top:5px; padding:4px 8px; border-radius:4px; font-size:0.8em; background:#2b2b36; color:#aaa; border:1px solid #555; cursor:pointer;">🔄 Reset DPS</button></td>
                        <td data-label="📊 ${t('實戰得分')} 與 ${t('設定')}：">
                            <input type="number" class="score-input" placeholder="${t('實戰得分')}"><br>
                            <div style="display:flex; justify-content:center; align-items:center; gap:4px; flex-wrap:wrap; margin-bottom:6px; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; border:1px solid var(--neon-green);">
                                <span>🎯終:</span><select class="hp-calc-select end-boss-r">${rOpts}</select>
                                <span>-</span><select class="hp-calc-select end-boss-idx">${idxOpts}</select>
                                <span>🩸剩:</span><input type="number" class="hp-calc-input end-boss-hp" placeholder="%" onblur="clampHpPct(this)">
                            </div>
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

let activePresetAttrs = new Set(); let activePresetGens = new Set();
function togglePresetAttr(attr) { activePresetAttrs.has(attr) ? activePresetAttrs.delete(attr) : activePresetAttrs.add(attr); document.querySelector(`button[data-attr="${attr}"]`).classList.toggle(`active-attr-${attr}`); debouncedRenderAndTrack(); }
function togglePresetGen(gen) { activePresetGens.has(gen) ? activePresetGens.delete(gen) : activePresetGens.add(gen); document.querySelector(`button[data-gen="${gen}"]`).classList.toggle(`active-gen`); debouncedRenderAndTrack(); }

function updateTracker() {
    initBossHPMap();
    let used = {}; for(let n in charData) used[n] = 0;
    document.querySelectorAll('.char-select').forEach(s => { if(s.value) used[getBase(s.value)]++; });
    
    document.querySelectorAll('#team-board tr').forEach(row => {
        let ss = row.querySelectorAll('select.char-select'), v1=ss[0].value, v2=ss[1].value, v3=ss[2].value;
        let bases = new Set([v1,v2,v3].filter(x=>x).map(x=>getBase(x)));
        ss.forEach((s, i) => {
            let h = buildOptionsHTML(i+1, v1, v2, v3, s.value, used, bases);
            if(s.innerHTML !== h) { let old = s.value; s.innerHTML = h; s.value = old; }
            s.style.borderColor = (s.value && used[getBase(s.value)] > charData[getBase(s.value)].max) ? '#ff5252' : '';
        });
    });

    const tracker = document.getElementById('tracker');
    tracker.innerHTML = `<div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:12px; margin-bottom:15px; text-align:center; border:1px solid var(--gold);">📊 理論最大：<span style="color:var(--neon-green); font-size:1.2em; font-weight:bold;">${getMaxTeams({})}</span> | ⏳ 剩餘可排：<span style="color:var(--gold); font-size:1.2em; font-weight:bold;">${getMaxTeams(used)}</span></div>`;
    
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

    let env = getEnvSettings(), current_r_min = 1, current_index_min = 1, current_hp_min = getBossMaxHP(1, 1), current_r_max = 1, current_index_max = 1, current_hp_max = getBossMaxHP(1, 1), totalMatrixScoreMin = 0, totalMatrixScoreMax = 0;
    let simMode = document.getElementById('sim-mode') ? document.getElementById('sim-mode').value : 'auto';

    document.querySelectorAll('#team-board tr').forEach(row => {
        let ss = row.querySelectorAll('select.char-select'), c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value;
        let resTd = row.querySelector('.relay-result'), ebR = row.querySelector('.end-boss-r').value, ebIdx = row.querySelector('.end-boss-idx').value, ebHp = row.querySelector('.end-boss-hp').value;
        let chk_res = [row.querySelector('.res-chk-1').checked, row.querySelector('.res-chk-2').checked, row.querySelector('.res-chk-3').checked, row.querySelector('.res-chk-4').checked];

        if (c1 && c2 && c3) {
            if (simMode === 'auto') {
                let possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3 && checkedRotations.has(d.id));
                if (possibleRots.length > 0) {
                    possibleRots.sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min);
                    let dpsRange = getRotDpsRange(possibleRots[0]);
                    if (dpsRange.max <= 0) { resTd.innerHTML = `<span style="color:#ff5252; font-weight:bold;">${t("DPS過低")}</span>`; return; }

                    let simulate = (hp, r, idx, dps) => {
                        let t_left = env.battleTime, dmg = 0, startStr = `R${r}-${idx}(${(hp/getBossMaxHP(r,idx)*100).toFixed(0)}%)`;
                        while (t_left > 0) {
                            let eff_dps = dps * (chk_res[idx - 1] ? (1 - env.resPenalty / 100) : 1);
                            if (eff_dps <= 0) break;
                            let ttk = hp / eff_dps;
                            if (ttk <= t_left) { dmg += hp; t_left -= (ttk + env.transTime); idx++; if (idx > 4) { r++; idx = 1; } hp = getBossMaxHP(r, idx); } 
                            else { dmg += eff_dps * t_left; hp -= eff_dps * t_left; t_left = 0; }
                        }
                        return { hp, r, idx, dmg, endStr: `R${r}-${idx}(${(hp/getBossMaxHP(r,idx)*100).toFixed(0)}%)`, startStr };
                    };
                    let resMin = simulate(current_hp_min, current_r_min, current_index_min, dpsRange.min);
                    current_hp_min = resMin.hp; current_r_min = resMin.r; current_index_min = resMin.idx; totalMatrixScoreMin += resMin.dmg * env.scoreRatio;
                    let resMax = simulate(current_hp_max, current_r_max, current_index_max, dpsRange.max);
                    current_hp_max = resMax.hp; current_r_max = resMax.r; current_index_max = resMax.idx; totalMatrixScoreMax += resMax.dmg * env.scoreRatio;

                    resTd.innerHTML = `<span style="color:#aaa;">下限: </span><span style="color:var(--gold);">${resMin.startStr} ➔ ${resMin.endStr}</span><br><span style="color:#aaa;">上限: </span><span style="color:var(--neon-green);">${resMax.startStr} ➔ ${resMax.endStr}</span><br><span style="color:var(--neon-purple); font-weight:bold; font-size:1.1em;">${Math.floor(resMin.dmg * env.scoreRatio).toLocaleString()} ~ ${Math.floor(resMax.dmg * env.scoreRatio).toLocaleString()} 分</span>`;
                } else { resTd.innerHTML = "-"; }
            } else if (simMode === 'manual') {
                let ebRInt = parseInt(ebR), ebIdxInt = parseInt(ebIdx), ebHpPct = parseFloat(ebHp);
                if (!isNaN(ebRInt) && !isNaN(ebIdxInt) && !isNaN(ebHpPct)) {
                    let dmg = 0, temp_r = current_r_min, temp_idx = current_index_min, temp_hp = current_hp_min;
                    while (temp_r < ebRInt || (temp_r === ebRInt && temp_idx < ebIdxInt)) { dmg += temp_hp; temp_idx++; if (temp_idx > 4) { temp_r++; temp_idx = 1; } temp_hp = getBossMaxHP(temp_r, temp_idx); }
                    let targetRemainingHP = getBossMaxHP(ebRInt, ebIdxInt) * (ebHpPct / 100);
                    if (temp_hp > targetRemainingHP) dmg += (temp_hp - targetRemainingHP);
                    let startStr = `R${current_r_min}-${current_index_min}(${(current_hp_min/getBossMaxHP(current_r_min, current_index_min)*100).toFixed(0)}%)`, endStr = `R${ebRInt}-${ebIdxInt}(${ebHpPct}%)`;
                    resTd.innerHTML = `<span style="color:var(--neon-green);">🗺️ ${startStr} ➔ ${endStr}</span><br><span style="color:var(--neon-purple); font-weight:bold; font-size:1.1em;">${Math.floor(dmg * env.scoreRatio).toLocaleString()} 分</span>`;
                    current_hp_min = current_hp_max = targetRemainingHP; current_r_min = current_r_max = ebRInt; current_index_min = current_index_max = ebIdxInt;
                    totalMatrixScoreMin += dmg * env.scoreRatio; totalMatrixScoreMax += dmg * env.scoreRatio;
                } else { resTd.innerHTML = `<span style="color:#ff5252; font-weight:bold;">⚠️ ${t('需設定終點王與血量')}</span>`; }
            }
        } else { resTd.innerHTML = "-"; }
    });

    document.getElementById('matrix-total-score').innerText = simMode === 'auto' ? `${Math.floor(totalMatrixScoreMin).toLocaleString()} ~ ${Math.floor(totalMatrixScoreMax).toLocaleString()} 分` : `🗺️ ${Math.floor(totalMatrixScoreMin).toLocaleString()} 分`;
    saveData();
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
            let isBlacklisted = false;
            if(availableDisplayChars.includes(target) && !isBlacklisted) {
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
            let tag = isEx ? ` 🛑[耗盡]` : teamBases.has(b) && getBase(curRaw)!==b ? ` 🛑[在隊]` : "";
            html += `<option value="${name}" class="recommended" ${tag?"disabled":""}>⭐ ${t(name)} ${data.buildable && data.maxDPS > 0 ? `(${data.maxDPS.toFixed(2)}w)` : ''}${tag}</option>`;
        });
        html += '</optgroup>';
    }
    
    html += `<optgroup label="🔸 ${t('其他角色')}">`;
    let validOthers = availableDisplayChars.filter(name => !recs.has(name) && !(used[getBase(name)] >= (charData[getBase(name)]?.max || 1) && getBase(curRaw) !== getBase(name)));
    validOthers.sort((a, b) => (slotType === 3 && charData[getBase(a)]?.type !== charData[getBase(b)]?.type) ? (charData[getBase(b)]?.type.includes("生存") ? 1 : -1) : (typeof characterOrder !== 'undefined' ? characterOrder.indexOf(getBase(a)) - characterOrder.indexOf(getBase(b)) : 0));
    validOthers.forEach(name => { let inTeam = teamBases.has(getBase(name)) && getBase(curRaw)!==getBase(name); html += `<option value="${name}" ${inTeam?'disabled':''}>${t(name)}${inTeam?` 🛑[在隊]`:''}</option>`; });
    html += '</optgroup>'; return html;
}

function getMaxTeams(usedObj) {
    let baseRemains = {};
    for(let name of ownedCharacters) { let b = getBase(name); if(charData[b]) { let r = charData[b].max - (usedObj[b]||0); if(r>0) baseRemains[b] = r; } }
    let counts = Object.values(baseRemains), teams = 0;
    while(counts.length >= 3) { counts.sort((a,b)=>b-a); counts[0]--; counts[1]--; counts[2]--; teams++; counts = counts.filter(c=>c>0); }
    return Math.min(16, teams);
}

function renderRotations() {
    const container = document.getElementById('rotation-setup');
    const valid = dpsData.filter(d => isOwned(d.c1) && isOwned(d.c2) && isOwned(d.c3));
    if(!valid.length) { container.innerHTML = `<p style="color:#888;">請勾選角色以解鎖排軸</p>`; return; }
    let groups = {}; valid.forEach(d => { if(!groups[d.c1]) groups[d.c1] = []; groups[d.c1].push(d); });
    let html = '';
    for(let c1 in groups) {
        html += `<div style="margin-bottom:15px; padding:12px; background:rgba(0,0,0,0.3); border-radius:12px; border-left: 4px solid var(--gold);"><strong style="color: var(--gold);">🎯 ${t(c1)}</strong><div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">`;
        groups[c1].sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min).forEach(d => {
            let r = getRotDpsRange(d), dpsStr = (r.max > 0 || r.isCustom) ? `[${r.min.toFixed(2)}~${r.max.toFixed(2)}w]` : t('[無DPS]'), colorStyle = r.isCustom ? 'color:var(--neon-green); text-decoration:underline dashed;' : (r.min < r.max ? 'color:var(--gold);' : 'color:#fff;');
            // 🚀 核心更新：加入 data-search 屬性，包含主C、副C、生存、難度與軸名，支援全域搜索
            let searchStr = `${t(d.c1)} ${t(d.c2)} ${t(d.c3)} ${t(d.rot)} ${t(d.diff)}`.toLowerCase();
            html += `<div class="rot-row" data-search="${searchStr}" style="background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; font-size:0.9em; border: 1px solid var(--border-glass); display:inline-flex; align-items:center; gap:8px;">
                        <input type="checkbox" value="${d.id}" ${checkedRotations.has(d.id)?'checked':''} onchange="updateRotationState()">
                        <span style="color:#aaa;">${t(d.diff)}</span><span onclick="openStatsModal(event, '${d.id}')" style="cursor:pointer; font-weight:bold; ${colorStyle};">${dpsStr}</span><span style="color:#eee;">${d.isUserCustom?'<b style="color:var(--neon-green)">[自訂]</b> ':''}${t(d.c2)}/${t(d.c3)} (${t(d.rot)})</span>
                    </div>`;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

// 🚀 核心更新：使用 data-search 實現包含主C的高精度搜索
const debouncedFilterRotations = debounce(() => {
    let q = document.getElementById('rot-search').value.toLowerCase();
    document.querySelectorAll('#rotation-setup .rot-row').forEach(row => { 
        row.style.display = row.getAttribute('data-search').includes(q) ? 'inline-flex' : 'none'; 
    });
    // 如果該主C底下的排軸全部被隱藏，則隱藏整個主C區塊
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
        let ss = row.querySelectorAll('select.char-select'), c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value, scoreInput = row.querySelector('.score-input').value, ebR = row.querySelector('.end-boss-r').value, ebIdx = row.querySelector('.end-boss-idx').value, ebHp = row.querySelector('.end-boss-hp').value;
        let chk_res = [row.querySelector('.res-chk-1').checked, row.querySelector('.res-chk-2').checked, row.querySelector('.res-chk-3').checked, row.querySelector('.res-chk-4').checked];
        if (c1) { 
            let rotId = null, calculatedMinDps = 0, possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3 && checkedRotations.has(d.id));
            if (possibleRots.length > 0) { possibleRots.sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min); rotId = possibleRots[0].id; }
            let actualScore = parseFloat(scoreInput);
            if (!isNaN(actualScore) && actualScore > 0 && rotId) {
                let dmg_left = actualScore / env.scoreRatio, kills = 0, effective_dmg_sum = 0, tmp_r = start_r, tmp_idx = start_idx, tmp_hp = start_hp, dmgDealtToKilledBosses = 0;
                while (dmg_left > 0) {
                    let r_factor = chk_res[tmp_idx - 1] ? (1 - env.resPenalty / 100) : 1; if (r_factor <= 0) r_factor = 0.1; 
                    if (dmg_left >= tmp_hp) { dmg_left -= tmp_hp; dmgDealtToKilledBosses += tmp_hp; effective_dmg_sum += (tmp_hp / r_factor); kills++; tmp_idx++; if (tmp_idx > 4) { tmp_r++; tmp_idx = 1; } tmp_hp = getBossMaxHP(tmp_r, tmp_idx); } 
                    else {
                        effective_dmg_sum += (dmg_left / r_factor);
                        let ebRInt = parseInt(ebR), ebIdxInt = parseInt(ebIdx), ebHpPct = parseFloat(ebHp);
                        if (!isNaN(ebRInt) && !isNaN(ebIdxInt) && !isNaN(ebHpPct) && ebRInt === tmp_r && ebIdxInt === tmp_idx && ebHpPct >= 0.01 && ebHpPct <= 100) {
                            let hKey = `R${ebRInt}-${ebIdxInt}`; if (!bossHPHistory[hKey]) bossHPHistory[hKey] = []; bossHPHistory[hKey].push({ dmg: (actualScore / env.scoreRatio) - dmgDealtToKilledBosses, pct: (1 - (ebHpPct / 100)) });
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
    try { localStorage.setItem('ww_custom_stats', JSON.stringify(customStatsMap)); localStorage.setItem('ww_boss_hp_history', JSON.stringify(bossHPHistory)); } catch(e) {}
    renderIndividualHPPanel(); renderRotations();
    if (currentTeams.length > 0) {
        currentTeams.sort((a, b) => b.calculatedMinDps - a.calculatedMinDps);
        document.querySelectorAll('.char-select, .score-input, .end-boss-r, .end-boss-idx, .end-boss-hp').forEach(el => el.value = ""); document.querySelectorAll('input[type="checkbox"][class^="res-chk"]').forEach(c => c.checked = false);
        currentTeams.forEach((tData, index) => {
            let row = rows[index]; if(row) {
                let ss = row.querySelectorAll('select.char-select');
                ss[0].innerHTML = `<option value="${tData.c1}">${tData.c1}</option>`; ss[1].innerHTML = `<option value="${tData.c2}">${tData.c2}</option>`; ss[2].innerHTML = `<option value="${tData.c3}">${tData.c3}</option>`;
                ss[0].value = tData.c1; ss[1].value = tData.c2; ss[2].value = tData.c3;
                row.querySelector('.score-input').value = tData.scoreInput || ""; row.querySelector('.end-boss-r').value = tData.ebR || ""; row.querySelector('.end-boss-idx').value = tData.ebIdx || ""; row.querySelector('.end-boss-hp').value = tData.ebHp || "";
                tData.chk_res.forEach((res, i) => row.querySelector(`.res-chk-${i+1}`).checked = res);
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
    for (let team of validTeams) {
        let b1 = getBase(team.c1), b2 = getBase(team.c2), b3 = getBase(team.c3), u1 = charUsageCount[b1] || 0, u2 = charUsageCount[b2] || 0, u3 = charUsageCount[b3] || 0;
        if (u1 < (charData[b1]?.max||1) && u2 < (charData[b2]?.max||1) && u3 < (charData[b3]?.max||1)) { if (b1 === b2 || b1 === b3 || b2 === b3) continue; finalOptimizedTeams.push(team); charUsageCount[b1]=u1+1; charUsageCount[b2]=u2+1; charUsageCount[b3]=u3+1; }
        if (finalOptimizedTeams.length >= 16) break;
    }
    document.querySelectorAll('.char-select, .score-input, .end-boss-hp, .end-boss-r, .end-boss-idx').forEach(el => el.value=""); document.querySelectorAll('input[type="checkbox"][class^="res-chk"]').forEach(c => c.checked=false);
    let rows = document.querySelectorAll('#team-board tr');
    finalOptimizedTeams.forEach((tData, index) => { if(rows[index]) { let ss = rows[index].querySelectorAll('select.char-select'); ss[0].innerHTML = `<option value="${tData.c1}">${tData.c1}</option>`; ss[1].innerHTML = `<option value="${tData.c2}">${tData.c2}</option>`; ss[2].innerHTML = `<option value="${tData.c3}">${tData.c3}</option>`; ss[0].value = tData.c1; ss[1].value = tData.c2; ss[2].value = tData.c3; } });
    updateTracker(); alert(t(`一鍵配置完成！共組建 `) + finalOptimizedTeams.length + t(` 隊。`));
}

function applyPreset() {
    let val = document.getElementById('preset-select').value; if(!val) return;
    let cs = val.split(','), rows = document.querySelectorAll('#team-board tr'), applied = false;
    for(let r of rows) {
        let ss = r.querySelectorAll('select.char-select');
        if(!ss[0].value && !ss[1].value && !ss[2].value) { ss[0].value=cs[0]; ss[1].value=cs[1]; ss[2].value=cs[2]; applied = true; break; }
    }
    if(!applied) alert(t("沒有空白隊伍了！")); updateTracker();
}

function resetTeams() { if(!confirm(t("確定清空編隊表嗎？"))) return; document.querySelectorAll('.char-select, .score-input, .end-boss-hp, .end-boss-r, .end-boss-idx').forEach(el => el.value=""); document.querySelectorAll('input[type="checkbox"][class^="res-chk"]').forEach(c => c.checked=false); updateTracker(); }

function initBossHPMap() {
    let env = { r1_hp: parseFloat(document.getElementById('env-r1').value) || 400.89, r2_hp: parseFloat(document.getElementById('env-r2').value) || 783.56, r3_hp: parseFloat(document.getElementById('env-r3').value) || 1384.9, growth: (parseFloat(document.getElementById('env-growth').value) || 5) / 100 };
    try { let stored = localStorage.getItem('ww_boss_hp'); if (stored) bossHPMap = JSON.parse(stored); let hist = localStorage.getItem('ww_boss_hp_history'); if (hist) bossHPHistory = JSON.parse(hist); } catch(e) {}
    for (let r = 1; r <= 10; r++) { for (let i = 1; i <= 4; i++) { let key = `R${r}-${i}`; if (!bossHPMap[key] || bossHPMap[key].isDefault) { bossHPMap[key] = { value: (r === 1) ? env.r1_hp : (r === 2 && i === 1) ? 546.67 : (r === 2) ? env.r2_hp : (r === 3) ? env.r3_hp : env.r3_hp * (1 + env.growth * ((r - 4) * 4 + i)), isDefault: true }; } } }
    renderIndividualHPPanel();
}

function renderIndividualHPPanel() {
    let container = document.getElementById('individual-hp-container'); if (!container) return; let html = '';
    for (let r = 1; r <= 10; r++) {
        for (let i = 1; i <= 4; i++) {
            let key = `R${r}-${i}`, data = bossHPMap[key], btnHtml = '';
            if (bossHPHistory[key] && bossHPHistory[key].length >= 3) {
                let avg = bossHPHistory[key].reduce((sum, h) => sum + h.dmg, 0) / bossHPHistory[key].reduce((sum, h) => sum + h.pct, 0); 
                if (Math.abs(avg - getBaseEnvHP(r, i)) / getBaseEnvHP(r, i) > 0.03 && data.isDefault) btnHtml = `<button class="btn-calib" onclick="applyCalibratedHP('${key}', ${avg})">⚠️ 套用校正: ${avg.toFixed(1)}W</button>`;
            }
            html += `<div class="hp-item"><span class="hp-label">${key}</span><input type="number" class="hp-input ${!data.isDefault?'calibrated':''}" id="hp_${key}" value="${data.value.toFixed(2)}" step="10" onchange="manualUpdateHP('${key}')">${btnHtml}</div>`;
        }
    }
    container.innerHTML = html;
}

function getBaseEnvHP(r, index) { let env = getEnvSettings(); if (r === 1) return env.r1_hp; if (r === 2) return index === 1 ? 546.67 : env.r2_hp; if (r === 3) return env.r3_hp; return env.r3_hp * (1 + env.growth * ((r - 4) * 4 + index)); }
function getBossMaxHP(r, index) { return bossHPMap[`R${r}-${index}`] ? bossHPMap[`R${r}-${index}`].value : 400; }
function manualUpdateHP(key) { let val = parseFloat(document.getElementById(`hp_${key}`).value); if (!isNaN(val) && val > 0) { bossHPMap[key] = { value: val, isDefault: false }; try { localStorage.setItem('ww_boss_hp', JSON.stringify(bossHPMap)); } catch(e) {} renderIndividualHPPanel(); updateTracker(); } }
function applyCalibratedHP(key, avgValue) { bossHPMap[key] = { value: avgValue, isDefault: false }; try { localStorage.setItem('ww_boss_hp', JSON.stringify(bossHPMap)); } catch(e) {} renderIndividualHPPanel(); updateTracker(); alert(t(`已成功校正為平均值`) + `：${avgValue.toFixed(2)} ` + t(`萬`) + `！`); }
function resetIndividualHP() { bossHPMap = {}; bossHPHistory = {}; try { localStorage.removeItem('ww_boss_hp'); localStorage.removeItem('ww_boss_hp_history'); } catch(e) {} initBossHPMap(); }

function getEnvSettings() { return { scoreRatio: parseFloat(document.getElementById('env-ratio').value) || 10, r1_hp: parseFloat(document.getElementById('env-r1').value) || 400.89, r2_hp: parseFloat(document.getElementById('env-r2').value) || 783.56, r3_hp: parseFloat(document.getElementById('env-r3').value) || 1384.9, growth: (parseFloat(document.getElementById('env-growth').value) || 5) / 100, transTime: parseFloat(document.getElementById('env-trans').value) || 1.5, battleTime: parseFloat(document.getElementById('env-time').value) || 120, resPenalty: parseFloat(document.getElementById('env-res').value) || 40 }; }

function saveData() { try { localStorage.setItem('ww_roster', JSON.stringify([...ownedCharacters])); localStorage.setItem('ww_rotations', JSON.stringify([...checkedRotations])); let teams = []; document.querySelectorAll('#team-board tr').forEach(r => teams.push([...r.querySelectorAll('select.char-select')].map(s=>s.value))); localStorage.setItem('ww_teams', JSON.stringify(teams)); } catch(e) {} }

// 初始化啟動
function initializeApp() {
    initDpsData(); loadCustomRotations(); initBoard(); 
    try { isSimp = localStorage.getItem('ww_lang') === 'zh-CN'; } catch(e){}
    if (isSimp) document.getElementById('lang-toggle').innerText = "🌐 繁 / 简";
    try { const sr = localStorage.getItem('ww_roster'); if (sr) { let parsed = JSON.parse(sr); if (Array.isArray(parsed)) { ownedCharacters.clear(); parsed.forEach(name => { if (charData[name] || ['光主','暗主','風主'].includes(name)) ownedCharacters.add(name); }); } } else { ownedCharacters = new Set(Object.keys(charData)); } } catch(e) { ownedCharacters = new Set(Object.keys(charData)); }
    try { const srot = localStorage.getItem('ww_rotations'); if (srot) { let parsed = JSON.parse(srot); if (Array.isArray(parsed)) { checkedRotations.clear(); const validIds = new Set(dpsData.map(d => d.id)); parsed.forEach(id => { if (validIds.has(id)) checkedRotations.add(id); }); } } else { checkedRotations = new Set(dpsData.map(d => d.id)); } } catch(e) { checkedRotations = new Set(dpsData.map(d => d.id)); }
    try { let stored = localStorage.getItem('ww_custom_stats'); if (stored) customStatsMap = JSON.parse(stored); } catch(e) {}

    document.getElementById('skill-slider').value = 100; updateMasterSkill();
    renderCheckboxes(); renderRotations();
    
    try {
        const st = localStorage.getItem('ww_teams');
        if (st) {
            const pt = JSON.parse(st);
            document.querySelectorAll('#team-board tr').forEach((r, i) => {
                if (pt[i]) {
                    let ss = r.querySelectorAll('select.char-select');
                    if (pt[i][0]) { ss[0].innerHTML = `<option value="${pt[i][0]}">${t(pt[i][0])}</option>`; ss[0].value = pt[i][0]; }
                    if (pt[i][1]) { ss[1].innerHTML = `<option value="${pt[i][1]}">${t(pt[i][1])}</option>`; ss[1].value = pt[i][1]; }
                    if (pt[i][2]) { ss[2].innerHTML = `<option value="${pt[i][2]}">${t(pt[i][2])}</option>`; ss[2].value = pt[i][2]; }
                }
            });
        }
    } catch(e) {}
    
    updateTracker(); 
    updateToggleButtons(); 
    document.querySelectorAll('.tab-btn')[0].click(); 
    translateDOM(document.body);
}

// 啟動
initializeApp();
