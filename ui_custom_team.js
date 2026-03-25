// ==========================================
// 檔案：ui_custom_team.js
// 職責：自訂排軸實驗室、彈窗渲染、曲線圖繪製、排軸匯入匯出、工作坊 (UI層)
// ==========================================

var ctGridData = []; 
var currentHoverX = -1; 
const skillOptions = ['普攻', '重擊', '共技', '回路', '共解', '變奏', '延奏', '聲骸技能', '效應', '震諧', '諧度破壞'];

// ==========================================
// --- 0. 隊伍參數與排軸特徵彈窗 (Stats Modal) ---
// ==========================================
var activeStatsRotId = null;

function openStatsModal(e, rotId) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    activeStatsRotId = rotId;
    
    let d = dpsData.find(x => x.id === rotId); 
    let titleName = d ? `${t(d.c1)} + ${t(d.c2)} + ${t(d.c3)} - ${d.rot}` : rotId;
    document.getElementById('stats-modal-rot').innerText = titleName;

    let stats = customStatsMap[rotId] || {};
    
    document.getElementById('sm-dps').value = stats.dps !== undefined ? parseFloat(stats.dps).toFixed(2) : (d && d.dps ? parseFloat(d.dps).toFixed(2) : '');
    document.getElementById('sm-stability').value = stats.stability !== undefined ? parseFloat(stats.stability).toFixed(1) : 100;
    document.getElementById('sm-buff').value = stats.buff !== undefined ? parseFloat(stats.buff).toFixed(1) : 0;
    
    let getGlobalCr = (cName) => {
        if (!cName) return "";
        let b = cName === '光主' || cName === '暗主' || cName === '風主' ? '漂泊者' : cName;
        return (globalCharStats[b] && globalCharStats[b].cr !== undefined) ? globalCharStats[b].cr : "-";
    };

    document.getElementById('sm-crit-c1').value = (stats.mcCrit && stats.mcCrit.c1 !== undefined && stats.mcCrit.c1 !== "") ? stats.mcCrit.c1 : "";
    document.getElementById('sm-crit-c2').value = (stats.mcCrit && stats.mcCrit.c2 !== undefined && stats.mcCrit.c2 !== "") ? stats.mcCrit.c2 : "";
    document.getElementById('sm-crit-c3').value = (stats.mcCrit && stats.mcCrit.c3 !== undefined && stats.mcCrit.c3 !== "") ? stats.mcCrit.c3 : "";

    document.getElementById('sm-crit-c1').placeholder = "全域: " + getGlobalCr(d ? d.c1 : "");
    document.getElementById('sm-crit-c2').placeholder = "全域: " + getGlobalCr(d ? d.c2 : "");
    document.getElementById('sm-crit-c3').placeholder = "全域: " + getGlobalCr(d ? d.c3 : "");

    if (stats.curvePoints) {
        document.getElementById('sm-curvePoints').value = JSON.stringify(stats.curvePoints);
    } else {
        document.getElementById('sm-curvePoints').value = "";
    }

    let m = document.getElementById('stats-modal');
    if (typeof translateDOM === 'function') translateDOM(m);
    m.style.display = 'flex';
    setTimeout(() => { drawStatsCurveChart(); }, 50);
}

function closeStatsModal() { 
    document.getElementById('stats-modal').style.display = 'none'; 
    activeStatsRotId = null; 
}

function clearStatsModal() { 
    if (activeStatsRotId) { 
        delete customStatsMap[activeStatsRotId]; 
        if(typeof safeStorageSet === 'function') safeStorageSet('ww_custom_stats', customStatsMap); 
        if(typeof debouncedRenderAndTrack === 'function') debouncedRenderAndTrack(); 
    } 
    closeStatsModal(); 
}

function saveStatsModal() {
    if (!activeStatsRotId) return;
    
    let dpsVal = parseFloat(document.getElementById('sm-dps').value);
    let stabVal = parseFloat(document.getElementById('sm-stability').value);
    let buffVal = parseFloat(document.getElementById('sm-buff').value) || 0;
    if (isNaN(dpsVal) || isNaN(stabVal)) return alert(t("請輸入有效的數字！"));

    let c1Str = document.getElementById('sm-crit-c1').value;
    let c2Str = document.getElementById('sm-crit-c2').value;
    let c3Str = document.getElementById('sm-crit-c3').value;
    
    let c1 = c1Str !== "" ? Math.min(100, Math.max(0, parseFloat(c1Str))) : "";
    let c2 = c2Str !== "" ? Math.min(100, Math.max(0, parseFloat(c2Str))) : "";
    let c3 = c3Str !== "" ? Math.min(100, Math.max(0, parseFloat(c3Str))) : "";

    let ptsStr = document.getElementById('sm-curvePoints').value;
    let pts = null;
    if(ptsStr) { try { pts = JSON.parse(ptsStr); } catch(e){} }

    if (!customStatsMap[activeStatsRotId]) customStatsMap[activeStatsRotId] = {};
    customStatsMap[activeStatsRotId].dps = dpsVal;
    customStatsMap[activeStatsRotId].stability = Math.min(100, Math.max(0, stabVal));
    customStatsMap[activeStatsRotId].buff = buffVal;
    customStatsMap[activeStatsRotId].mcCrit = { c1: c1, c2: c2, c3: c3 };
    if (pts) customStatsMap[activeStatsRotId].curvePoints = pts;

    if(typeof safeStorageSet === 'function') safeStorageSet('ww_custom_stats', customStatsMap);
    if(typeof debouncedRenderAndTrack === 'function') debouncedRenderAndTrack();
    
    closeStatsModal();
}

function drawStatsCurveChart() {
    let canvas = document.getElementById('sm-curve-canvas');
    if (!canvas) return;
    let ctx = canvas.getContext('2d');
    let w = canvas.width; let h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    let kInput = document.getElementById('sm-curvePoints').value;
    if (!kInput) {
        ctx.fillStyle = '#aaa'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
        ctx.fillText("尚無特徵曲線資料", w/2, h/2);
        return;
    }

    let keyframes;
    try { keyframes = JSON.parse(kInput); } catch(e) { return; }
    if (!keyframes || keyframes.length < 2) return;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1; ctx.beginPath();
    for(let i = 1; i < 4; i++) { ctx.moveTo(0, h * (i/4)); ctx.lineTo(w, h * (i/4)); }
    ctx.stroke();

    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2.5; ctx.lineJoin = 'miter'; ctx.beginPath();
    ctx.moveTo(keyframes[0].t * w, h - (keyframes[0].d * h));
    for(let i = 1; i < keyframes.length; i++) { ctx.lineTo(keyframes[i].t * w, h - (keyframes[i].d * h)); }
    ctx.stroke();

    ctx.lineTo(w, h); ctx.lineTo(0, h);
    let gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.4)'); gradient.addColorStop(1, 'rgba(212, 175, 55, 0.0)');
    ctx.fillStyle = gradient; ctx.fill();

    ctx.fillStyle = '#00ffaa';
    for(let i = 0; i < keyframes.length; i++) {
        let pt = keyframes[i]; 
        if (i === 0 || pt.d > keyframes[i-1].d + 0.0001) {
             ctx.beginPath(); ctx.arc(pt.t * w, h - (pt.d * h), 3.5, 0, Math.PI * 2); ctx.fill();
        }
    }
}

