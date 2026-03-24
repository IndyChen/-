// ==========================================
// 檔案：ui_custom_team.js
// 職責：自訂排軸實驗室、彈窗渲染、曲線圖繪製、排軸匯入匯出 (UI層)
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
    
    // 🌟 雙層架構 UI 顯示邏輯
    let getGlobalCr = (cName) => {
        if (!cName) return "";
        let b = cName === '光主' || cName === '暗主' || cName === '風主' ? '漂泊者' : cName;
        return (globalCharStats[b] && globalCharStats[b].cr !== undefined) ? globalCharStats[b].cr : "-";
    };

    // 1. 若有專屬覆寫值，直接填入
    document.getElementById('sm-crit-c1').value = (stats.mcCrit && stats.mcCrit.c1 !== undefined && stats.mcCrit.c1 !== "") ? stats.mcCrit.c1 : "";
    document.getElementById('sm-crit-c2').value = (stats.mcCrit && stats.mcCrit.c2 !== undefined && stats.mcCrit.c2 !== "") ? stats.mcCrit.c2 : "";
    document.getElementById('sm-crit-c3').value = (stats.mcCrit && stats.mcCrit.c3 !== undefined && stats.mcCrit.c3 !== "") ? stats.mcCrit.c3 : "";

    // 2. 浮水印貼心提示「目前的預設全域值」
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

    // 🌟 處理暴擊覆寫值的防呆與存檔
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
    
    // 儲存覆寫值
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

    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath();
    ctx.moveTo(keyframes[0].t * w, h - (keyframes[0].d * h));
    for(let i = 1; i < keyframes.length; i++) { ctx.lineTo(keyframes[i].t * w, h - (keyframes[i].d * h)); }
    ctx.stroke();

    ctx.lineTo(w, h); ctx.lineTo(0, h);
    let gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.4)'); gradient.addColorStop(1, 'rgba(212, 175, 55, 0.0)');
    ctx.fillStyle = gradient; ctx.fill();

    ctx.fillStyle = '#00ffaa';
    for(let i = 0; i < keyframes.length; i++) {
        let pt = keyframes[i]; ctx.beginPath(); ctx.arc(pt.t * w, h - (pt.d * h), 3.5, 0, Math.PI * 2); ctx.fill();
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
                    <summary style="padding:12px; color:var(--gold); font-size:0.9em; font-weight:bold; cursor:pointer; outline:none;">2️⃣ 智能數據匯入 (無腦貼上 / 點擊展開)</summary>
                    <div style="padding: 0 12px 12px 12px;">
                        <textarea id="ct-magic-paste" placeholder="從試算表複製 [角色]、[技能]、[時間]、[傷害] 貼於此處..." style="width:100%; height:50px; background:rgba(0,0,0,0.6); color:#fff; border:1px solid var(--border-glass); padding:8px; border-radius:6px; outline:none; font-family:monospace; resize:vertical; font-size:0.8em; box-sizing:border-box;"></textarea>
                        <button type="button" onclick="runMagicParser_CT()" style="width:100%; margin-top:8px; background:var(--gold); color:#000; font-weight:bold; border:none; padding:8px; border-radius:6px; cursor:pointer; transition: 0.2s;">
                            ✨ 啟動解析並產生排軸
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
    let cumulativeDmg = 0; let normalizedPath = [{ t: 0, d: 0 }];
    let sortedData = [...gridData].sort((a, b) => a.time - b.time);
    for (let i = 0; i < sortedData.length; i++) {
        let row = sortedData[i]; let currentT = row.time / finalDuration;
        currentT = Math.min(1.0, Math.max(0, currentT)); cumulativeDmg += row.dmg; let currentD = cumulativeDmg / totalDmg;
        normalizedPath.push({ t: currentT, d: currentD });
    }
    let keyframes = [{ t: 0, d: 0 }]; let avgSlope = 1.0; 
    for (let i = 1; i < normalizedPath.length; i++) {
        let prev = normalizedPath[i - 1]; let curr = normalizedPath[i];
        let t_diff = curr.t - prev.t; if (t_diff <= 0) t_diff = 0.0001; let slope = (curr.d - prev.d) / t_diff;
        if (slope > avgSlope * 2.5 || (curr.d - prev.d) > 0.08) {
            if (keyframes.length === 0 || Math.abs(keyframes[keyframes.length - 1].t - prev.t) > 0.02) { keyframes.push({ t: parseFloat(prev.t.toFixed(3)), d: parseFloat(prev.d.toFixed(3)) }); }
            keyframes.push({ t: parseFloat(curr.t.toFixed(3)), d: parseFloat(curr.d.toFixed(3)) });
        }
    }
    if (Math.abs(keyframes[keyframes.length - 1].t - 1) > 0.01) { keyframes.push({ t: 1, d: 1 }); }
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

    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath();
    ctx.moveTo(keyframes[0].t * w, h - (keyframes[0].d * h));
    for(let i = 1; i < keyframes.length; i++) { ctx.lineTo(keyframes[i].t * w, h - (keyframes[i].d * h)); }
    ctx.stroke();

    ctx.lineTo(w, h); ctx.lineTo(0, h);
    let gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.4)'); gradient.addColorStop(1, 'rgba(212, 175, 55, 0.0)');
    ctx.fillStyle = gradient; ctx.fill();

    ctx.fillStyle = '#00ffaa';
    for(let i = 0; i < keyframes.length; i++) {
        let pt = keyframes[i]; ctx.beginPath(); ctx.arc(pt.t * w, h - (pt.d * h), 3.5, 0, Math.PI * 2); ctx.fill();
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
        let d = 0;
        for (let i = 0; i < keyframes.length - 1; i++) {
            let p1 = keyframes[i], p2 = keyframes[i+1];
            if (normT >= p1.t && normT <= p2.t) {
                let range = p2.t - p1.t;
                let ratio = range > 0 ? (normT - p1.t) / range : 0;
                d = p1.d + ratio * (p2.d - p1.d);
                break;
            }
        }
        if (normT === 1) d = keyframes[keyframes.length-1].d;

        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(currentHoverX, h - (d * h), 4, 0, Math.PI * 2); ctx.fill();
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
            let actDmgInWan = d * (dpsInWan * actualDuration);

            document.getElementById('tt-time').innerText = actTime.toFixed(1);
            document.getElementById('tt-dmg').innerText = actDmgInWan.toFixed(1);
        }
    }
}