// ==========================================
// --- 1. 排軸實驗室介面與彈窗 ---
// ==========================================
function openCustomTeamModal() {
    let m = document.getElementById('custom-team-modal');
    if (!m) return alert("⚠️ 找不到彈窗容器，請確認 index.html 是否已加入 custom-team-modal");
    if (typeof charData === 'undefined') return;
    
    if (document.getElementById('ct-duration') === null) {
        ctGridData = []; 
    }
    
    let charOpts = '';
    if (typeof characterOrder !== 'undefined') {
        characterOrder.forEach(n => { 
            if (n === '漂泊者') { charOpts += `<option value="光主">${t("光主")}</option><option value="暗主">${t("暗主")}</option><option value="風主">${t("風主")}</option>`; } 
            else if (charData[n]) { charOpts += `<option value="${n}">${t(n)}</option>`; } 
        });
    }

    if (document.getElementById('ct-duration') === null) {
        m.innerHTML = `
            <div style="background:var(--bg-panel); backdrop-filter:blur(20px); padding:20px 25px; border-radius:16px; border:1px solid var(--gold); width:620px; max-width:95%; max-height:92vh; overflow-y:auto; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(212, 175, 55, 0.3); padding-bottom:10px; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                    <h3 style="margin:0; color:var(--gold); font-size:1.2em;">⚙️ ${t('自訂排軸實驗室')}</h3>
                    <select id="ct-diff" style="appearance: none; -webkit-appearance: none; width: auto; margin: 0; padding: 6px 35px 6px 15px; font-size: 0.9em; font-weight: 800; color: var(--gold); background-color: rgba(20, 20, 24, 0.8); border: 1px solid var(--gold); border-radius: 30px; cursor: pointer; outline: none; background-image: url(&quot;data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d4af37' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 12px center; background-size: 14px; box-shadow: 0 2px 10px rgba(212, 175, 55, 0.15); transition: 0.2s;">
                        <option value="🟩" style="background:#1e1e24; color:#fff;">🟩 ${t('輪椅')}</option>
                        <option value="🔵" style="background:#1e1e24; color:#fff;">🔵 ${t('中等')}</option>
                        <option value="⭐" style="background:#1e1e24; color:#fff;" selected>⭐ ${t('進階')}</option>
                        <option value="⚠️" style="background:#1e1e24; color:#fff;">⚠️ ${t('極難')}</option>
                        <option value="🧩" style="background:#1e1e24; color:#fff;">🧩 ${t('非主流')}</option>
                    </select>
                </div>
                
                <details open style="margin-bottom: 12px; background:rgba(0,0,0,0.3); border-radius:10px; border:1px solid #444;">
                    <summary style="padding:12px; color:#aaa; font-size:0.9em; font-weight:bold; cursor:pointer; outline:none;">1️⃣ 選擇出戰成員 (點擊展開/摺疊)</summary>
                    <div style="padding: 0 12px 12px 12px; display:flex; gap:10px; flex-wrap:wrap;">
                        <select id="ct-c1" class="char-select" style="flex:1; min-width:120px; margin:0;" onchange="renderCTGrid()"><option value="">-- ${t('主C')} --</option>${charOpts}</select>
                        <select id="ct-c2" class="char-select" style="flex:1; min-width:120px; margin:0;" onchange="renderCTGrid()"><option value="">-- ${t('副C')} --</option>${charOpts}</select>
                        <select id="ct-c3" class="char-select" style="flex:1; min-width:120px; margin:0;" onchange="renderCTGrid()"><option value="">-- ${t('生存')} --</option>${charOpts}</select>
                    </div>
                </details>

                <details style="margin-bottom: 12px; background:rgba(0,0,0,0.3); border-radius:10px; border:1px solid #444;">
                    <summary style="padding:12px; color:var(--gold); font-size:0.9em; font-weight:bold; cursor:pointer; outline:none;">2️⃣ 數據匯入解析 (貼上文字 / 點擊展開)</summary>
                    <div style="padding: 0 12px 12px 12px;">
                        <textarea id="ct-magic-paste" placeholder="從試算表複製 [角色]、[技能]、[時間]、[傷害] 貼於此處..." style="width:100%; height:50px; background:rgba(0,0,0,0.6); color:#fff; border:1px solid var(--border-glass); padding:8px; border-radius:6px; outline:none; font-family:monospace; resize:vertical; font-size:0.8em; box-sizing:border-box;"></textarea>
                        <button type="button" onclick="runMagicParser_CT()" style="width:100%; margin-top:8px; background:var(--gold); color:#000; font-weight:bold; border:none; padding:8px; border-radius:6px; cursor:pointer; transition: 0.2s;">
                            ✨ 執行解析並產生排軸
                        </button>
                    </div>
                </details>

                <details open style="margin-bottom: 12px; background:rgba(0,0,0,0.4); border-radius:10px; border:1px solid #555;">
                    <summary style="padding:12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; outline:none;">
                        <div style="color:#00ffaa; font-size:0.9em; font-weight:bold;">3️⃣ 軸心微調 (點擊展開/摺疊)</div>
                    </summary>
                    <div style="padding: 0 10px 10px 10px;">
                        <div style="display:flex; justify-content:flex-end; align-items:center; margin-bottom:10px; gap:8px; flex-wrap:wrap;">
                            <button onclick="sortCTGridByTime()" class="btn-action-all" style="padding:4px 10px; font-size:0.75em; border-radius:4px; box-shadow:none; background:rgba(212, 175, 55, 0.2); border-color:var(--gold); color:var(--gold);">⏳ 依時間排序</button>
                            <button onclick="recalcCustomTeamStats()" class="btn-action-all" style="padding:4px 10px; font-size:0.75em; border-radius:4px; box-shadow:none; background:rgba(0, 255, 170, 0.2); border-color:var(--neon-green); color:var(--neon-green);">🧮 重新計算與繪圖</button>
                            <button onclick="clearCTGrid()" class="btn-action-clear" style="padding:4px 10px; font-size:0.75em; border-radius:4px; box-shadow:none; border:1px solid #ff5252; color:#ff5252; background:transparent;">🗑️ 清空列表</button>
                        </div>
                        <div style="overflow-x:auto; width:100%; border-radius:6px;">
                            <div style="min-width: 520px;">
                                <div style="display:flex; padding:0 5px 8px 5px; font-size:0.8em; color:#888; font-weight:bold; border-bottom:1px solid #444; margin-bottom: 10px; text-align:center;">
                                    <div style="flex:1.5; text-align:left;">👤 角色</div>
                                    <div style="flex:1.4; text-align:left;">⚔️ 技能</div>
                                    <div style="flex:1.4; text-align:left;">📝 備註</div>
                                    <div style="flex:1.1;">⏱️ 時間</div>
                                    <div style="width:24px; margin:0 4px;"></div>
                                    <div style="flex:1.4; text-align:right;">💥 傷害</div>
                                    <div style="width:28px; margin-left:4px;"></div>
                                </div>
                                <div id="ct-grid-container" style="max-height: 220px; overflow-y: auto; padding-right: 5px;">
                                    <p style="text-align:center; color:#555; font-size:0.85em; margin:10px 0;">(尚無排軸資料)</p>
                                </div>
                            </div>
                        </div>
                        <button onclick="addCTRow()" style="width:100%; margin-top:10px; background:rgba(255,255,255,0.05); color:#aaa; border:1px dashed #666; padding:6px; border-radius:6px; cursor:pointer; font-size:0.85em;">➕ 手動新增一列</button>
                    </div>
                </details>

                <details open style="margin-bottom: 15px; background:rgba(0,0,0,0.3); border-radius:10px; border:1px solid #555;">
                    <summary style="padding:12px; color:#cf00ff; font-size:0.9em; font-weight:bold; cursor:pointer; outline:none;">4️⃣ 結算預覽 (點擊展開/摺疊)</summary>
                    <div style="padding: 0 10px 10px 10px;">
                        <div style="display:flex; gap:8px; margin-bottom:10px; background:rgba(207, 0, 255, 0.05); padding:10px; border-radius:8px; border: 1px solid rgba(207, 0, 255, 0.3); flex-wrap:wrap;">
                            <div style="flex:1; min-width:120px; display:flex; flex-direction:column; gap:4px;">
                                <label style="color:#aaa; font-size:0.8em;">⏱️ 最終軸長 (秒)</label>
                                <input type="number" id="ct-duration" value="25.0" max="120" class="score-input" style="margin:0; border-color:#00ffaa; color:#00ffaa; font-size:1.1em; font-weight:bold; text-align:center;">
                            </div>
                            <div style="flex:1; min-width:120px; display:flex; flex-direction:column; gap:4px;">
                                <label style="color:#aaa; font-size:0.8em;">⚔️ 理論 DPS (萬)</label>
                                <input type="number" id="ct-dps" readonly class="score-input" style="margin:0; border-color:var(--gold); color:var(--gold); font-size:1.1em; font-weight:bold; text-align:center; background:rgba(0,0,0,0.5);">
                            </div>
                        </div>
                        <div style="background:rgba(0,0,0,0.6); border-radius:10px; padding:10px 10px 25px 10px; border:1px solid #555; position:relative; overflow:hidden;">
                            <canvas id="ct-curve-canvas" width="480" height="120" style="width:100%; height:120px; display:block; cursor:crosshair;"></canvas>
                            <div id="ct-curve-tooltip" style="display:none; position:absolute; top:10px; left:10px; background:rgba(10,10,12,0.9); border:1px solid var(--neon-green); color:#fff; padding:6px 10px; border-radius:6px; font-size:0.8em; pointer-events:none; box-shadow:0 4px 10px rgba(0,0,0,0.8); z-index:10; white-space:nowrap;">
                                <div style="color:#aaa; font-size:0.9em; margin-bottom:2px;">⏱️ <span id="tt-time">0.0</span> s</div>
                                <div style="color:var(--gold); font-weight:bold;">💥 <span id="tt-dmg">0</span> 萬</div>
                            </div>
                        </div>
                    </div>
                </details>

                <input type="hidden" id="ct-curve-k" value="">
                <input type="hidden" id="ct-actual-duration" value="25">
                
                <div style="display:flex; gap:10px; margin-top:auto;">
                    <button onclick="document.getElementById('custom-team-modal').style.display='none'" class="btn-action-clear" style="flex:1; background:#444; border:none; padding:10px;">${t('取消')}</button>
                    <button onclick="saveCustomTeam()" class="btn-action-all" style="flex:2; background:var(--neon-green); color:#000; padding:10px; font-size:1.05em;">💾 ${t('儲存並套用編隊')}</button>
                </div>
            </div>`;
            
        let cvs = document.getElementById('ct-curve-canvas');
        if (cvs) {
            cvs.addEventListener('mousemove', (e) => {
                let rect = cvs.getBoundingClientRect();
                let scaleX = cvs.width / rect.width;
                currentHoverX = (e.clientX - rect.left) * scaleX;
                drawCurveChart(); 
            });
            cvs.addEventListener('mouseleave', () => {
                currentHoverX = -1;
                let tt = document.getElementById('ct-curve-tooltip');
                if (tt) tt.style.display = 'none';
                drawCurveChart();
            });
        }
    }
        
    if (typeof translateDOM === 'function') translateDOM(m);
    m.style.display = 'flex';
}

function loadCustomTeamAsTemplate(index) {
    if (typeof closeDataManager === 'function') closeDataManager(); 
    openCustomTeamModal();
    
    let cr = customRotations[index]; 
    if (!cr) return;
    
    setTimeout(() => {
        document.getElementById('ct-c1').value = cr.c1 || "";
        document.getElementById('ct-c2').value = cr.c2 || "";
        document.getElementById('ct-c3').value = cr.c3 || "";
        document.getElementById('ct-diff').value = cr.diff || "⭐";
        document.getElementById('ct-duration').value = cr.duration || 25;
        document.getElementById('ct-dps').value = cr.dps || 0;
        
        ctGridData = cr.gridData ? JSON.parse(JSON.stringify(cr.gridData)) : [];
        let stats = customStatsMap['custom_rot_' + cr.id];
        document.getElementById('ct-curve-k').value = (stats && stats.curvePoints) ? JSON.stringify(stats.curvePoints) : "";
        
        renderCTGrid(); 
        drawCurveChart();
        alert(t("✅ 已將此排軸載入面板！您可以自由修改。"));
    }, 100);
}

// ==========================================
// --- 2. 排軸表格操作邏輯 ---
// ==========================================
function renderCTGrid() {
    let container = document.getElementById('ct-grid-container');
    if (ctGridData.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#555; font-size:0.85em; margin:10px 0;">(尚無排軸資料)</p>`;
        recalcCustomTeamStats();
        return;
    }
    
    let c1 = document.getElementById('ct-c1').value || "";
    let c2 = document.getElementById('ct-c2').value || "";
    let c3 = document.getElementById('ct-c3').value || "";

    let html = '';
    ctGridData.forEach((row, idx) => {
        html += `
        <div style="display:flex; gap:4px; margin-bottom:6px; align-items:center;">
            <select class="score-input" onchange="updateCTRow(${idx}, 'char', this.value)" style="flex:1.5; margin:0; padding:4px 2px; font-size:0.8em; background:rgba(0,0,0,0.8); border: 1px solid var(--gold); border-radius: 4px; color: #fff;">
                <option value="">-角色-</option>
                ${c1 ? `<option value="${c1}" ${row.char===c1?'selected':''}>${c1}</option>` : ''}
                ${c2 ? `<option value="${c2}" ${row.char===c2?'selected':''}>${c2}</option>` : ''}
                ${c3 ? `<option value="${c3}" ${row.char===c3?'selected':''}>${c3}</option>` : ''}
            </select>
            <select class="score-input" onchange="updateCTRow(${idx}, 'skill', this.value)" style="flex:1.4; margin:0; padding:4px 2px; font-size:0.8em; background:rgba(0,0,0,0.8); border: 1px solid var(--gold); border-radius: 4px; color: #fff;">
                <option value="">-技能-</option>
                ${skillOptions.map(s => `<option value="${s}" ${row.skill===s?'selected':''}>${s}</option>`).join('')}
            </select>
            <input type="text" class="score-input" value="${row.action || ''}" onchange="updateCTRow(${idx}, 'action', this.value)" placeholder="備註" style="flex:1.4; margin:0; padding:4px; font-size:0.8em; background:rgba(0,0,0,0.8); border: 1px solid #555; border-radius: 4px; color: #fff;">
            <input type="number" class="score-input" value="${row.time}" oninput="updateCTRow(${idx}, 'time', this.value)" step="0.1" max="120" style="flex:1.1; margin:0; padding:4px; font-size:0.8em; text-align:center; color:var(--neon-green); border: 1px solid var(--neon-green); border-radius: 4px; background:rgba(0,0,0,0.8);">
            <button onclick="swapCTRowTimeDmg(${idx})" title="互換時間與傷害" style="width:24px; height:24px; margin:0 4px; padding:0; display:flex; justify-content:center; align-items:center; background:rgba(255,255,255,0.1); border:1px solid #666; color:#aaa; border-radius:4px; cursor:pointer;">⇄</button>
            <input type="number" class="score-input" value="${row.dmg}" oninput="updateCTRow(${idx}, 'dmg', this.value)" style="flex:1.4; margin:0; padding:4px; font-size:0.8em; text-align:right; color:var(--gold); border: 1px solid var(--gold); border-radius: 4px; background:rgba(0,0,0,0.8);">
            <button onclick="removeCTRow(${idx})" class="btn-action-clear" style="width:28px; height:28px; padding:0; border-radius:4px; font-size:0.9em; display:flex; justify-content:center; align-items:center; background:#d9534f; color:#fff; border:none; cursor:pointer;" title="刪除此列">✖</button>
        </div>`;
    });
    container.innerHTML = html;
    recalcCustomTeamStats();
}

function updateCTRow(idx, field, value) {
    if(field === 'time' || field === 'dmg') {
        let num = parseFloat(value);
        if (field === 'time' && num > 120) { num = 120; alert("⚠️ 單一動作時間不能超過 120 秒上限！"); } 
        ctGridData[idx][field] = isNaN(num) ? 0 : num;
        recalcCustomTeamStats(); 
    } else {
        ctGridData[idx][field] = value;
    }
}

function swapCTRowTimeDmg(idx) {
    let tempTime = ctGridData[idx].time;
    let newTime = ctGridData[idx].dmg;
    if (newTime > 120) {
        alert("⚠️ 互換後的數值超過時間 120 秒上限，系統已強制截斷至 120！");
        newTime = 120;
    }
    ctGridData[idx].time = newTime;
    ctGridData[idx].dmg = tempTime;
    renderCTGrid();
}

function sortCTGridByTime() {
    ctGridData.sort((a, b) => a.time - b.time);
    renderCTGrid();
}

function addCTRow() { 
    ctGridData.push({ char: "", skill: "", action: "", time: 0, dmg: 0 }); 
    renderCTGrid(); 
}

function removeCTRow(idx) { 
    ctGridData.splice(idx, 1); 
    renderCTGrid(); 
}

function clearCTGrid() { 
    if(confirm("確定要清空所有排軸資料嗎？")) { ctGridData = []; renderCTGrid(); } 
}

// ==========================================
// --- 3. 智能語意解析器 ---
// ==========================================
function runMagicParser_CT() {
    let rawData = document.getElementById('ct-magic-paste').value;
    if (!rawData.trim()) return alert(t("請先在文字框貼上排軸資料！"));
    let lines = rawData.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return alert(t("資料過少，無法解析！"));

    let c1 = document.getElementById('ct-c1').value || "";
    let c2 = document.getElementById('ct-c2').value || "";
    let c3 = document.getElementById('ct-c3').value || "";
    let teamChars = [c1, c2, c3].filter(x => x);

    let allChars = [];
    if (typeof charData !== 'undefined') allChars = Object.keys(charData);
    if (allChars.length === 0 && typeof characterOrder !== 'undefined') allChars = characterOrder;

    const skillMap = {
        'basic': '普攻', 'heavy': '重擊', 'skill': '共技', 'forte': '回路',
        'liberation': '共解', 'intro': '變奏', 'outro': '延奏', 'echo': '聲骸技能',
        'tb': '諧度破壞', 'toughness': '諧度破壞'
    };

    let parsedRows = [];
    lines.forEach(line => {
        let parts = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
        parts = parts.map(p => p.trim()).filter(p => p);
        
        let numbers = []; 
        let texts = [];
        parts.forEach(p => { 
            let cleanP = p.replace(/,/g, ''); 
            if (/^\d+(\.\d+)?$/.test(cleanP)) { numbers.push(parseFloat(cleanP)); } 
            else { texts.push(p); } 
        });

        if (numbers.length > 0 || texts.length > 0) {
            parsedRows.push({ numbers, texts });
        }
    });

    if (parsedRows.length === 0) return alert(t("無法辨識出內容！"));

    let timeIdx = 0, dmgIdx = 1;
    let validRows = parsedRows.filter(r => r.numbers.length >= 2);
    if (validRows.length > 1) {
        let incCount0 = 0, incCount1 = 0;
        for (let i = 1; i < validRows.length; i++) {
            if (validRows[i].numbers[0] >= validRows[i-1].numbers[0]) incCount0++;
            if (validRows[i].numbers[1] >= validRows[i-1].numbers[1]) incCount1++;
        }
        if (incCount1 > incCount0) { timeIdx = 1; dmgIdx = 0; }
    }

    let tempData = [];
    parsedRows.forEach(row => {
        if (row.numbers.length === 0) return;

        let dmgVal = 0; let rawTimeVal = 0;
        if (row.numbers.length === 1) { 
            dmgVal = row.numbers[0]; 
        } else { 
            rawTimeVal = row.numbers[timeIdx] !== undefined ? row.numbers[timeIdx] : 0;
            dmgVal = row.numbers[dmgIdx] !== undefined ? row.numbers[dmgIdx] : 0;
        }

        let charVal = "";
        let skillVal = "";
        let extractedNotes = [];
        
        let fullText = row.texts.join(' ');

        let bracketRegex = /[\[\(\【\（](.*?)[\]\)\】\）]/g;
        let match;
        while ((match = bracketRegex.exec(fullText)) !== null) {
            if(match[1].trim()) extractedNotes.push(match[1].trim());
        }
        fullText = fullText.replace(/[\[\(\【\（].*?[\]\)\】\）]/g, ' ');

        allChars.forEach(c => {
            if (fullText.includes(c)) {
                if (!charVal && (teamChars.includes(c) || teamChars.length === 0)) charVal = c; 
                fullText = fullText.replace(new RegExp(c, 'g'), ' '); 
            }
        });

        skillOptions.forEach(s => {
            if (fullText.includes(s)) {
                if (!skillVal) skillVal = s;
                fullText = fullText.replace(new RegExp(s, 'g'), ' ');
            }
        });

        for (let eng in skillMap) {
            if (fullText.toLowerCase().includes(eng)) {
                if (!skillVal) skillVal = skillMap[eng];
                fullText = fullText.replace(new RegExp(eng, 'ig'), ' ');
            }
        }

        fullText = fullText.replace(/^[:：\-\s]+/, '').replace(/\s+/g, ' ').trim();

        let actionDetail = [...extractedNotes, fullText].filter(x => x).join(' ').substring(0, 40);
        
        tempData.push({ char: charVal, skill: skillVal, action: actionDetail, rawTime: rawTimeVal, dmg: dmgVal });
    });

    let isDuration = false;
    for (let i = 1; i < tempData.length; i++) { 
        if (tempData[i].rawTime < tempData[i-1].rawTime && tempData[i].rawTime > 0) { isDuration = true; break; } 
    }
    
    ctGridData = []; 
    let cumulativeTime = 0; 
    let noTimeData = tempData.every(x => x.rawTime === 0);
    
    tempData.forEach((item, index) => {
        let finalTime = 0;
        if (isDuration) { cumulativeTime += item.rawTime; finalTime = cumulativeTime; } 
        else if (noTimeData) { finalTime = index; } 
        else { finalTime = item.rawTime; }
        
        if (finalTime > 120) finalTime = 120;
        ctGridData.push({ char: item.char, skill: item.skill, action: item.action, time: parseFloat(finalTime.toFixed(2)), dmg: item.dmg });
    });
    
    renderCTGrid();
}

// ==========================================
// --- 4. 畫布繪製與數學運算 ---
// ==========================================
function recalcCustomTeamStats() {
    let totalDmg = 0; let maxTime = 0;
    if (ctGridData.length > 0) { ctGridData.forEach(row => { totalDmg += row.dmg; if (row.time > maxTime) maxTime = row.time; }); }

    let manualDuration = parseFloat(document.getElementById('ct-duration').value) || 25;
    let finalDuration = Math.max(manualDuration, maxTime);
    if (finalDuration > 120) { finalDuration = 120; alert("⚠️ 偵測到總軸長超過 120 秒！系統已強制截斷至 120 秒上限。"); }

    document.getElementById('ct-actual-duration').value = finalDuration;

    if (maxTime > manualDuration && maxTime <= 120) { document.getElementById('ct-duration').value = maxTime.toFixed(1); } 
    else if (finalDuration === 120) { document.getElementById('ct-duration').value = "120.0"; }

    let dpsInWan = 0;
    if (finalDuration > 0) {
        dpsInWan = (totalDmg / 10000) / finalDuration;
        if (totalDmg < 10000 && totalDmg > 0) { dpsInWan = totalDmg / finalDuration; }
    }
    document.getElementById('ct-dps').value = dpsInWan.toFixed(2);

    let keyframes = extractKeyframesCT(ctGridData, totalDmg, finalDuration);
    document.getElementById('ct-curve-k').value = JSON.stringify(keyframes);
    drawCurveChart();
}

function extractKeyframesCT(gridData, totalDmg, finalDuration) {
    if (totalDmg <= 0 || finalDuration <= 0) return [{t:0, d:0}, {t:1, d:1}];
    
    let sortedData = [...gridData].sort((a, b) => a.time - b.time);
    let keyframes = [{ t: 0, d: 0 }];
    let cumulativeDmg = 0;
    
    for (let i = 0; i < sortedData.length; i++) {
        let row = sortedData[i];
        if (row.dmg <= 0) continue; 

        let currentT = row.time / finalDuration;
        currentT = Math.min(1.0, Math.max(0, currentT));
        
        let epsilon = 0.0001; 
        if (currentT > keyframes[keyframes.length - 1].t + epsilon) {
            keyframes.push({
                t: parseFloat((currentT - epsilon).toFixed(4)), 
                d: parseFloat((cumulativeDmg / totalDmg).toFixed(4))
            });
        }
        
        cumulativeDmg += row.dmg;
        let currentD = cumulativeDmg / totalDmg;
        
        keyframes.push({ 
            t: parseFloat(currentT.toFixed(4)), 
            d: parseFloat(currentD.toFixed(4)) 
        });
    }
    
    if (keyframes.length === 0 || keyframes[keyframes.length - 1].t < 1.0) {
        keyframes.push({ t: 1.0, d: 1.0 });
    }
    
    return keyframes;
}