// ==========================================
// --- 5. 排軸存檔與 WWZ_ 匯出匯入邏輯 ---
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
    
    // 將資料庫邏輯交還給 data_manager.js 處理
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

function exportSingleRotation(index) {
    let cr = customRotations[index];
    let allChars = (typeof characterOrder !== 'undefined') ? characterOrder : Object.keys(charData);
    if (allChars.length === 0) allChars = [cr.c1, cr.c2, cr.c3];

    let bytes = [];
    bytes.push(Math.max(0, allChars.indexOf(cr.c1)) & 0xFF, Math.max(0, allChars.indexOf(cr.c2)) & 0xFF, Math.max(0, allChars.indexOf(cr.c3)) & 0xFF);
    let diffId = Math.max(0, ['🟩', '🔵', '⭐', '⚠️', '🧩'].indexOf(cr.diff));
    bytes.push(diffId & 0x7F);
    
    function writeVarInt(val) { do { let b = val & 0x7F; val >>>= 7; if (val !== 0) b |= 0x80; bytes.push(b); } while (val !== 0); }
    writeVarInt(Math.max(0, Math.round(cr.duration * 100)));

    let sortedGrid = [...(cr.gridData || [])].sort((a, b) => a.time - b.time);
    let lastTime = 0;
    sortedGrid.forEach(r => {
        bytes.push(((Math.max(0, [cr.c1, cr.c2, cr.c3].indexOf(r.char)) & 0x0F) << 4) | (Math.max(0, skillOptions.indexOf(r.skill)) & 0x0F));
        let feature = 0; if (r.action) { let m = r.action.match(/\d+/); if (m) feature = parseInt(m[0]); }
        writeVarInt(feature);
        let dt = Math.max(0, Math.round(r.time * 100)) - lastTime;
        writeVarInt(dt); lastTime += dt; writeVarInt(Math.max(0, Math.round(r.dmg)));
    });

    let code = "WWZ_" + encodeBase85(new Uint8Array(bytes));
    fallbackCopyTextToClipboard(code);
}

function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea"); 
    textArea.value = text; textArea.style.position = "fixed";
    document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert(t("✅ 專屬分享碼已複製到剪貼簿！")); } catch (err) { alert("❌ 複製失敗"); }
    document.body.removeChild(textArea);
}

function importSingleRotation() {
    let code = document.getElementById('dm-single-import-code')?.value.trim();
    if (!code || !code.startsWith("WWZ_")) return alert(t("❌ 格式錯誤，請貼上 WWZ_ 開頭的代碼。"));
    
    try {
        let bytes = decodeBase85(code.replace("WWZ_", ""));
        let ptr = { idx: 0 };
        function readVarInt() { let val = 0, shift = 0, b; do { b = bytes[ptr.idx++]; val |= (b & 0x7F) << shift; shift += 7; } while (b & 0x80); return val; }

        let allChars = (typeof characterOrder !== 'undefined') ? characterOrder : Object.keys(charData);
        let c1 = allChars[bytes[ptr.idx++]] || "未知", c2 = allChars[bytes[ptr.idx++]] || "未知", c3 = allChars[bytes[ptr.idx++]] || "未知";
        let diff = ['🟩', '🔵', '⭐', '⚠️', '🧩'][bytes[ptr.idx++] & 0x7F] || '⭐';
        let dur = readVarInt() / 100;
        let gridData = [], totalDmg = 0, currentTime = 0;

        while(ptr.idx < bytes.length) {
            let b0 = bytes[ptr.idx++];
            let actionStr = ""; let feature = readVarInt(); if(feature > 0) actionStr = feature.toString();
            currentTime += readVarInt() / 100; let d = readVarInt(); totalDmg += d;
            gridData.push({ char: [c1, c2, c3][(b0 >> 4) & 0x0F] || c1, skill: skillOptions[b0 & 0x0F] || "普攻", time: parseFloat(currentTime.toFixed(2)), dmg: d, action: actionStr });
        }
        
        let dps = dur > 0 ? (totalDmg < 10000 && totalDmg > 0 ? totalDmg / dur : (totalDmg / 10000) / dur) : 0;
        let curvePoints = typeof extractKeyframesCT === 'function' ? extractKeyframesCT(gridData, totalDmg, dur) : [];
        
        if (typeof saveCustomRotationData === 'function') {
            saveCustomRotationData(c1, c2, c3, dps, diff, dur, totalDmg, gridData, curvePoints, "自訂(匯入)");
            if(document.getElementById('dm-single-import-code')) document.getElementById('dm-single-import-code').value = "";
            if (typeof debouncedRenderAndTrack === 'function') debouncedRenderAndTrack(); 
            if (typeof openDataManager === 'function') openDataManager(); 
            alert(t("✅ 匯入成功。"));
        }
    } catch(e) { alert(t("❌ 解析失敗。")); }
}