function drawCurveChart() {
    let canvas = document.getElementById('ct-curve-canvas');
    if (!canvas) return;
    let ctx = canvas.getContext('2d');
    let w = canvas.width; let h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    let kInput = document.getElementById('ct-curve-k').value;
    let actualDuration = parseFloat(document.getElementById('ct-actual-duration').value) || 25;
    if (!kInput) return;

    let keyframes;
    try { keyframes = JSON.parse(kInput); } catch(e) { return; }
    if (keyframes.length < 2) return;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1; ctx.beginPath();
    for(let i = 1; i < 4; i++) { ctx.moveTo(0, h * (i/4)); ctx.lineTo(w, h * (i/4)); }
    ctx.stroke();

    let interval = actualDuration > 60 ? 20 : (actualDuration > 30 ? 10 : 5); 
    ctx.fillStyle = '#666'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
    ctx.beginPath();
    for(let sec = 0; sec <= actualDuration; sec += interval) {
        let xPos = (sec / actualDuration) * w;
        ctx.moveTo(xPos, 0); ctx.lineTo(xPos, h);
        if (sec > 0 && sec < actualDuration) { ctx.fillText(sec + "s", xPos, h - 5); }
    }
    ctx.stroke();

    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2.5; ctx.lineJoin = 'miter'; ctx.beginPath();
    ctx.moveTo(keyframes[0].t * w, h - (keyframes[0].d * h));
    for(let i = 1; i < keyframes.length; i++) { 
        ctx.lineTo(keyframes[i].t * w, h - (keyframes[i].d * h)); 
    }
    ctx.stroke();

    ctx.lineTo(w, h); ctx.lineTo(0, h);
    let gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.4)'); gradient.addColorStop(1, 'rgba(212, 175, 55, 0.0)');
    ctx.fillStyle = gradient; ctx.fill();

    ctx.fillStyle = '#00ffaa';
    for(let i = 0; i < keyframes.length; i++) {
        let pt = keyframes[i]; 
        if (i === 0 || pt.d > keyframes[i-1].d + 0.0001) {
             ctx.beginPath(); ctx.arc(pt.t * w, h - (pt.d * h), 3.5, 0, Math.PI * 2); ctx.fill();
        }
    }

    if (typeof currentHoverX !== 'undefined' && currentHoverX >= 0 && keyframes.length > 0) {
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(currentHoverX, 0); ctx.lineTo(currentHoverX, h);
        ctx.stroke();
        ctx.setLineDash([]);

        let normT = currentHoverX / w;
        normT = Math.max(0, Math.min(1, normT));
        
        let left = 0, right = keyframes.length - 1, bestIdx = 0;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (keyframes[mid].t <= normT) {
                bestIdx = mid;
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        let currentDmgRatio = keyframes[bestIdx].d;

        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(currentHoverX, h - (currentDmgRatio * h), 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#00ffaa'; ctx.lineWidth = 2; ctx.stroke();

        let tt = document.getElementById('ct-curve-tooltip');
        if (tt) {
            tt.style.display = 'block';
            let cvsRect = canvas.getBoundingClientRect();
            let cssX = (currentHoverX / w) * cvsRect.width;
            
            let leftPos = cssX + 15;
            if (leftPos + 100 > cvsRect.width) leftPos = cssX - 110; 

            tt.style.left = leftPos + 'px';
            
            let actTime = normT * actualDuration;
            let dpsInWan = parseFloat(document.getElementById('ct-dps').value) || 0;
            let actDmgInWan = currentDmgRatio * (dpsInWan * actualDuration);

            document.getElementById('tt-time').innerText = actTime.toFixed(1);
            document.getElementById('tt-dmg').innerText = actDmgInWan.toFixed(1);
        }
    }
}

// ==========================================
// --- 5. 排軸存檔與 V2 (WW2_) 匯出匯入邏輯 ---
// ==========================================
function saveCustomTeam() {
    let c1 = document.getElementById('ct-c1').value, c2 = document.getElementById('ct-c2').value, c3 = document.getElementById('ct-c3').value;
    let dps = parseFloat(document.getElementById('ct-dps').value) || 0;
    let diff = document.getElementById('ct-diff').value || '⭐';
    let duration = parseFloat(document.getElementById('ct-duration').value) || 25; 
    let curveKVal = document.getElementById('ct-curve-k').value;
    
    if (!c1 || !c2 || !c3) return alert(t('請完整選擇三名角色！'));
    if (dps <= 0) return alert(t('請輸入有效大於0的 DPS！(或透過匯入排軸自動產生)'));
    
    let totalDmg = dps * duration; 
    let parsedPointsArray = [];
    if (curveKVal) { try { parsedPointsArray = JSON.parse(curveKVal); } catch (e) { console.warn("Curve parse failed"); } }
    
    if (typeof saveCustomRotationData === 'function') {
        saveCustomRotationData(c1, c2, c3, dps, diff, duration, totalDmg, JSON.parse(JSON.stringify(ctGridData)), parsedPointsArray, "自訂");
    } else {
        alert("找不到資料庫 API，請確認 data_manager.js 是否已載入");
        return;
    }
    
    if(typeof updateToggleButtons === 'function') updateToggleButtons();
    if(typeof debouncedRenderAndTrack === 'function') debouncedRenderAndTrack(); 
    
    document.getElementById('custom-team-modal').style.display = 'none'; 
    alert(t('✅ 自訂編隊已成功加入沙盤！'));
}

// 🚀 V2.4 版匯出邏輯：全域 ID + 嚴格純數字化 (僅備註保留字串)
function exportSingleRotation(index) {
    let cr = customRotations[index];
    if (!cr) return alert("❌ 找不到排軸資料");

    let allChars = [];
    if (typeof characterOrder !== 'undefined') allChars = characterOrder;
    else if (typeof charData !== 'undefined') allChars = Object.keys(charData);

    let id1 = allChars.indexOf(cr.c1); if (id1 === -1) id1 = 999;
    let id2 = allChars.indexOf(cr.c2); if (id2 === -1) id2 = 999;
    let id3 = allChars.indexOf(cr.c3); if (id3 === -1) id3 = 999;
    
    let teamIds = [id1, id2, id3];
    let teamNames = [cr.c1, cr.c2, cr.c3];

    const diffOptions = ['🟩', '🔵', '⭐', '⚠️', '🧩'];
    let diffId = diffOptions.indexOf(cr.diff);
    if (diffId === -1) diffId = 2; // 預設 ⭐

    let packedGrid = (cr.gridData || []).map(r => {
        let charPos = teamNames.indexOf(r.char);
        if (charPos === -1) charPos = 99;

        let skillId = skillOptions.indexOf(r.skill);
        if (skillId === -1) skillId = 99;

        return [charPos, skillId, r.time, r.dmg, r.action || ""];
    });

    let exportData = {
        c: teamIds, 
        df: diffId,
        dp: cr.dps,
        du: cr.duration || 25,
        td: cr.totalDmg || (cr.dps * (cr.duration || 25)),
        gd: packedGrid,
        n: "" 
    };

    let shareCode = compressRotationDataV2(exportData);
    
    if (shareCode) {
        fallbackCopyTextToClipboard(shareCode);
    } else {
        alert("❌ 壓縮失敗");
    }
}

function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea"); 
    textArea.value = text; textArea.style.position = "fixed";
    document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert(t("✅ 專屬分享碼已複製到剪貼簿！")); } catch (err) { alert("❌ 複製失敗"); }
    document.body.removeChild(textArea);
}

// 🚀 雙引擎智慧路由匯出 (V1 究極二進位 + V2.5 扁平化字串)
function exportSingleRotation(index) {
    let cr = customRotations[index];
    if (!cr) return alert("❌ 找不到排軸資料");

    let grid = cr.gridData || [];
    
    // 1. 智慧掃描：判斷備註欄是否包含「非數字」字串
    let requiresV2 = false;
    for (let i = 0; i < grid.length; i++) {
        let act = grid[i].action || "";
        if (act !== "" && !/^\d+$/.test(act)) {
            requiresV2 = true;
            break;
        }
    }

    let shareCode = "";
    
    let allChars = [];
    if (typeof characterOrder !== 'undefined') allChars = characterOrder;
    else if (typeof charData !== 'undefined') allChars = Object.keys(charData);

    let id1 = allChars.indexOf(cr.c1); if (id1 === -1) id1 = 999;
    let id2 = allChars.indexOf(cr.c2); if (id2 === -1) id2 = 999;
    let id3 = allChars.indexOf(cr.c3); if (id3 === -1) id3 = 999;
    let teamNames = [cr.c1, cr.c2, cr.c3];
    const diffOptions = ['🟩', '🔵', '⭐', '⚠️', '🧩'];

    if (requiresV2) {
        // ====================================================
        // 🟡 模式 A：啟用 V2.5 扁平化字串引擎 (支援任意中英文備註)
        // ====================================================
        let teamIds = [id1, id2, id3];
        let diffId = diffOptions.indexOf(cr.diff);
        if (diffId === -1) diffId = 2;

        let flatGridString = grid.map(r => {
            let charPos = teamNames.indexOf(r.char);
            if (charPos === -1) charPos = 99;
            let skillId = skillOptions.indexOf(r.skill);
            if (skillId === -1) skillId = 99;
            
            // 防呆：去除分隔符
            let safeAction = (r.action || "").replace(/[|;]/g, " ");
            return `${charPos};${skillId};${r.time};${r.dmg};${safeAction}`;
        }).join('|');

        let exportData = {
            c: teamIds, 
            df: diffId,
            dp: cr.dps,
            du: cr.duration || 25,
            td: cr.totalDmg || (cr.dps * (cr.duration || 25)),
            g: flatGridString 
        };

        if (typeof compressRotationDataV2 === 'function') {
            shareCode = compressRotationDataV2(exportData);
        } else {
            return alert("❌ 找不到 V2 壓縮引擎");
        }
        
    } else {
        // ====================================================
        // 🟢 模式 B：啟用 V1 舊版二進位引擎 (純數字/無備註)
        // ====================================================
        let bytes = [];
        
        function writeVarInt(val) {
            val = Math.floor(val);
            while (true) {
                let b = val & 0x7F;
                val >>= 7;
                if (val > 0) { bytes.push(b | 0x80); } 
                else { bytes.push(b); break; }
            }
        }

        bytes.push(id1 !== 999 ? id1 : 0);
        bytes.push(id2 !== 999 ? id2 : 0);
        bytes.push(id3 !== 999 ? id3 : 0);
        
        let diffIdx = diffOptions.indexOf(cr.diff);
        bytes.push(diffIdx !== -1 ? diffIdx : 2);
        
        writeVarInt((cr.duration || 25) * 100);

        let currentTime = 0;
        for (let i = 0; i < grid.length; i++) {
            let r = grid[i];
            let charPos = teamNames.indexOf(r.char);
            if (charPos === -1) charPos = 0;
            let skillId = skillOptions.indexOf(r.skill);
            if (skillId === -1) skillId = 0;

            bytes.push((charPos << 4) | skillId);

            let actionNum = parseInt(r.action);
            writeVarInt(isNaN(actionNum) ? 0 : actionNum);

            let tDelta = Math.round(r.time * 100) - Math.round(currentTime * 100);
            if (tDelta < 0) tDelta = 0;
            writeVarInt(tDelta);
            currentTime = r.time;

            writeVarInt(Math.round(r.dmg));
        }

        if (typeof encodeBase85 === 'function') {
            shareCode = "WWZ_" + encodeBase85(new Uint8Array(bytes));
        } else {
            return alert("❌ 找不到 Base85 編碼引擎");
        }
    }

    if (shareCode) {
        fallbackCopyTextToClipboard(shareCode);
    } else {
        alert("❌ 壓縮失敗");
    }
}

function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea"); 
    textArea.value = text; textArea.style.position = "fixed";
    document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert(t("✅ 專屬分享碼已複製到剪貼簿！")); } catch (err) { alert("❌ 複製失敗"); }
    document.body.removeChild(textArea);
}

// 🚀 V2.5 版匯入邏輯：支援扁平化字串、舊陣列與 V1
function importSingleRotation() {
    let code = document.getElementById('dm-single-import-code')?.value.trim();
    if (!code) return alert(t("❌ 請貼上分享碼。"));
    
    let importedData = decompressRotationData(code);
    
    if (importedData) {
        let allChars = [];
        if (typeof characterOrder !== 'undefined') allChars = characterOrder;
        else if (typeof charData !== 'undefined') allChars = Object.keys(charData);

        let cArray = importedData.c || [];
        
        let c1 = (typeof cArray[0] === 'number') ? (allChars[cArray[0]] || "未知") : (cArray[0] || importedData.c1 || "未知");
        let c2 = (typeof cArray[1] === 'number') ? (allChars[cArray[1]] || "未知") : (cArray[1] || importedData.c2 || "未知");
        let c3 = (typeof cArray[2] === 'number') ? (allChars[cArray[2]] || "未知") : (cArray[2] || importedData.c3 || "未知");
        let teamNames = [c1, c2, c3];
        
        const diffOptions = ['🟩', '🔵', '⭐', '⚠️', '🧩'];
        let diff = (typeof importedData.df === 'number') ? (diffOptions[importedData.df] || '⭐') : (importedData.df || importedData.diff || "⭐");
        
        let dps = importedData.dp || importedData.dps || 0;
        let dur = importedData.du || importedData.duration || 25;
        let totalDmg = importedData.td || importedData.totalDmg || (dps * dur);
        
        let gridData = [];
        // 🌟 核心還原：判斷是否為 V2.5 的扁平化字串
        if (typeof importedData.g === 'string') {
            if (importedData.g.length > 0) {
                let rows = importedData.g.split('|');
                gridData = rows.map(rowStr => {
                    let parts = rowStr.split(';');
                    let cPos = parseInt(parts[0]);
                    let sId = parseInt(parts[1]);
                    return {
                        char: isNaN(cPos) ? "未知" : (teamNames[cPos] || "未知"),
                        skill: isNaN(sId) ? "普攻" : (skillOptions[sId] || "普攻"),
                        time: parseFloat(parts[2]) || 0,
                        dmg: parseFloat(parts[3]) || 0,
                        action: parts[4] || ""
                    };
                });
            }
        } else {
            // 向下相容 V2.4 與之前的 JSON 陣列格式
            let rawGrid = importedData.gd || importedData.gridData || [];
            gridData = rawGrid.map(r => {
                if (Array.isArray(r)) {
                    let charName = (typeof r[0] === 'number') ? (teamNames[r[0]] || "未知") : r[0];
                    let skillName = (typeof r[1] === 'number') ? (skillOptions[r[1]] || "普攻") : r[1];
                    return { char: charName, skill: skillName, time: r[2], dmg: r[3], action: r[4] };
                }
                return r;
            });
        }
        
        let curvePoints = typeof extractKeyframesCT === 'function' ? extractKeyframesCT(gridData, totalDmg, dur) : [];
        
        if (typeof saveCustomRotationData === 'function') {
            saveCustomRotationData(c1, c2, c3, dps, diff, dur, totalDmg, gridData, curvePoints, "自訂(匯入)");
            if(document.getElementById('dm-single-import-code')) document.getElementById('dm-single-import-code').value = "";
            if (typeof debouncedRenderAndTrack === 'function') debouncedRenderAndTrack(); 
            if (typeof openDataManager === 'function') openDataManager(); 
            alert(t("✅ 匯入成功。"));
        }
    } else {
        alert(t("❌ 解析失敗。請確認代碼格式是否正確。"));
    }
}

// ==========================================
// --- 6. 向下相容：舊版 V1 (WWZ_) 解析器 ---
// ==========================================
function parseLegacyV1Code(shareCode) {
    try {
        let actualCode = shareCode.substring(4);
        let bytes = decodeBase85(actualCode); 
        if(!bytes || bytes.length === 0) return null;
        
        let ptr = { idx: 0 };
        function readVarInt() {
            let result = 0, shift = 0;
            while (true) {
                if (ptr.idx >= bytes.length) return result;
                let b = bytes[ptr.idx++];
                result |= (b & 0x7F) << shift;
                if ((b & 0x80) === 0) break;
                shift += 7;
            }
            return result;
        }
        
        let allChars = []; 
        if(typeof characterOrder !== 'undefined') allChars = characterOrder; 
        else if(typeof charData !== 'undefined') allChars = Object.keys(charData);
        
        let c1 = allChars[bytes[ptr.idx++]] || "未知";
        let c2 = allChars[bytes[ptr.idx++]] || "未知";
        let c3 = allChars[bytes[ptr.idx++]] || "未知";
        let diff = ['🟩', '🔵', '⭐', '⚠️', '🧩'][bytes[ptr.idx++] & 0x7F] || '⭐';
        let dur = readVarInt() / 100;
        
        let gridData = [], totalDmg = 0, currentTime = 0;

        while(ptr.idx < bytes.length) {
            let b0 = bytes[ptr.idx++];
            let actionStr = ""; 
            let feature = readVarInt(); 
            if(feature > 0) actionStr = feature.toString(); 
            
            currentTime += readVarInt() / 100; 
            let d = readVarInt(); 
            totalDmg += d;
            
            let charName = [c1, c2, c3][(b0 >> 4) & 0x0F] || c1;
            let skillName = skillOptions[b0 & 0x0F] || "普攻";
            
            gridData.push({ 
                char: charName, 
                skill: skillName, 
                time: parseFloat(currentTime.toFixed(2)), 
                dmg: d, 
                action: actionStr 
            });
        }
        
        let dps = dur > 0 ? (totalDmg < 10000 && totalDmg > 0 ? totalDmg / dur : (totalDmg / 10000) / dur) : 0;
        
        return {
            c1: c1,
            c2: c2,
            c3: c3,
            diff: diff,
            duration: dur,
            dps: dps,
            totalDmg: totalDmg,
            gridData: gridData
        };
    } catch (e) {
        console.error("V1 舊版代碼解析失敗:", e);
        return null;
    }
}

// ==========================================
// --- 7. 排軸工作坊 (Workshop Terminal) ---
// ==========================================
let currentWorkshopTab = "全部";
let currentWorkshopMode = "local"; 
let cloudRotations = []; 
let currentWorkshopSearch = "";

function openWorkshopModal() {
    let m = document.getElementById('workshop-modal');
    if (!m) return alert(t("❌ 找不到工作坊 UI 容器，請確認 index.html 是否已更新"));
    
    let searchEl = document.getElementById('ws-search-input');
    if (searchEl) searchEl.value = "";
    currentWorkshopSearch = "";

    if (typeof translateDOM === 'function') translateDOM(m);
    m.style.display = 'flex';
    
    setWorkshopMode('local');
}

let _wsSearchTimeout = null;
function updateWorkshopSearch() {
    clearTimeout(_wsSearchTimeout);
    _wsSearchTimeout = setTimeout(() => {
        let el = document.getElementById('ws-search-input');
        currentWorkshopSearch = el ? el.value.toLowerCase().trim() : "";
        renderWorkshopCards(); 
    }, 200);
}

function closeWorkshopModal() {
    let m = document.getElementById('workshop-modal');
    if (m) m.style.display = 'none';
}

function setWorkshopMode(mode) {
    currentWorkshopMode = mode;
    currentWorkshopTab = "全部"; 

    let btnLocal = document.getElementById('ws-tab-local');
    let btnCloud = document.getElementById('ws-tab-cloud');

    if (btnLocal && btnCloud) {
        if (mode === 'local') {
            btnLocal.style.background = 'rgba(207,0,255,0.3)'; btnLocal.style.color = '#fff'; btnLocal.style.border = 'none'; btnLocal.style.boxShadow = '0 2px 10px rgba(207,0,255,0.2)';
            btnCloud.style.background = 'rgba(255,255,255,0.05)'; btnCloud.style.color = '#aaa'; btnCloud.style.border = '1px solid #555'; btnCloud.style.boxShadow = 'none';
            renderWorkshopSidebar();
            renderWorkshopCards();
        } else {
            btnCloud.style.background = 'rgba(0,255,170,0.2)'; btnCloud.style.color = '#fff'; btnCloud.style.border = '1px solid var(--neon-green)'; btnCloud.style.boxShadow = '0 2px 10px rgba(0,255,170,0.2)';
            btnLocal.style.background = 'rgba(255,255,255,0.05)'; btnLocal.style.color = '#aaa'; btnLocal.style.border = '1px solid #555'; btnLocal.style.boxShadow = 'none';
            
            if (cloudRotations.length === 0) {
                fetchCloudRotations(); 
            } else {
                renderWorkshopSidebar();
                renderWorkshopCards();
            }
        }
    }
}

function getActiveWorkshopData() {
    return currentWorkshopMode === 'local' ? (typeof customRotations !== 'undefined' ? customRotations : []) : cloudRotations;
}

function renderWorkshopSidebar() {
    let container = document.getElementById('workshop-sidebar');
    if (!container) return;

    let dataSource = getActiveWorkshopData();
    let c1Set = new Set();
    dataSource.forEach(cr => { if (cr && cr.c1) c1Set.add(cr.c1); });
    let uniqueC1 = Array.from(c1Set).sort();

    let colorTheme = currentWorkshopMode === 'local' ? '#cf00ff' : 'var(--neon-green)';
    let bgTheme = currentWorkshopMode === 'local' ? 'rgba(207,0,255,0.2)' : 'rgba(0,255,170,0.2)';

    let html = `<button onclick="currentWorkshopTab='全部'; renderWorkshopSidebar(); renderWorkshopCards();" style="width:100%; text-align:left; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer; border:1px solid ${currentWorkshopTab==='全部'?colorTheme:'transparent'}; background:${currentWorkshopTab==='全部'?bgTheme:'rgba(255,255,255,0.05)'}; color:${currentWorkshopTab==='全部'?'#fff':'#aaa'}; transition:0.2s;">🌟 ${t('全部排軸')}</button>`;
    
    uniqueC1.forEach(c => {
        let isActive = (currentWorkshopTab === c);
        html += `<button onclick="currentWorkshopTab='${c}'; renderWorkshopSidebar(); renderWorkshopCards();" style="width:100%; text-align:left; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer; border:1px solid ${isActive?colorTheme:'transparent'}; background:${isActive?bgTheme:'rgba(255,255,255,0.05)'}; color:${isActive?'#fff':'#aaa'}; transition:0.2s;">👤 ${t(c)}</button>`;
    });

    container.innerHTML = html;
}

function getCurveSimilarity(g1, g2, d1, d2) {
    if (!g1 || !g2 || g1.length === 0 || g2.length === 0) return 0;
    let bins = 10; 
    let v1 = new Array(bins).fill(0), v2 = new Array(bins).fill(0);
    let t1 = 0, t2 = 0;
    
    g1.forEach(r => { let b = Math.min(bins-1, Math.max(0, Math.floor((r.time/(d1||25))*bins))); v1[b] += (r.dmg||0); t1 += (r.dmg||0); });
    g2.forEach(r => { let b = Math.min(bins-1, Math.max(0, Math.floor((r.time/(d2||25))*bins))); v2[b] += (r.dmg||0); t2 += (r.dmg||0); });
    
    if (t1 === 0 || t2 === 0) return 0;
    
    let dot = 0, m1 = 0, m2 = 0;
    for(let i=0; i<bins; i++) {
        let n1 = v1[i]/t1, n2 = v2[i]/t2; 
        dot += n1*n2; m1 += n1*n1; m2 += n2*n2;
    }
    return (m1 && m2) ? (dot / Math.sqrt(m1 * m2)) * 100 : 0;
}

function getRotationSimilarity(r1, r2) {
    if (!r1 || !r2) return 0;
    let d1 = parseFloat(r1.duration) || 25, d2 = parseFloat(r2.duration) || 25;
    
    let curveSim = getCurveSimilarity(r1.gridData, r2.gridData, d1, d2);
    if (curveSim === 0) return 0;

    let dps1 = parseFloat(r1.dps) || 0, dps2 = parseFloat(r2.dps) || 0;
    let dpsSim = (dps1 === 0 && dps2 === 0) ? 100 : (Math.min(dps1, dps2) / Math.max(dps1, dps2)) * 100;

    let durSim = (Math.min(d1, d2) / Math.max(d1, d2)) * 100;

    let act1 = r1.gridData ? r1.gridData.length : 0, act2 = r2.gridData ? r2.gridData.length : 0;
    let actSim = (act1 === 0 && act2 === 0) ? 100 : (Math.min(act1, act2) / Math.max(act1, act2)) * 100;

    let diffSim = (r1.diff === r2.diff) ? 100 : 50;

    return (curveSim * 0.4) + (dpsSim * 0.2) + (durSim * 0.2) + (actSim * 0.15) + (diffSim * 0.05);
}

let activeSorts = [{ metric: 'dps', desc: true }]; 
const sortDefaults = { 'dps': true, 'density': false, 'duration': false, 'sim': true }; 

function setWorkshopSort(metric) {
    let existingIdx = activeSorts.findIndex(s => s.metric === metric);
    
    if (existingIdx === -1) {
        activeSorts.push({ metric: metric, desc: sortDefaults[metric] });
    } else {
        let current = activeSorts[existingIdx];
        if (current.desc === sortDefaults[metric]) {
            current.desc = !current.desc;
        } else {
            activeSorts.splice(existingIdx, 1);
        }
    }
    
    updateSortButtonsUI();
    renderWorkshopCards();
}

function updateSortButtonsUI() {
    const metricLabels = { 'dps': '💥 DPS', 'density': t('🎹 密度'), 'duration': t('⏱️ 軸長'), 'sim': t('📊 吻合度') };
    ['dps', 'density', 'duration', 'sim'].forEach(m => {
        let btn = document.getElementById('sort-btn-' + m);
        if (!btn) return;
        
        let idx = activeSorts.findIndex(s => s.metric === m);
        if (idx !== -1) {
            let sortData = activeSorts[idx];
            btn.style.color = 'var(--neon-green)';
            btn.style.background = 'rgba(0,255,170,0.2)';
            let prefix = activeSorts.length > 1 ? `${idx + 1}. ` : ''; 
            btn.innerText = prefix + metricLabels[m] + (sortData.desc ? ' ↓' : ' ↑');
        } else {
            btn.style.color = '#aaa';
            btn.style.background = 'transparent';
            btn.innerText = metricLabels[m];
        }
    });
}

function renderWorkshopCards() {
    let container = document.getElementById('workshop-content');
    if (!container) return;
    
    let html = '';
    let hasData = false;
    let dataSource = getActiveWorkshopData();
    
    // 🌟 在雲端模式下，隱藏所有標記為待審核的排軸
    if (currentWorkshopMode === 'cloud') {
        dataSource = dataSource.filter(cr => !cr.isPendingReview);
    }

    let augmentedData = dataSource.map((cr, originalIndex) => {
        if (!cr) return null;
        let actionCount = cr.gridData ? cr.gridData.length : 0;
        let dur = parseFloat(cr.duration) || 25;
        let density = dur > 0 ? (actionCount / dur) : 0; 
        
        let peakDensity = 0;
        if (cr.gridData && cr.gridData.length > 0) {
            let windowSize = 5.0; 
            for (let i = 0; i < cr.gridData.length; i++) {
                let startTime = cr.gridData[i].time;
                let count = 0;
                for (let j = i; j < cr.gridData.length; j++) {
                    if (cr.gridData[j].time - startTime <= windowSize) count++;
                    else break;
                }
                let currentDensity = count / windowSize;
                if (currentDensity > peakDensity) peakDensity = currentDensity;
            }
        }
        
        let sim = null;
        if (currentWorkshopMode === 'cloud') {
            let localMatch = typeof customRotations !== 'undefined' ? customRotations.find(lr => lr.c1 === cr.c1 && lr.c2 === cr.c2 && lr.c3 === cr.c3) : null;
            if (localMatch && typeof getRotationSimilarity === 'function') {
                sim = getRotationSimilarity(cr, localMatch);
            }
        }
        return { ...cr, originalIndex, actionCount, density, peakDensity, sim };
    }).filter(cr => cr !== null);

    let filterHighDps = document.getElementById('filter-high-dps') ? document.getElementById('filter-high-dps').checked : false;
    let filterWheelchair = document.getElementById('filter-wheelchair') ? document.getElementById('filter-wheelchair').checked : false;
    let filterShort = document.getElementById('filter-short') ? document.getElementById('filter-short').checked : false;
    let filterNew = document.getElementById('filter-new') ? document.getElementById('filter-new').checked : false;

    let filteredData = augmentedData.filter(cr => {
        if (currentWorkshopTab !== '全部' && cr.c1 !== currentWorkshopTab) return false;
        
        if (typeof currentWorkshopSearch !== 'undefined' && currentWorkshopSearch) {
            let searchTarget = `${t(cr.c1)} ${t(cr.c2)} ${t(cr.c3)} ${cr.author || ''} ${cr.description || ''} ${cr.rotName || ''}`.toLowerCase();
            if (!searchTarget.includes(currentWorkshopSearch)) return false; 
        }

        if (filterHighDps && (parseFloat(cr.dps) || 0) < 6) return false; 
        if (filterWheelchair && cr.actionCount > 40) return false; 
        if (filterShort && (parseFloat(cr.duration) || 25) > 20) return false; 
        if (filterNew && cr.sim !== null && cr.sim >= 75) return false; 

        return true; 
    });

    filteredData.sort((a, b) => {
        for (let i = 0; i < activeSorts.length; i++) {
            let { metric, desc } = activeSorts[i];
            let valA = 0, valB = 0;
            
            if (metric === 'dps') {
                valA = parseFloat(a.dps) || 0; valB = parseFloat(b.dps) || 0;
            } else if (metric === 'density') {
                valA = a.density; valB = b.density;
            } else if (metric === 'duration') {
                valA = parseFloat(a.duration) || 25; valB = parseFloat(b.duration) || 25;
            } else if (metric === 'sim') {
                valA = a.sim !== null ? a.sim : -1; 
                valB = b.sim !== null ? b.sim : -1;
            }

            if (valA !== valB) {
                return desc ? (valB - valA) : (valA - valB);
            }
        }
        return 0; 
    });

    filteredData.forEach((cr) => {
        hasData = true;

        let dpsVal = cr.dps ? parseFloat(cr.dps).toFixed(1) : 0;
        let durVal = cr.duration ? parseFloat(cr.duration).toFixed(1) : 25;
        let diffVal = t(cr.diff) || "⭐";
        
        let authorTag = cr.author ? `<div style="position:absolute; top:-10px; right:15px; background:#222; border:1px solid var(--neon-green); color:var(--neon-green); padding:2px 8px; border-radius:12px; font-size:0.75em; z-index:3;">✍️ ${cr.author}</div>` : '';
        let deleteBtn = currentWorkshopMode === 'local' ? `<button onclick="deleteWorkshopItem(${cr.originalIndex})" style="background:#d9534f; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;" title="${t('刪除此排軸')}">🗑️</button>` : '';

        let simHtml = '';
        if (cr.sim !== null) {
            let simColor = cr.sim >= 85 ? '#00ffaa' : cr.sim >= 60 ? 'var(--gold)' : '#ff4444';
            simHtml = `
            <div style="position:absolute; top:12px; left:15px; background:rgba(0,0,0,0.8); border:1px solid ${simColor}; color:${simColor}; padding:3px 8px; border-radius:6px; font-size:0.75em; font-weight:bold; box-shadow: 0 2px 5px rgba(0,0,0,0.5); z-index:2;">
                ${t('📊 相同編隊排軸吻合度: ')}${cr.sim.toFixed(0)}%
            </div>`;
        }

        let descHtml = '';
        if (cr.description) {
            descHtml = `
            <div style="margin-bottom: 15px; background: rgba(0,0,0,0.4); border-left: 3px solid var(--neon-purple); padding: 8px 10px; font-size: 0.85em; color: #ccc; border-radius: 4px; line-height: 1.4;">
                <strong style="color:var(--neon-purple);">${t('📝 介紹：')}</strong>${cr.description}
            </div>`;
        }

        let titleStr = cr.rotName ? `<span style="color:#00ffaa; font-size:0.9em; margin-right:8px; border-bottom:1px solid rgba(0,255,170,0.5); padding-bottom:2px;">${t(cr.rotName)}</span>` : '';

        html += `
        <div style="background:rgba(0,0,0,0.6); border:1px solid #555; border-radius:12px; padding:15px; display:flex; flex-direction:column; position:relative; box-shadow: 0 4px 10px rgba(0,0,0,0.5); margin-top:8px;">
            ${simHtml}
            ${authorTag}
            <div style="font-weight:bold; color:var(--gold); margin-bottom:12px; font-size:1.1em; display:flex; align-items:center; gap:6px; margin-top:${simHtml ? '25px' : '0'}; flex-wrap: wrap;">
                ${titleStr} ${t(cr.c1)} <span style="color:#666; font-size:0.8em;">+</span> ${t(cr.c2)} <span style="color:#666; font-size:0.8em;">+</span> ${t(cr.c3)}
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.85em; color:#ccc; background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; flex-wrap: wrap; gap:5px;">
                <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
                    <span style="color:#888;">${t('⏱️ 軸長')}</span>
                    <span style="color:#00ffaa; font-weight:bold;">${durVal}s</span>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
                    <span style="color:#888;">${t('💥 DPS')}</span>
                    <span style="color:var(--gold); font-weight:bold;">${dpsVal} ${t('萬')}</span>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; flex:1.2; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 5px;">
                    <span style="color:#888; font-size:0.95em; white-space:nowrap;">${t('🎹 均/極 密度')}</span>
                    <div style="display:flex; align-items:baseline; gap:4px;" title="${t('總動作數: ')}${cr.actionCount} | ${t('5秒最高爆發: ')}${cr.peakDensity.toFixed(2)} ${t('動/秒')}">
                        <span style="color:#fff; font-weight:bold;">${cr.density.toFixed(2)}</span>
                        <span style="color:#ff5252; font-weight:bold; font-size:0.85em;">(${cr.peakDensity.toFixed(1)})</span>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; flex:1; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 5px;">
                    <span style="color:#888;">${t('難度')}</span>
                    <span>${diffVal}</span>
                </div>
            </div>

            ${descHtml} 
            
            <div style="display:flex; gap:8px; margin-top:auto;">
                <button onclick="${currentWorkshopMode === 'local' ? `loadCustomTeamAsTemplate(${cr.originalIndex})` : `importCloudRotation(${cr.originalIndex})`}; closeWorkshopModal();" style="flex:2; background:var(--neon-green); color:#000; border:none; padding:8px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.9em;">📥 ${currentWorkshopMode === 'local' ? t('載入沙盤') : t('下載並套用')}</button>
                
                ${currentWorkshopMode === 'local' ? `<button onclick="openUploadModal('custom_rot_${cr.id}')" style="flex:1; background:var(--neon-purple); color:#fff; border:none; padding:8px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.9em;">☁️ ${t('發布')}</button>` : ''}
                
                ${deleteBtn}
            </div>
        </div>`;
    });

    if (!hasData) {
        let emptyText = currentWorkshopMode === 'local' 
            ? t("目前尚無符合條件的本機排軸。") 
            : t("雲端大廳找不到符合所有條件的結果，請嘗試放寬篩選。");
        html = `<div style="grid-column: 1 / -1; color:#888; text-align:center; padding:40px; font-size:1.1em; background:rgba(0,0,0,0.3); border-radius:12px; border:1px dashed #555;">${emptyText}</div>`;
    }
    
    container.innerHTML = html;
}

// ==========================================
// ☁️ 雲端大廳真實串接與解析 (Google Sheets API)
// ==========================================
const CLOUD_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSc4i-R7QJYm7OWKqr5-s64YmbzTF53U8FsXIsusUWtyf3ci3BjhGfb2OSG2Ykv0WGT16qlvJaPC750/pub?output=csv";

// 🌟 新增：獨立的雲端抓取與解析函式 (供背景靜默抓取與前景抓取共用)
async function fetchAndParseCloudData() {
    const response = await fetch(CLOUD_CSV_URL + "&t=" + new Date().getTime());
    if (!response.ok) throw new Error(`HTTP 伺服器回應異常狀態: ${response.status}`);
    
    const csvText = await response.text();
    const rows = parseRobustCSV(csvText);
    
    if (rows.length < 2) throw new Error(t("雲端資料庫目前沒有任何排軸"));

    let parsedRotations = [];

    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        if (!row || row.length < 9) continue; 

        let author = row[1] ? row[1].trim() : t("佚名玩家");
        let description = row[7] ? row[7].trim() : "";
        
        // 🌟 標記待審核，但不直接 skip，而是留給後續查重比對與大廳隱藏判斷
        let isPendingReview = description.includes("【待審核】");

        let shareCode = "";
        for (let col of row) {
            if (col && typeof col === 'string' && (col.trim().startsWith('WW2_') || col.trim().startsWith('WWZ_'))) {
                shareCode = col.trim();
                break;
            }
        }

        if (!shareCode) continue;

        let rotName = t("雲端排軸");
        let desc = description;
        let match = description.match(/^【(.*?)】\n?([\s\S]*)$/);
        if (match) { rotName = match[1]; desc = match[2].trim(); }

        try {
            let decodedData = typeof decompressRotationData === 'function' ? decompressRotationData(shareCode) : null;
            
            if (decodedData) {
                let allChars = typeof characterOrder !== 'undefined' ? characterOrder : Object.keys(charData);
                let cArray = decodedData.c || [];
                let c1 = (typeof cArray[0] === 'number') ? (allChars[cArray[0]] || "未知") : (cArray[0] || decodedData.c1 || row[2] || "未知");
                let c2 = (typeof cArray[1] === 'number') ? (allChars[cArray[1]] || "未知") : (cArray[1] || decodedData.c2 || row[3] || "未知");
                let c3 = (typeof cArray[2] === 'number') ? (allChars[cArray[2]] || "未知") : (cArray[2] || decodedData.c3 || row[4] || "未知");
                let teamNames = [c1, c2, c3];

                let gridData = [];
                if (typeof decodedData.g === 'string' && decodedData.g.length > 0) {
                    let rowsGrid = decodedData.g.split('|');
                    gridData = rowsGrid.map(rowStr => {
                        let parts = rowStr.split(';');
                        let cPos = parseInt(parts[0]);
                        let sId = parseInt(parts[1]);
                        return {
                            char: isNaN(cPos) ? "未知" : (teamNames[cPos] || "未知"),
                            skill: isNaN(sId) ? "普攻" : (skillOptions[sId] || "普攻"),
                            time: parseFloat(parts[2]) || 0,
                            dmg: parseFloat(parts[3]) || 0,
                            action: parts[4] || ""
                        };
                    });
                } else {
                    let rawGrid = decodedData.gd || decodedData.gridData || [];
                    gridData = rawGrid.map(r => {
                        if (Array.isArray(r)) return { char: (typeof r[0] === 'number') ? (teamNames[r[0]] || "未知") : r[0], skill: (typeof r[1] === 'number') ? (skillOptions[r[1]] || "普攻") : r[1], time: r[2], dmg: r[3], action: r[4] };
                        return r;
                    });
                }

                if (gridData.length > 0) {
                    const diffOptions = ['🟩', '🔵', '⭐', '⚠️', '🧩'];
                    let parsedDiff = (typeof decodedData.df === 'number') ? (diffOptions[decodedData.df] || '⭐') : (decodedData.df || decodedData.diff || "🧩");

                    parsedRotations.push({
                        c1: c1, c2: c2, c3: c3,
                        duration: decodedData.du || decodedData.duration || parseFloat(row[5]) || 25,
                        dps: decodedData.dp || decodedData.dps || parseFloat(row[6]) || 0,
                        diff: parsedDiff, author: author, rotName: rotName, description: desc,
                        totalDmg: decodedData.td || decodedData.totalDmg || (parseFloat(row[6]) * parseFloat(row[5])) || 0,
                        gridData: gridData, rawCode: shareCode, isPendingReview: isPendingReview
                    });
                }
            }
        } catch (decodeErr) {
            console.warn(`[雲端大廳] 略過一筆損毀的分享碼 (提供者: ${author})`);
        }
    }

    if (parsedRotations.length === 0) throw new Error(t("成功連線，但所有分享碼皆無法解析。請確認資料格式。"));
    return parsedRotations;
}

async function fetchCloudRotations() {
    let container = document.getElementById('workshop-content');
    
    container.innerHTML = `
        <div style="grid-column: 1 / -1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 20px;">
            <div class="spinner" style="width:40px; height:40px; border:4px solid rgba(0, 255, 170, 0.2); border-top:4px solid var(--neon-green); border-radius:50%; animation:spin 1s linear infinite; margin-bottom:15px;"></div>
            <div style="color:var(--neon-green); font-size:1.2em; letter-spacing: 2px;">${t('連線至戰術大廳...')}</div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>`;

    try {
        cloudRotations = await fetchAndParseCloudData();
        
        activeSorts = [{ metric: 'dps', desc: true }];
        updateSortButtonsUI();
        
        renderWorkshopSidebar();
        renderWorkshopCards();

    } catch (error) {
        console.error("雲端大廳連線失敗:", error);
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:50px; background:rgba(255, 68, 68, 0.1); border:1px solid rgba(255, 68, 68, 0.3); border-radius:8px;">
                <div style="color:#ff4444; font-size:1.5em; margin-bottom:10px;">❌ 戰術大廳連線失敗</div>
                <div style="color:#aaa; font-size:0.9em;">${error.message}</div>
            </div>`;
    }
}

function parseRobustCSV(text) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) {
            if (s && l === p) row[i] += l; 
            s = !s;
        } else if (',' === l && s) {
            l = row[++i] = '';
        } else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else {
            row[i] += l;
        }
        p = l;
    }
    return ret.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
}

function importCloudRotation(index) {
    let cr = cloudRotations[index];
    if (!cr) return;
    
    let curvePoints = typeof extractKeyframesCT === 'function' ? extractKeyframesCT(cr.gridData, cr.totalDmg, cr.duration) : [];
    
    let defaultName = cr.rotName || t("雲端神軸");
    let finalName = prompt("📥 " + t("準備下載此排軸，請為它命名："), defaultName);
    
    if (finalName === null) return; 
    finalName = finalName.trim() || defaultName; 
    
    if (typeof saveCustomRotationData === 'function') {
        saveCustomRotationData(cr.c1, cr.c2, cr.c3, cr.dps, cr.diff, cr.duration, cr.totalDmg, cr.gridData, curvePoints, finalName);
        
        if (typeof debouncedRenderAndTrack === 'function') debouncedRenderAndTrack(); 
        alert(t("✅ 已成功將 [") + t(cr.c1) + t("] 的排軸 (") + finalName + t(") 下載至本機並套用於沙盤！"));
    } else {
        alert(t("⚠️ 匯入失敗：找不到本機儲存模組 (saveCustomRotationData)"));
    }
}

// ==========================================
// ☁️ 雲端雙向傳輸：發布排軸至戰術大廳 (附帶查重防呆)
// ==========================================
const CLOUD_UPLOAD_API = "https://script.google.com/macros/s/AKfycbwR9-wlCZ3BFKvYxTBezifBxhSxD5bkiq4lGySpOH_EAi84BwXQcTJYko-fmXmK3MFk-g/exec";
let pendingUploadRotId = null;

function openUploadModal(rotId) {
    let customId = rotId.replace('custom_rot_', '');
    let targetRot = customRotations.find(cr => cr.id == customId);
    if (!targetRot) targetRot = dpsData.find(d => d.id === rotId);
    if (!targetRot) return alert(t("找不到該排軸資料！"));

    pendingUploadRotId = rotId;
    
    let previewEl = document.getElementById('upload-team-preview');
    if (previewEl) previewEl.innerText = `${t(targetRot.c1)} + ${t(targetRot.c2)} + ${t(targetRot.c3)} (DPS: ${targetRot.dps || 0})`;
    
    let savedAuthor = localStorage.getItem('ww_author_name') || '';
    let authorInput = document.getElementById('upload-author-name');
    let nameInput = document.getElementById('upload-rot-name'); 
    let descInput = document.getElementById('upload-description');
    
    if (authorInput) authorInput.value = savedAuthor;
    if (nameInput) nameInput.value = targetRot.rot || t("自訂排軸"); 
    if (descInput) descInput.value = '';

    let submitBtn = document.getElementById('upload-submit-btn');
    if (submitBtn) submitBtn.onclick = submitToCloud;
    
    let modal = document.getElementById('upload-cloud-modal');
    if (modal) modal.style.display = 'flex';
}

// 🌟 產生查重報告 UI 彈窗的非同步函式
function showReportAsync(reportHtml) {
    return new Promise((resolve) => {
        let overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:9999; backdrop-filter:blur(5px);';
        
        let modal = document.createElement('div');
        modal.style.cssText = 'background:rgba(20,20,25,0.95); border:1px solid #ff4444; border-radius:12px; padding:20px; width:400px; max-width:90vw; color:#fff; box-shadow:0 10px 30px rgba(255,68,68,0.3); font-family:sans-serif;';
        modal.innerHTML = reportHtml;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // 玩家點擊確認後，關閉彈窗並繼續執行上傳邏輯
        document.getElementById('btn-ack-review').onclick = () => { 
            document.body.removeChild(overlay); 
            resolve(); 
        };
    });
}

async function submitToCloud() {
    if (!pendingUploadRotId) return;
    
    let customId = pendingUploadRotId.replace('custom_rot_', '');
    let targetRot = customRotations.find(cr => cr.id == customId);
    if (!targetRot) targetRot = dpsData.find(d => d.id === pendingUploadRotId);
    
    let authorName = document.getElementById('upload-author-name').value.trim() || t("佚名玩家");
    let descText = document.getElementById('upload-description').value.trim();
    localStorage.setItem('ww_author_name', authorName);

    let rotNameInput = document.getElementById('upload-rot-name');
    let rotName = rotNameInput ? rotNameInput.value.trim() : t("雲端神軸");
    if (!rotName) rotName = t("雲端神軸");
    
    let combinedDesc = `【${rotName}】\n${descText}`;

    let submitBtn = document.getElementById('upload-submit-btn');
    submitBtn.innerText = "⏳ " + t("同步大廳數據中...");
    submitBtn.disabled = true;

    let needsReview = false;

    try {
        // 🌟 確保查重前已載入最新的雲端數據
        if (!cloudRotations || cloudRotations.length === 0) {
            try { cloudRotations = await fetchAndParseCloudData(); } 
            catch(e) { console.warn("背景同步大廳數據失敗，將跳過查重。", e); }
        }
        
        submitBtn.innerText = "⏳ " + t("上傳/比對中...");
        
        let exportData = null; let shareCode = "";
        
        if (targetRot.isUserCustom || String(targetRot.id).startsWith('custom_rot_') || String(pendingUploadRotId).startsWith('custom_rot_')) {
            let allChars = typeof characterOrder !== 'undefined' ? characterOrder : Object.keys(charData);
            let id1 = allChars.indexOf(targetRot.c1); if (id1 === -1) id1 = 999;
            let id2 = allChars.indexOf(targetRot.c2); if (id2 === -1) id2 = 999;
            let id3 = allChars.indexOf(targetRot.c3); if (id3 === -1) id3 = 999;
            
            const diffOptions = ['🟩', '🔵', '⭐', '⚠️', '🧩'];
            let diffId = diffOptions.indexOf(targetRot.diff); if (diffId === -1) diffId = 2;
            
            let flatGridString = "";
            if (targetRot.gridData && targetRot.gridData.length > 0) {
                let teamNames = [targetRot.c1, targetRot.c2, targetRot.c3];
                flatGridString = targetRot.gridData.map(r => {
                    let charPos = teamNames.indexOf(r.char); if (charPos === -1) charPos = 99;
                    let skillId = skillOptions.indexOf(r.skill); if (skillId === -1) skillId = 99;
                    let safeAction = (r.action || "").replace(/[|;]/g, " ");
                    return `${charPos};${skillId};${r.time};${r.dmg};${safeAction}`;
                }).join('|');
            }

            exportData = { c: [id1, id2, id3], df: diffId, dp: targetRot.dps, du: targetRot.duration || 25, td: targetRot.totalDmg || (targetRot.dps * (targetRot.duration || 25)), g: flatGridString };
            if (typeof compressRotationDataV2 === 'function') shareCode = compressRotationDataV2(exportData);
        }
        
        if (!shareCode) throw new Error(t("生成分享碼失敗，無法上傳。"));

        if (typeof cloudRotations !== 'undefined' && cloudRotations.length > 0) {
            
            // 🌟 100% 完全相同防呆機制 (改為精緻 UI 彈窗)
            let exactMatchRot = cloudRotations.find(cr => cr.rawCode === shareCode);
            if (exactMatchRot) {
                let similarAuthor = exactMatchRot.author || t("佚名玩家");
                let similarName = exactMatchRot.rotName || t("未命名");
                let similarDps = exactMatchRot.dps ? parseFloat(exactMatchRot.dps).toFixed(2) : 0;
                let similarDur = exactMatchRot.duration ? parseFloat(exactMatchRot.duration).toFixed(1) : 25;
                
                let reportHtml = `
                <div style="text-align:center; margin-bottom:15px;">
                    <h3 style="color:#ff4444; margin:0 0 10px 0; font-size:1.4em;">⚠️ ${t('發現完全相同的排軸')}</h3>
                    <div style="color:#aaa; font-size:0.9em;">${t('系統偵測到雲端大廳已經有完全一樣的排軸了，不需要重複發布喔！')}</div>
                </div>
                <div style="text-align:center; margin-bottom:15px;">
                    <span style="font-size:1.8em; font-weight:bold; color:#00ffaa;">${t('綜合吻合度: ')}100%</span>
                </div>
                <div style="background:rgba(0,0,0,0.5); border:1px solid #444; border-radius:8px; padding:15px; margin-bottom:20px; text-align:left; font-size:0.95em; color:#ddd; line-height:1.6;">
                    <div style="color:#00ffaa; font-weight:bold; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:5px;">📋 ${t('查重報告明細：')}</div>
                    <div style="display:flex; justify-content:space-between;"><span>👤 ${t('發現提供者：')}</span> <span><strong style="color:var(--gold);">${similarAuthor}</strong></span></div>
                    <div style="display:flex; justify-content:space-between;"><span>📜 ${t('發現軸名：')}</span> <span><strong style="color:var(--neon-green);">${similarName}</strong></span></div>
                    <div style="display:flex; justify-content:space-between;"><span>💥 ${t('DPS 數值：')}</span> <span><strong style="color:#fff;">${similarDps} 萬</strong></span></div>
                    <div style="display:flex; justify-content:space-between;"><span>⏱️ ${t('循環軸長：')}</span> <span><strong style="color:#fff;">${similarDur} 秒</strong></span></div>
                </div>
                <button id="btn-ack-review" style="width:100%; background:#555; color:#fff; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:1em;">✖ ${t('關閉')}</button>
                `;
                
                await showReportAsync(reportHtml);
                
                // 停止上傳流程並恢復按鈕狀態
                submitBtn.innerText = "🚀 " + t("確認發布");
                submitBtn.disabled = false;
                pendingUploadRotId = null;
                return;
            }

            // 🌟 >= 85% 高度相似防呆機制
            let teamCloudRots = cloudRotations.filter(cr => cr.c1 === targetRot.c1 && cr.c2 === targetRot.c2 && cr.c3 === targetRot.c3);

            if (teamCloudRots.length > 0 && targetRot.gridData && typeof getRotationSimilarity === 'function') {
                let highestSim = 0;
                let bestBreakdown = null;
                let mostSimilarRot = null;

                teamCloudRots.forEach(ccr => {
                    let d1 = parseFloat(targetRot.duration) || 25, d2 = parseFloat(ccr.duration) || 25;
                    let curveSimRaw = typeof getCurveSimilarity === 'function' ? getCurveSimilarity(targetRot.gridData, ccr.gridData, d1, d2) : 0;
                    
                    let s_curve = curveSimRaw * 0.4;
                    let dps1 = parseFloat(targetRot.dps) || 0, dps2 = parseFloat(ccr.dps) || 0;
                    let s_dps = ((dps1 === 0 && dps2 === 0) ? 100 : (Math.min(dps1, dps2) / Math.max(dps1, dps2)) * 100) * 0.2;
                    let s_dur = ((Math.min(d1, d2) / Math.max(d1, d2)) * 100) * 0.2;
                    let act1 = targetRot.gridData ? targetRot.gridData.length : 0, act2 = ccr.gridData ? ccr.gridData.length : 0;
                    let s_act = ((act1 === 0 && act2 === 0) ? 100 : (Math.min(act1, act2) / Math.max(act1, act2)) * 100) * 0.15;
                    let s_diff = ((targetRot.diff === ccr.diff) ? 100 : 50) * 0.05;

                    let totalSim = s_curve + s_dps + s_dur + s_act + s_diff;

                    if (totalSim > highestSim) { 
                        highestSim = totalSim; 
                        bestBreakdown = { curve: s_curve, dps: s_dps, dur: s_dur, act: s_act, diff: s_diff };
                        mostSimilarRot = ccr;
                    }
                });

                if (highestSim >= 85) {
                    needsReview = true;
                    let similarAuthor = mostSimilarRot.author || t("佚名玩家");
                    let similarName = mostSimilarRot.rotName || t("未命名");
                    
                    combinedDesc += `\n【待審核】系統判定高相似度：${highestSim.toFixed(1)}% ` + t(` (相似於：`) + `${similarAuthor}` + t(` 的 `) + `${similarName})`;

                    let reportHtml = `
                    <div style="text-align:center; margin-bottom:15px;">
                        <h3 style="color:#ff4444; margin:0 0 10px 0; font-size:1.4em;">⚠️ ${t('觸發查重機制：轉交人工審核')}</h3>
                        <div style="color:#aaa; font-size:0.9em;">${t('系統偵測到雲端大廳已有極度相似的版本。<br>您的排軸仍會上傳，但需等待管理員審核後才會顯示。')}</div>
                    </div>
                    <div style="text-align:center; margin-bottom:15px;">
                        <span style="font-size:1.8em; font-weight:bold; color:var(--gold, #ffd700);">${t('綜合吻合度: ')}${highestSim.toFixed(1)}%</span>
                    </div>
                    <div style="background:rgba(0,0,0,0.5); border:1px solid #444; border-radius:8px; padding:15px; margin-bottom:20px; text-align:left; font-size:0.95em; color:#ddd; line-height:1.6;">
                        <div style="color:#00ffaa; font-weight:bold; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:5px;">📋 ${t('查重報告明細：')}</div>
                        <div style="display:flex; justify-content:space-between;"><span>📊 ${t('輸出曲線結構：')}</span> <span><strong style="color:#fff;">${bestBreakdown.curve.toFixed(1)}</strong> / 40.0</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>💥 ${t('DPS 數值：')}</span> <span><strong style="color:#fff;">${bestBreakdown.dps.toFixed(1)}</strong> / 20.0</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>⏱️ ${t('循環軸長：')}</span> <span><strong style="color:#fff;">${bestBreakdown.dur.toFixed(1)}</strong> / 20.0</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>🎹 ${t('總動作數：')}</span> <span><strong style="color:#fff;">${bestBreakdown.act.toFixed(1)}</strong> / 15.0</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>🧩 ${t('操作難度：')}</span> <span><strong style="color:#fff;">${bestBreakdown.diff.toFixed(1)}</strong> / 5.0</span></div>
                    </div>
                    <button id="btn-ack-review" style="width:100%; background:#ffaa00; color:#000; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:1em;">${t('確認並提交審核')}</button>
                    `;

                    await showReportAsync(reportHtml);
                }
            }
        }

        let payload = { author: authorName, c1: targetRot.c1, c2: targetRot.c2, c3: targetRot.c3, duration: targetRot.duration || 25, dps: targetRot.dps || 0, description: combinedDesc, shareCode: shareCode, oldShareCode: "" };

        const response = await fetch(CLOUD_UPLOAD_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const result = await response.json();
        
        if (result.status === "success") {
            let successMsg = needsReview 
                ? "🚀 發布成功！\n\n⚠️ 系統偵測到相似排軸，已轉交後台【人工審核】。審核通過前，此排軸暫時不會顯示於大廳。" 
                : (result.message || "🎉 發布成功！您的排軸已上傳至戰術大廳。");
            alert(t(successMsg));
            document.getElementById('upload-cloud-modal').style.display = 'none';
        } else {
            throw new Error(result.message || t("未知錯誤"));
        }
    } catch (err) {
        console.error("上傳失敗:", err);
        alert(t("⚠️ 上傳失敗：") + err.message);
    } finally {
        submitBtn.innerText = "🚀 " + t("確認發布");
        submitBtn.disabled = false;
        pendingUploadRotId = null;
    }
}
