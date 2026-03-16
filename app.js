// --- 1. 介面與翻譯引擎 ---
function switchTab(pageId, btnElement) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    btnElement.classList.add('active');
}

const dict = {
    "鳴":"鸣","陣":"阵","編":"编","隊":"队","實":"实","戰":"战","排":"排","軸":"轴","剩":"剩","餘":"余","數":"数","推":"推","薦":"荐","設":"设","匯":"汇","圖":"图","輸":"输","輔":"辅","輪":"轮","進":"进","階":"阶","極":"极","難":"难","導":"导","電":"电","氣":"气","動":"动","滅":"灭","尋":"寻","擁":"拥","隱":"隐","盡":"尽","屬":"属","語":"语","換":"换","陽":"阳","華":"华","鑒":"鉴","熾":"炽","離":"离","淵":"渊","萊":"莱","蘭":"兰","蕾":"蕾","贊":"赞","婭":"娅","奧":"奥","諾":"诺","貝":"贝","莉":"莉","遠":"远","靈":"灵","寧":"宁","陸":"陆","愛":"爱","彌":"弥","錯":"错","亂":"乱","鏈":"链","單":"单","雙":"双","劍":"剑","處":"处","轉":"转","適":"适","論":"论","確":"确","滿":"满","濾":"滤","這":"这","還":"还","沒":"没","湊":"凑","齊":"齐","頂":"顶","級":"级","資":"资","訊":"讯","擾":"扰","顯":"显","創":"创","應":"应","說":"说","漏":"漏","洞":"洞","修":"修","復":"复","產":"产","無":"无","縫":"缝","預":"预","測":"测","標":"标","籤":"签","視":"视","覺":"觉","強":"强","過":"过","與":"与","從":"从","為":"为","僅":"仅","網":"网","頁":"页","紀":"记","憶":"忆","類":"类","構":"构","簡":"简","繁":"繁","庫":"库","將":"将","機":"机","環":"环","境":"境","差":"差","異":"异","檢":"检","報":"报","鍵":"键","效":"效","指":"指","腦":"脑","邏":"逻","輯":"辑","據":"据","見":"见","條":"条","件":"件","東":"东","西":"西","問":"问","題":"题","關":"关","麼":"么","嗎":"吗","點":"点","擊":"击","裡":"里","會":"会","態":"态","則":"则","驗":"验","決":"决","劃":"划","結":"结","總":"总","對":"对","於":"于","誤":"误","認":"认","表":"表","伍":"伍","時":"时","間":"间","選":"选","覽":"览","閱":"阅","載":"载","軟":"软","體":"体","閉":"闭","開":"开","啟":"启","發":"发","佈":"布","現":"现","場":"场","試":"试","裝":"装","備":"备","請":"请","擇":"择","更":"更","離":"离","測":"测","準":"准","標":"标","擬":"拟","合":"合","估":"估","算":"算","綜":"综","評":"评","級":"级","執":"执","行":"行","析":"析"
};
let isSimp = false;
function t(str) { if (!isSimp || !str || typeof str !== 'string') return str; return str.split('').map(c => dict[c] || c).join(''); }
function toggleLang() { isSimp = !isSimp; document.getElementById('lang-toggle').innerText = isSimp ? "繁" : "简"; try { localStorage.setItem('ww_lang', isSimp ? 'zh-CN' : 'zh-TW'); } catch(e){} window.location.reload(); }

// --- 2. 核心資料庫 (保留 4.7.3.1 完整陣容) ---
const charData = {
    "漂泊者": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" }, "維里奈": { max: 2, rarity: 5, gen: 1, type: "生存位 (可用 2 次)" }, 
    "守岸人": { max: 2, rarity: 5, gen: 1, type: "生存位 (可用 2 次)" }, "今汐": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" }, 
    "長離": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" }, "忌炎": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" },
    "相里要": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" }, "椿": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" }, 
    "折枝": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" }, "吟霖": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" }, 
    "卡卡羅": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" }, "安可": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" },
    "凌陽": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" }, "鑒心": { max: 1, rarity: 5, gen: 1, type: "一般角色 (可用 1 次)" }, 
    "白芷": { max: 2, rarity: 4, gen: 1, type: "生存位 (可用 2 次)" }, "散華": { max: 1, rarity: 4, gen: 1, type: "一般角色 (可用 1 次)" }, 
    "熾霞": { max: 1, rarity: 4, gen: 1, type: "一般角色 (可用 1 次)" }, "秧秧": { max: 1, rarity: 4, gen: 1, type: "一般角色 (可用 1 次)" },
    "丹瑾": { max: 1, rarity: 4, gen: 1, type: "一般角色 (可用 1 次)" }, "釉瑚": { max: 1, rarity: 4, gen: 1, type: "一般角色 (可用 1 次)" }, 
    "桃祈": { max: 1, rarity: 4, gen: 1, type: "一般角色 (可用 1 次)" }, "秋水": { max: 1, rarity: 4, gen: 1, type: "一般角色 (可用 1 次)" }, 
    "莫特斐": { max: 1, rarity: 4, gen: 1, type: "一般角色 (可用 1 次)" }, "淵武": { max: 1, rarity: 4, gen: 1, type: "一般角色 (可用 1 次)" },
    "燈燈": { max: 1, rarity: 4, gen: 1, type: "一般角色 (可用 1 次)" }, 
    "珂萊塔": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, "洛可可": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, 
    "菲比": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, "布蘭特": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, 
    "坎特蕾拉": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, "贊妮": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" },
    "夏空": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, "卡提希婭": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, 
    "露帕": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, "弗洛洛": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, 
    "奧古斯塔": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, "尤諾": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, 
    "嘉貝莉娜": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, "仇遠": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, 
    "千咲": { max: 1, rarity: 5, gen: 2, type: "一般角色 (可用 1 次)" }, "卜靈": { max: 2, rarity: 4, gen: 2, type: "生存位 (可用 2 次)" }, 
    "琳奈": { max: 1, rarity: 5, gen: 3, type: "一般角色 (可用 1 次)" }, "莫寧": { max: 2, rarity: 5, gen: 3, type: "生存位 (可用 2 次)" }, 
    "陸·赫斯": { max: 1, rarity: 5, gen: 3, type: "一般角色 (可用 1 次)" }, "愛彌斯": { max: 1, rarity: 5, gen: 3, type: "一般角色 (可用 1 次)" },
    "西格莉卡": { max: 1, rarity: 5, gen: 3, type: "一般角色 (可用 1 次)" }
};

const charAttrMap = {
    "凌陽": "冷凝", "散華": "冷凝", "白芷": "冷凝", "折枝": "冷凝", "釉瑚": "冷凝", "珂萊塔": "冷凝",
    "熾霞": "熱熔", "安可": "熱熔", "莫特斐": "熱熔", "長離": "熱熔", "布蘭特": "熱熔", "露帕": "熱熔", "嘉貝莉娜": "熱熔", "莫寧": "熱熔", "愛彌斯": "熱熔",
    "卡卡羅": "導電", "吟霖": "導電", "淵武": "導電", "相里要": "導電", "燈燈": "導電", "奧古斯塔": "導電", "卜靈": "導電",
    "風主": "氣動", "秧秧": "氣動", "忌炎": "氣動", "鑒心": "氣動", "秋水": "氣動", "夏空": "氣動", "卡提希婭": "氣動", "尤諾": "氣動", "仇遠": "氣動", "西格莉卡": "氣動",
    "光主": "衍射", "維里奈": "衍射", "今汐": "衍射", "守岸人": "衍射", "贊妮": "衍射", "菲比": "衍射", "琳奈": "衍射", "陸·赫斯": "衍射",
    "暗主": "湮滅", "丹瑾": "湮滅", "桃祈": "湮滅", "椿": "湮滅", "洛可可": "湮滅", "坎特蕾拉": "湮滅", "弗洛洛": "湮滅", "千咲": "湮滅"
};

const characterOrder = ["漂泊者", "秧秧", "熾霞", "白芷", "散華", "桃祈", "丹瑾", "秋水", "莫特斐", "淵武", "維里奈", "安可", "卡卡羅", "凌陽", "鑒心", "忌炎", "吟霖", "今汐", "長離", "折枝", "相里要", "守岸人", "釉瑚", "椿", "燈燈", "珂萊塔", "洛可可", "菲比", "布蘭特", "坎特蕾拉", "贊妮", "夏空", "卡提希婭", "露帕", "弗洛洛", "奧古斯塔", "尤諾", "嘉貝莉娜", "仇遠", "千咲", "卜靈", "琳奈", "莫寧", "陸·赫斯", "愛彌斯", "西格莉卡"];

const teamDB = {
    "椿": [
        { c2:"散華", c3:"守岸人", dps:5.59, rot:"常規", diff:"🟩" }, { c2:"洛可可", c3:"守岸人", dps:6.35, rot:"上限", diff:"⭐" }, { c2:"洛可可", c3:"守岸人", dps:5.95, rot:"常規", diff:"🔵" },
        { c2:"丹瑾", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"丹瑾", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "暗主": [
        { c2:"琳奈", c3:"守岸人", dps:7.10, rot:"錯亂2min軸", diff:"⭐" }, { c2:"琳奈", c3:"守岸人", dps:6.77, rot:"錯輪", diff:"🔵" }, { c2:"琳奈", c3:"守岸人", dps:5.48, rot:"常規", diff:"🟩" },
        { c2:"散華", c3:"守岸人", dps:6.16, rot:"錯輪", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:5.40, rot:"常規", diff:"🟩" },
        { c2:"洛可可", c3:"守岸人", dps:6.48, rot:"常規", diff:"🔵" }, { c2:"洛可可", c3:"守岸人", dps:5.60, rot:"常規", diff:"🟩" },
        { c2:"丹瑾", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"丹瑾", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "今汐": [
        { c2:"坎特蕾拉", c3:"守岸人", dps:6.07, rot:"常規", diff:"🔵" }, { c2:"折枝", c3:"守岸人", dps:6.38, rot:"常規", diff:"⭐" }, { c2:"折枝", c3:"守岸人", dps:5.85, rot:"常規", diff:"🔵" },
        { c2:"折枝", c3:"卜靈", dps:5.77, rot:"常規", diff:"🔵" }, { c2:"吟霖", c3:"守岸人", dps:6.45, rot:"錯輪", diff:"⭐" }, { c2:"吟霖", c3:"守岸人", dps:5.73, rot:"常規", diff:"🔵" },
        { c2:"莫特斐", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"莫特斐", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"布蘭特", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"布蘭特", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"長離", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"長離", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"莫特斐", c3:"卜靈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"淵武", c3:"卜靈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"燈燈", c3:"淵武", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"桃祈", c3:"淵武", dps:0, rot:"非主流", diff:"🧩" }, { c2:"淵武", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"淵武", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "安可": [
        { c2:"露帕", c3:"莫寧", dps:6.47, rot:"常規上限", diff:"🔵" }, { c2:"露帕", c3:"守岸人", dps:6.25, rot:"6鏈", diff:"🔵" }, { c2:"露帕", c3:"守岸人", dps:5.79, rot:"常規", diff:"🔵" },
        { c2:"散華", c3:"守岸人", dps:5.50, rot:"錯輪", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:5.00, rot:"常規", diff:"🟩" },
        { c2:"長離", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"長離", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"長離", c3:"露帕", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"熾霞", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"熾霞", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "長離": [
        { c2:"露帕", c3:"莫寧", dps:7.20, rot:"極限", diff:"⭐" }, { c2:"露帕", c3:"莫寧", dps:6.90, rot:"錯輪", diff:"⭐" }, { c2:"露帕", c3:"莫寧", dps:6.40, rot:"常規", diff:"🔵" },
        { c2:"露帕", c3:"守岸人", dps:6.01, rot:"7離火", diff:"⭐" }, { c2:"露帕", c3:"守岸人", dps:5.83, rot:"6離火", diff:"🔵" }, { c2:"露帕", c3:"守岸人", dps:5.63, rot:"5離火", diff:"🟩" },
        { c2:"散華", c3:"守岸人", dps:4.81, rot:"錯輪", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:4.20, rot:"常規", diff:"🟩" },
        { c2:"布蘭特", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"布蘭特", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"吟霖", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"吟霖", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"暗主", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"暗主", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"秧秧", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"秧秧", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"秧秧", c3:"卜靈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "忌炎": [
        { c2:"夏空", c3:"守岸人", dps:7.81, rot:"龍切", diff:"⭐" }, { c2:"夏空", c3:"守岸人", dps:6.79, rot:"常規", diff:"⭐" }, { c2:"夏空", c3:"尤諾", dps:6.55, rot:"常規", diff:"🔵" },
        { c2:"莫特斐", c3:"守岸人", dps:5.85, rot:"常規", diff:"⭐" }, { c2:"莫特斐", c3:"守岸人", dps:5.60, rot:"常規", diff:"🔵" },
        { c2:"莫特斐", c3:"釉瑚", dps:0, rot:"非主流", diff:"🧩" }, { c2:"長離", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"長離", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"散華", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "相里要": [
        { c2:"琳奈", c3:"守岸人", dps:6.28, rot:"常規", diff:"🔵" }, { c2:"吟霖", c3:"守岸人", dps:5.25, rot:"常規", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:4.58, rot:"錯輪", diff:"🔵" },
        { c2:"長離", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"長離", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "卡卡羅": [
        { c2:"琳奈", c3:"守岸人", dps:7.65, rot:"6鏈死告", diff:"⚠️" }, { c2:"琳奈", c3:"守岸人", dps:7.53, rot:"6鏈死告", diff:"⭐" }, { c2:"琳奈", c3:"守岸人", dps:7.20, rot:"6鏈死告", diff:"🔵" },
        { c2:"琳奈", c3:"守岸人", dps:6.40, rot:"4死告", diff:"⭐" }, { c2:"琳奈", c3:"守岸人", dps:6.10, rot:"常規", diff:"🔵" }, { c2:"琳奈", c3:"守岸人", dps:5.80, rot:"基礎", diff:"🟩" },
        { c2:"吟霖", c3:"守岸人", dps:6.10, rot:"6鏈", diff:"⭐" }, { c2:"吟霖", c3:"守岸人", dps:5.72, rot:"6鏈", diff:"🔵" }, { c2:"吟霖", c3:"守岸人", dps:5.07, rot:"4死告", diff:"⭐" },
        { c2:"吟霖", c3:"守岸人", dps:4.65, rot:"常規", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:4.13, rot:"常規", diff:"🔵" },
        { c2:"長離", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"長離", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"莫特斐", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"莫特斐", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "凌陽": [
        { c2:"琳奈", c3:"守岸人", dps:5.18, rot:"常規", diff:"🔵" }, { c2:"折枝", c3:"守岸人", dps:5.08, rot:"6鏈", diff:"🔵" }, { c2:"折枝", c3:"守岸人", dps:4.32, rot:"常規", diff:"🔵" },
        { c2:"散華", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"白芷", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "弗洛洛": [
        { c2:"坎特蕾拉", c3:"莫寧", dps:9.02, rot:"1鏈", diff:"🔵" }, { c2:"坎特蕾拉", c3:"莫寧", dps:8.57, rot:"常規", diff:"🔵" }, { c2:"嘉貝莉娜", c3:"仇遠", dps:8.55, rot:"極限", diff:"⭐" },
        { c2:"坎特蕾拉", c3:"守岸人", dps:8.00, rot:"常規", diff:"🔵" }, { c2:"坎特蕾拉", c3:"仇遠", dps:7.96, rot:"常規", diff:"🔵" }, { c2:"坎特蕾拉", c3:"洛可可", dps:7.51, rot:"常規", diff:"🔵" },
        { c2:"仇遠", c3:"守岸人", dps:7.86, rot:"常規", diff:"🔵" }, { c2:"卜靈", c3:"守岸人", dps:5.56, rot:"常規", diff:"🔵" }, { c2:"燈燈", c3:"守岸人", dps:5.56, rot:"常規", diff:"🔵" }
    ],
    "坎特蕾拉": [
        { c2:"散華", c3:"守岸人", dps:5.73, rot:"1鏈", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:5.37, rot:"錯輪", diff:"🔵" }
    ],
    "千咲": [
        { c2:"琳奈", c3:"守岸人", dps:6.40, rot:"常規", diff:"🔵" }, { c2:"洛可可", c3:"守岸人", dps:4.51, rot:"常規", diff:"🔵" }
    ],
    "贊妮": [
        { c2:"菲比", c3:"光主", dps:9.15, rot:"極限", diff:"⭐" }, { c2:"菲比", c3:"光主", dps:8.39, rot:"常規", diff:"🔵" }, { c2:"菲比", c3:"千咲", dps:8.34, rot:"奶套", diff:"🔵" },
        { c2:"菲比", c3:"守岸人", dps:7.95, rot:"常規", diff:"🔵" }, { c2:"菲比", c3:"守岸人", dps:7.18, rot:"基礎", diff:"🟩" }, { c2:"光主", c3:"守岸人", dps:4.78, rot:"常規", diff:"🔵" }
    ],
    "菲比": [
        { c2:"光主", c3:"琳奈", dps:6.52, rot:"常規", diff:"🔵" }, { c2:"光主", c3:"守岸人", dps:5.60, rot:"常規", diff:"🔵" }
    ],
    "嘉貝莉娜": [
        { c2:"露帕", c3:"莫寧", dps:8.56, rot:"極限", diff:"⭐" }, { c2:"露帕", c3:"莫寧", dps:7.84, rot:"常規", diff:"🔵" }, { c2:"琳奈", c3:"守岸人", dps:8.26, rot:"常規", diff:"🔵" },
        { c2:"露帕", c3:"布蘭特", dps:9.15, rot:"雙錨錯延", diff:"⚠️" }, { c2:"露帕", c3:"布蘭特", dps:8.80, rot:"雙錨", diff:"⭐" }, { c2:"露帕", c3:"布蘭特", dps:8.31, rot:"單錨", diff:"⚠️" },
        { c2:"露帕", c3:"布蘭特", dps:7.67, rot:"常規", diff:"🔵" }, { c2:"仇遠", c3:"守岸人", dps:8.68, rot:"4旋踢", diff:"⚠️" }, { c2:"仇遠", c3:"守岸人", dps:8.11, rot:"極限", diff:"⭐" },
        { c2:"仇遠", c3:"守岸人", dps:7.77, rot:"常規", diff:"🔵" }, { c2:"露帕", c3:"守岸人", dps:8.02, rot:"極限", diff:"⭐" }, { c2:"露帕", c3:"守岸人", dps:7.35, rot:"常規", diff:"🔵" },
        { c2:"露帕", c3:"長離", dps:7.67, rot:"極限", diff:"⭐" }, { c2:"露帕", c3:"長離", dps:6.72, rot:"常規", diff:"🔵" }, { c2:"莫特斐", c3:"守岸人", dps:5.73, rot:"常規", diff:"🔵" }
    ],
    "布蘭特": [
        { c2:"露帕", c3:"莫寧", dps:8.35, rot:"常規", diff:"🔵" }, { c2:"露帕", c3:"莫寧", dps:7.53, rot:"下限", diff:"🔵" }, { c2:"露帕", c3:"莫寧", dps:7.20, rot:"基礎", diff:"🟩" },
        { c2:"露帕", c3:"長離", dps:7.74, rot:"雙錨", diff:"⭐" }, { c2:"露帕", c3:"長離", dps:7.57, rot:"極限", diff:"⭐" }, { c2:"露帕", c3:"長離", dps:7.05, rot:"單錨", diff:"🔵" },
        { c2:"露帕", c3:"守岸人", dps:7.73, rot:"改軸", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:5.43, rot:"常規", diff:"🔵" }
    ],
    "露帕": [
        { c2:"琳奈", c3:"守岸人", dps:5.68, rot:"常規", diff:"🔵" }
    ],
    "卡提希婭": [
        { c2:"夏空", c3:"千咲", dps:11.00, rot:"劍切", diff:"⚠️" }, { c2:"夏空", c3:"千咲", dps:9.72, rot:"極限", diff:"⭐" }, { c2:"夏空", c3:"千咲", dps:9.01, rot:"常規", diff:"🔵" },
        { c2:"夏空", c3:"風主", dps:9.30, rot:"劍切", diff:"⭐" }, { c2:"夏空", c3:"風主", dps:8.47, rot:"雙下", diff:"⭐" }, { c2:"夏空", c3:"風主", dps:8.20, rot:"常規", diff:"🔵" },
        { c2:"散華", c3:"風主", dps:6.39, rot:"常規", diff:"🔵" }, { c2:"風主", c3:"卜靈", dps:6.39, rot:"常規", diff:"🔵" }
    ],
    "尤諾": [
        { c2:"琳奈", c3:"夏空", dps:8.67, rot:"常規", diff:"🔵" }, { c2:"琳奈", c3:"守岸人", dps:9.20, rot:"極限", diff:"⭐" }, { c2:"琳奈", c3:"守岸人", dps:8.41, rot:"常規", diff:"🔵" },
        { c2:"琳奈", c3:"莫寧", dps:8.47, rot:"極限", diff:"⭐" }, { c2:"琳奈", c3:"莫寧", dps:8.10, rot:"常規", diff:"🔵" }, { c2:"琳奈", c3:"守岸人", dps:7.90, rot:"基礎", diff:"🟩" },
        { c2:"夏空", c3:"守岸人", dps:7.92, rot:"極限", diff:"⭐" }, { c2:"夏空", c3:"守岸人", dps:7.45, rot:"常規", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:5.03, rot:"常規", diff:"🔵" }
    ],
    "夏空": [
        { c2:"千咲", c3:"守岸人", dps:7.64, rot:"極限", diff:"⭐" }, { c2:"千咲", c3:"守岸人", dps:7.38, rot:"常規", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:6.23, rot:"錯輪", diff:"🔵" },
        { c2:"散華", c3:"守岸人", dps:5.53, rot:"基礎", diff:"🟩" }
    ],
    "仇遠": [
        { c2:"弗洛洛", c3:"守岸人", dps:8.34, rot:"仇3鏈", diff:"🔵" }, { c2:"夏空", c3:"守岸人", dps:5.65, rot:"夏雙延", diff:"🔵" }, { c2:"夏空", c3:"守岸人", dps:5.54, rot:"仇雙延", diff:"🔵" },
        { c2:"莫特斐", c3:"守岸人", dps:5.25, rot:"常規", diff:"🔵" }
    ],
    "奧古斯塔": [
        { c2:"尤諾", c3:"琳奈", dps:8.50, rot:"2旋1升", diff:"🔵" }, { c2:"尤諾", c3:"守岸人", dps:9.05, rot:"2旋4升", diff:"⭐" }, { c2:"尤諾", c3:"守岸人", dps:8.79, rot:"2旋3升", diff:"⭐" },
        { c2:"尤諾", c3:"守岸人", dps:8.28, rot:"2旋1升", diff:"🔵" }, { c2:"尤諾", c3:"守岸人", dps:7.67, rot:"2旋", diff:"🟩" }, { c2:"莫特斐", c3:"守岸人", dps:7.35, rot:"4旋1升", diff:"⭐" },
        { c2:"莫特斐", c3:"守岸人", dps:7.00, rot:"3旋1升", diff:"🔵" }
    ],
    "珂萊塔": [
        { c2:"琳奈", c3:"莫寧", dps:6.98, rot:"常規", diff:"🔵" }, { c2:"琳奈", c3:"守岸人", dps:7.08, rot:"常規", diff:"🔵" }, { c2:"布蘭特", c3:"守岸人", dps:6.71, rot:"極限", diff:"⭐" },
        { c2:"折枝", c3:"守岸人", dps:6.45, rot:"常規", diff:"🔵" }, { c2:"燈燈", c3:"守岸人", dps:6.17, rot:"常規", diff:"🔵" }, { c2:"卜靈", c3:"守岸人", dps:6.17, rot:"常規", diff:"🔵" },
        { c2:"散華", c3:"守岸人", dps:5.53, rot:"錯輪", diff:"🔵" }
    ],
    "陸·赫斯": [
        { c2:"琳奈", c3:"莫寧", dps:8.55, rot:"1鏈", diff:"🔵" }, { c2:"琳奈", c3:"守岸人", dps:8.37, rot:"常規", diff:"🔵" }, { c2:"散華", c3:"莫寧", dps:6.32, rot:"1鏈", diff:"🔵" },
        { c2:"散華", c3:"守岸人", dps:6.19, rot:"常規", diff:"🔵" }, { c2:"散華", c3:"維里奈", dps:5.33, rot:"常規", diff:"🔵" }
    ],
    "琳奈": [
        { c2:"散華", c3:"守岸人", dps:5.46, rot:"極限", diff:"⭐" }, { c2:"散華", c3:"守岸人", dps:4.30, rot:"常規", diff:"🔵" }
    ],
    "愛彌斯": [
        { c2:"琳奈", c3:"莫寧", dps:10.50, rot:"雙處", diff:"⭐" }, { c2:"琳奈", c3:"莫寧", dps:9.50, rot:"常規", diff:"🔵" }, { c2:"弗洛洛", c3:"莫寧", dps:9.04, rot:"1鏈", diff:"🔵" },
        { c2:"琳奈", c3:"守岸人", dps:8.35, rot:"常規", diff:"🔵" }, { c2:"琳奈", c3:"千咲", dps:8.15, rot:"常規", diff:"🔵" }, { c2:"露帕", c3:"莫寧", dps:8.72, rot:"常規", diff:"🔵" },
        { c2:"露帕", c3:"千咲", dps:7.89, rot:"極限", diff:"⭐" }, { c2:"千咲", c3:"莫寧", dps:7.68, rot:"轉聚暴", diff:"🔵" }, { c2:"千咲", c3:"莫寧", dps:7.28, rot:"常規", diff:"🔵" },
        { c2:"露帕", c3:"嘉貝莉娜", dps:8.62, rot:"常規", diff:"🔵" }, { c2:"露帕", c3:"布蘭特", dps:8.56, rot:"常規", diff:"🔵" }, { c2:"露帕", c3:"長離", dps:7.76, rot:"常規", diff:"🔵" },
        { c2:"長離", c3:"莫寧", dps:7.04, rot:"極限", diff:"⭐" }, { c2:"長離", c3:"莫寧", dps:6.11, rot:"常規", diff:"🔵" }, { c2:"露帕", c3:"守岸人", dps:7.48, rot:"常規", diff:"🔵" },
        { c2:"鑒心", c3:"莫寧", dps:5.08, rot:"2鏈", diff:"🔵" }, { c2:"鑒心", c3:"守岸人", dps:5.08, rot:"2鏈", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:4.62, rot:"常規", diff:"🔵" }
    ],
    "光主": [
        { c2:"秧秧", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"秧秧", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"吟霖", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"吟霖", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"莫特斐", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"莫特斐", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "熾霞": [
        { c2:"長離", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"長離", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"長離", c3:"露帕", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"散華", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "秋水": [
        { c2:"夏空", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"夏空", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"夏空", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"散華", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "燈燈": [
        { c2:"吟霖", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"吟霖", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"散華", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"秧秧", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"秧秧", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "丹瑾": [
        { c2:"莫特斐", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"莫特斐", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"暗主", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" },
        { c2:"暗主", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "折枝": [
        { c2:"散華", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"散華", c3:"白芷", dps:0, rot:"非主流", diff:"🧩" }
    ],
    "散華": [
        { c2:"折枝", c3:"守岸人", dps:0, rot:"非主流", diff:"🧩" }, { c2:"折枝", c3:"維里奈", dps:0, rot:"非主流", diff:"🧩" }, { c2:"折枝", c3:"白芷", dps:0, rot:"非主流", diff:"🧩" }
    ]
};

const dpsData = [];
let rotIdCounter = 0;
for (let c1 in teamDB) {
    teamDB[c1].forEach(tData => {
        dpsData.push({ id: 'rot_' + rotIdCounter++, c1: c1, c2: tData.c2, c3: tData.c3, dps: tData.dps, rot: tData.rot, diff: tData.diff, gen: charData[c1]?charData[c1].gen:1 });
    });
}

// --- 全域變數 ---
let ownedCharacters = new Set();
let checkedRotations = new Set();
let show5Star = true, show4Star = true, showG1 = true, showG2 = true, showG3 = true;
let customStatsMap = {};
const noRecChars = new Set(["莫特斐", "秧秧", "桃祈", "淵武", "釉瑚"]);
let diffStability = { '⚠️': 100, '⭐': 100, '🔵': 100, '🟩': 100, '🧩': 100 };
let bossHPMap = {};
let bossHPHistory = {};

// --- 3. 核心工具與防呆 ---
function clampHpPct(el) {
    let val = parseFloat(el.value);
    if (isNaN(val)) { el.value = ''; return; }
    if (val < 0.01) el.value = 0.01;
    if (val > 100) el.value = 100;
}

function resetRowDps(btn) {
    let row = btn.closest('tr');
    let ss = row.querySelectorAll('select.char-select');
    let c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value;
    if (!c1 || !c2 || !c3) return alert(t("請先排滿該隊伍的成員。"));
    
    let possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3);
    if(possibleRots.length > 0) {
        possibleRots.forEach(r => { delete customStatsMap[r.id]; });
        try { localStorage.setItem('ww_custom_stats', JSON.stringify(customStatsMap)); } catch(e){}
        row.querySelector('.score-input').value = "";
        renderRotations(); updateTracker();
        alert(t("🔄 已清除該隊伍排軸的自訂 DPS，恢復系統預設值。"));
    } else {
        alert(t("找不到此組合的排軸資料。"));
    }
}

function getBase(n) { return ['光主', '暗主', '風主'].includes(n) ? '漂泊者' : n; }
function isOwned(n) { return ['光主', '暗主', '風主'].includes(n) ? ownedCharacters.has('漂泊者') : ownedCharacters.has(n); }

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

// --- 4. 畫面渲染 ---
function renderCheckboxes() {
    const grid = document.getElementById('roster-setup');
    grid.innerHTML = '<div id="roster-grid"></div>';
    const container = document.getElementById('roster-grid');
    characterOrder.forEach(name => {
        let label = document.createElement('label');
        label.className = 'checkbox-item';
        label.style.borderLeft = charData[name].rarity === 5 ? '4px solid #d4af37' : '4px solid #9b59b6';
        label.innerHTML = `<input type="checkbox" value="${name}" ${ownedCharacters.has(name)?'checked':''} onchange="updateOwnedCharacters()"> ${t(name)}`;
        container.appendChild(label);
    });
    filterCharacters();
}

function filterCharacters() {
    let q = document.getElementById('char-search').value.toLowerCase();
    let qTrad = q; 
    document.querySelectorAll('.checkbox-item').forEach(l => {
        let name = l.querySelector('input').value, d = charData[name];
        let searchTarget = name.toLowerCase() + t(name).toLowerCase();
        if (searchTarget.includes('漂泊者')) searchTarget += ' 光主 暗主 風主';
        let m = searchTarget.includes(qTrad) && ((d.rarity==5 && show5Star) || (d.rarity==4 && show4Star)) && ((d.gen==1 && showG1) || (d.gen==2 && showG2) || (d.gen==3 && showG3));
        l.style.display = m ? 'flex' : 'none';
    });
}

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
    updateTracker();
}

function updateMasterSkill() {
    let val = parseInt(document.getElementById('skill-slider').value);
    document.getElementById('skill-display').innerText = val + '%';
    diffStability['⚠️'] = Math.max(0, 100 - (100 - val) * 1.8); diffStability['⭐'] = Math.max(0, 100 - (100 - val) * 1.4);
    diffStability['🔵'] = Math.max(0, 100 - (100 - val) * 1.1); diffStability['🟩'] = Math.max(0, 100 - (100 - val) * 0.8); diffStability['🧩'] = Math.max(0, 100 - (100 - val) * 1.0);
    document.getElementById('slider-diff-4').value = diffStability['⚠️']; document.getElementById('val-diff-4').innerText = diffStability['⚠️'].toFixed(0) + '%';
    document.getElementById('slider-diff-3').value = diffStability['⭐']; document.getElementById('val-diff-3').innerText = diffStability['⭐'].toFixed(0) + '%';
    document.getElementById('slider-diff-2').value = diffStability['🔵']; document.getElementById('val-diff-2').innerText = diffStability['🔵'].toFixed(0) + '%';
    document.getElementById('slider-diff-1').value = diffStability['🟩']; document.getElementById('val-diff-1').innerText = diffStability['🟩'].toFixed(0) + '%';
    document.getElementById('slider-diff-5').value = diffStability['🧩']; document.getElementById('val-diff-5').innerText = diffStability['🧩'].toFixed(0) + '%';
    renderRotations(); updateTracker();
}

function updateSubSkill(diffKey, sliderId, valId) {
    let val = parseInt(document.getElementById(sliderId).value);
    diffStability[diffKey] = val; document.getElementById(valId).innerText = val + '%';
    renderRotations(); updateTracker();
}

function getRotDpsRange(d) {
    let buffMult = customStatsMap[d.id] && customStatsMap[d.id].buff ? 1 + (customStatsMap[d.id].buff / 100) : 1;
    if (customStatsMap[d.id]) {
        let s = customStatsMap[d.id]; let max = s.dps * buffMult;
        return { min: Math.max(0, max * (s.stability / 100)), max: max, isCustom: true };
    } else {
        let max = d.dps * buffMult;
        if (max === 0) return { min: 0, max: 0, isCustom: false };
        let diffKey = '🧩';
        if (d.diff.includes('⚠️')) diffKey = '⚠️'; else if (d.diff.includes('⭐')) diffKey = '⭐';
        else if (d.diff.includes('🔵')) diffKey = '🔵'; else if (d.diff.includes('🟩')) diffKey = '🟩';
        let stab = diffStability[diffKey] !== undefined ? diffStability[diffKey] : 100;
        return { min: Math.max(0, max * (stab / 100)), max: max, isCustom: false };
    }
}

// --- 5. Modals 系統 ---
let currentEditRotId = null;
function openStatsModal(e, rotId) {
    e.preventDefault(); e.stopPropagation(); currentEditRotId = rotId;
    let d = dpsData.find(x => x.id === rotId);
    document.getElementById('stats-modal-rot').innerText = `${t(d.c1)} + ${t(d.c2)} + ${t(d.c3)} (${t(d.rot)})`;
    let stats = customStatsMap[rotId];
    if (stats) {
        document.getElementById('stats-dps').value = stats.dps; document.getElementById('stats-stab').value = stats.stability; document.getElementById('stats-buff').value = stats.buff || 0;
    } else {
        document.getElementById('stats-dps').value = d.dps > 0 ? d.dps : '';
        let diffKey = '🧩';
        if (d.diff.includes('⚠️')) diffKey = '⚠️'; else if (d.diff.includes('⭐')) diffKey = '⭐';
        else if (d.diff.includes('🔵')) diffKey = '🔵'; else if (d.diff.includes('🟩')) diffKey = '🟩';
        document.getElementById('stats-stab').value = diffStability[diffKey].toFixed(0); document.getElementById('stats-buff').value = 0;
    }
    document.getElementById('stats-modal').style.display = 'flex';
}

function closeStatsModal() { document.getElementById('stats-modal').style.display = 'none'; currentEditRotId = null; }
function clearStatsModal() {
    if (currentEditRotId) { delete customStatsMap[currentEditRotId]; try { localStorage.setItem('ww_custom_stats', JSON.stringify(customStatsMap)); } catch(e) {} renderRotations(); updateTracker(); }
    closeStatsModal();
}
function saveStatsModal() {
    let dpsVal = parseFloat(document.getElementById('stats-dps').value), stabVal = parseFloat(document.getElementById('stats-stab').value), buffVal = parseFloat(document.getElementById('stats-buff').value) || 0;
    if (isNaN(dpsVal) || isNaN(stabVal)) { alert(t("請輸入有效的數字！")); return; }
    if (currentEditRotId) { customStatsMap[currentEditRotId] = { dps: dpsVal, stability: Math.min(100, Math.max(0, stabVal)), buff: buffVal }; try { localStorage.setItem('ww_custom_stats', JSON.stringify(customStatsMap)); } catch(e) {} renderRotations(); updateTracker(); }
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

function renderRotations() {
    const container = document.getElementById('rotation-setup');
    const valid = dpsData.filter(d => isOwned(d.c1) && isOwned(d.c2) && isOwned(d.c3));
    if(!valid.length) { container.innerHTML = `<p style="color:#888; font-style:italic;">${t("請先在上方勾選擁有的角色，以解鎖可組建的排軸...")}</p>`; return; }
    let groups = {}; valid.forEach(d => { if(!groups[d.c1]) groups[d.c1] = []; groups[d.c1].push(d); });
    let html = '';
    for(let c1 in groups) {
        html += `<div style="margin-bottom:15px; padding:12px; background:#1e1e24; border-radius:5px; border-left: 3px solid #d4af37;"><strong style="color: #d4af37;">🎯 ${t("主輸出")}：${t(c1)}</strong><div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:8px;">`;
        groups[c1].sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min).forEach(d => {
            let r = getRotDpsRange(d);
            let dpsStr = (r.max > 0 || r.isCustom) ? `[${r.min.toFixed(2)}~${r.max.toFixed(2)}w]` : t('[無預設/點擊自訂]'); 
            let colorStyle = r.isCustom ? 'color: #00ffaa; text-decoration: underline; text-decoration-style: dashed;' : (r.min < r.max ? 'color: #ffaa00;' : 'color: #fff;');
            if(r.max === 0 && !r.isCustom) colorStyle = 'color: #888; text-decoration: underline; text-decoration-style: dashed;';
            html += `<div style="background:#2b2b36; padding:6px 10px; border-radius:4px; font-size:0.9em; border: 1px solid #444; display:inline-flex; align-items:center; gap:5px;">
                        <input type="checkbox" id="chk_${d.id}" value="${d.id}" ${checkedRotations.has(d.id)?'checked':''} onchange="updateRotationState()">
                        <label for="chk_${d.id}" style="cursor:pointer; margin:0;">${d.diff}</label>
                        <span onclick="openStatsModal(event, '${d.id}')" style="cursor:pointer; font-weight:bold; ${colorStyle}; padding:0 4px;" title="${t('點擊輸入數據或加權')}">${dpsStr}</span>
                        <label for="chk_${d.id}" style="cursor:pointer; margin:0;">${t(d.c2)} / ${t(d.c3)} (${t(d.rot)})</label>
                    </div>`;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

function filterRotations() {
    let q = document.getElementById('rot-search').value.toLowerCase();
    document.querySelectorAll('#rotation-setup input[type="checkbox"]').forEach(i => {
        let container = i.closest('div');
        container.style.display = container.innerText.toLowerCase().includes(q) ? 'inline-flex' : 'none';
    });
    document.querySelectorAll('#rotation-setup > div').forEach(group => { group.style.display = Array.from(group.querySelectorAll('div > div')).some(l => l.style.display !== 'none') ? 'block' : 'none'; });
}

function toggleAllRotations() {
    const visibleBoxes = Array.from(document.querySelectorAll('#rotation-setup input[type="checkbox"]')).filter(i => i.closest('div').style.display !== 'none');
    if(!visibleBoxes.length) return;
    const anyChecked = visibleBoxes.some(i => i.checked);
    visibleBoxes.forEach(i => i.checked = !anyChecked);
    updateRotationState();
}

function toggleDifficulty(diff) {
    const visibleBoxes = Array.from(document.querySelectorAll('#rotation-setup input[type="checkbox"]')).filter(i => i.closest('div').style.display !== 'none' && i.closest('div').innerText.includes(diff));
    if(!visibleBoxes.length) return;
    const allChecked = visibleBoxes.every(i => i.checked);
    visibleBoxes.forEach(i => i.checked = !allChecked);
    updateRotationState();
}

function updateRotationState() {
    checkedRotations.clear(); document.querySelectorAll('#rotation-setup input:checked').forEach(i => checkedRotations.add(i.value)); updateTracker();
}

let activePresetAttrs = new Set(); let activePresetGens = new Set();
function togglePresetAttr(attr) { activePresetAttrs.has(attr) ? activePresetAttrs.delete(attr) : activePresetAttrs.add(attr); document.querySelector(`button[data-attr="${attr}"]`).classList.toggle(`active-attr-${attr}`); updateTracker(); }
function togglePresetGen(gen) { activePresetGens.has(gen) ? activePresetGens.delete(gen) : activePresetGens.add(gen); document.querySelector(`button[data-gen="${gen}"]`).classList.toggle(`active-gen`); updateTracker(); }

function buildOptionsHTML(slotType, v1, v2, v3, curRaw, used, teamBases) {
    let html = `<option value="">-- ${slotType==1 ? t('主輸出') : slotType==2 ? t('副C/輔助') : t('生存/輔助')} --</option>`;
    let recs = new Map();
    let hasContext = (slotType === 1 && (v2 || v3)) || (slotType === 2 && (v1 || v3)) || (slotType === 3 && (v1 || v2));

    let availableDisplayChars = [];
    for (let name of ownedCharacters) { if (name === '漂泊者') { availableDisplayChars.push('光主', '暗主', '風主'); } else { availableDisplayChars.push(name); } }

    dpsData.forEach(d => {
        let match = false;
        if (hasContext) {
            match = true;
            if (slotType !== 1 && v1 && d.c1 !== v1) match = false;
            if (slotType !== 2 && v2 && d.c2 !== v2) match = false;
            if (slotType !== 3 && v3 && d.c3 !== v3) match = false;
        } else {
            if (slotType === 1 && checkedRotations.has(d.id)) match = true;
            if (slotType !== 1 && checkedRotations.has(d.id)) match = true;
        }

        if(match) {
            let target = slotType==1 ? d.c1 : slotType==2 ? d.c2 : d.c3;
            let isBlacklisted = (slotType === 1) && noRecChars.has(target);
            if(availableDisplayChars.includes(target) && !isBlacklisted) {
                let c1Avail = (slotType === 1) ? true : (d.c1 === v1 || (used[getBase(d.c1)]||0) < (charData[getBase(d.c1)]?.max||1));
                let c2Avail = (slotType === 2) ? true : (d.c2 === v2 || (used[getBase(d.c2)]||0) < (charData[getBase(d.c2)]?.max||1));
                let c3Avail = (slotType === 3) ? true : (d.c3 === v3 || (used[getBase(d.c3)]||0) < (charData[getBase(d.c3)]?.max||1));
                if (!recs.has(target)) recs.set(target, { maxDPS: 0, buildable: false });
                let data = recs.get(target);
                if (c1Avail && c2Avail && c3Avail) { data.buildable = true; let r = getRotDpsRange(d); if (r.min > data.maxDPS) data.maxDPS = r.min; }
            }
        }
    });

    if(recs.size > 0) {
        html += `<optgroup label="🔥 ${t('適配推薦')}">`;
        Array.from(recs.entries()).sort((a,b)=>b[1].maxDPS - a[1].maxDPS).forEach(([name, data]) => {
            let b = getBase(name), u = used[b]||0, m = charData[b]?.max||1, isEx = u >= m && getBase(curRaw)!==b;
            if(slotType==1 && isEx) return; 
            let dpsStr = (data.buildable && data.maxDPS > 0) ? `(${t('保底')} ${data.maxDPS.toFixed(2)}w)` : '';
            let tag = isEx ? ` 🛑[${t('耗盡')}]` : teamBases.has(b) && getBase(curRaw)!==b ? ` 🛑[${t('在隊')}]` : "";
            html += `<option value="${name}" ${tag?"disabled":""}>⭐ ${t(name)} ${dpsStr}${tag}</option>`;
        });
        html += '</optgroup>';
    }
    
    html += `<optgroup label="🔸 ${t('其他角色')}">`;
    let validOthers = availableDisplayChars.filter(name => {
        if (recs.has(name)) return false; 
        let b = getBase(name); return !(used[b] >= (charData[b]?.max || 1) && getBase(curRaw) !== b); 
    });

    validOthers.sort((a, b) => {
        if (slotType === 3) {
            let isSurvA = (charData[getBase(a)]?.type || "").includes("生存位") ? 1 : 0;
            let isSurvB = (charData[getBase(b)]?.type || "").includes("生存位") ? 1 : 0;
            if (isSurvA !== isSurvB) return isSurvB - isSurvA;
        }
        return characterOrder.indexOf(getBase(a)) - characterOrder.indexOf(getBase(b));
    });

    validOthers.forEach(name => {
        let b = getBase(name), inTeam = teamBases.has(b) && getBase(curRaw)!==b;
        html += `<option value="${name}" ${inTeam?'disabled':''}>${t(name)}${inTeam?` 🛑[${t('在隊')}]`:''}</option>`;
    });
    html += '</optgroup>'; return html;
}

function getMaxTeams(usedObj) {
    let baseRemains = {};
    for(let name of ownedCharacters) {
        let b = getBase(name);
        if(charData[b] && baseRemains[b]===undefined) { let r = charData[b].max - (usedObj[b]||0); if(r>0) baseRemains[b] = r; }
    }
    let counts = Object.values(baseRemains); let teams = 0;
    while(counts.length >= 3) { counts.sort((a,b)=>b-a); counts[0]--; counts[1]--; counts[2]--; teams++; counts = counts.filter(c=>c>0); }
    return Math.min(16, teams);
}

// --- 6. 血量反解與矩陣環境 ---
function initBossHPMap() {
    let env = { r1_hp: parseFloat(document.getElementById('env-r1').value) || 400.89, r2_hp: parseFloat(document.getElementById('env-r2').value) || 783.56, r3_hp: parseFloat(document.getElementById('env-r3').value) || 1384.9, growth: (parseFloat(document.getElementById('env-growth').value) || 5) / 100 };
    try {
        let stored = localStorage.getItem('ww_boss_hp'); if (stored) bossHPMap = JSON.parse(stored);
        let hist = localStorage.getItem('ww_boss_hp_history'); if (hist) bossHPHistory = JSON.parse(hist);
    } catch(e) {}

    for (let r = 1; r <= 10; r++) {
        for (let i = 1; i <= 4; i++) {
            let key = `R${r}-${i}`;
            if (!bossHPMap[key] || bossHPMap[key].isDefault) {
                let hp = (r === 1) ? env.r1_hp : (r === 2 && i === 1) ? 546.67 : (r === 2) ? env.r2_hp : (r === 3) ? env.r3_hp : env.r3_hp * (1 + env.growth * ((r - 4) * 4 + i));
                bossHPMap[key] = { value: hp, isDefault: true };
            }
        }
    }
    renderIndividualHPPanel();
}

function renderIndividualHPPanel() {
    let container = document.getElementById('individual-hp-container');
    if (!container) return;
    let html = '';
    for (let r = 1; r <= 10; r++) {
        for (let i = 1; i <= 4; i++) {
            let key = `R${r}-${i}`, data = bossHPMap[key], btnHtml = '';
            if (bossHPHistory[key] && bossHPHistory[key].length >= 3) {
                let avg = bossHPHistory[key].reduce((a, b) => a + b, 0) / bossHPHistory[key].length;
                if (Math.abs(avg - getBaseEnvHP(r, i)) / getBaseEnvHP(r, i) > 0.03 && data.isDefault) {
                    btnHtml = `<button class="btn-calib" onclick="applyCalibratedHP('${key}', ${avg})">⚠️ 套用校正: ${avg.toFixed(1)}W</button>`;
                }
            }
            html += `<div class="hp-item"><span class="hp-label">${key}</span><input type="number" class="hp-input ${!data.isDefault?'calibrated':''}" id="hp_${key}" value="${data.value.toFixed(2)}" step="10" onchange="manualUpdateHP('${key}')">${btnHtml}</div>`;
        }
    }
    container.innerHTML = html;
}

function getBaseEnvHP(r, index) {
    let env = getEnvSettings();
    if (r === 1) return env.r1_hp; if (r === 2) return index === 1 ? 546.67 : env.r2_hp; if (r === 3) return env.r3_hp;
    return env.r3_hp * (1 + env.growth * ((r - 4) * 4 + index));
}

function getBossMaxHP(r, index) { return bossHPMap[`R${r}-${index}`] ? bossHPMap[`R${r}-${index}`].value : 400; }
function manualUpdateHP(key) {
    let val = parseFloat(document.getElementById(`hp_${key}`).value);
    if (!isNaN(val) && val > 0) { bossHPMap[key] = { value: val, isDefault: false }; try { localStorage.setItem('ww_boss_hp', JSON.stringify(bossHPMap)); } catch(e) {} renderIndividualHPPanel(); updateTracker(); }
}
function applyCalibratedHP(key, avgValue) {
    bossHPMap[key] = { value: avgValue, isDefault: false }; try { localStorage.setItem('ww_boss_hp', JSON.stringify(bossHPMap)); } catch(e) {}
    renderIndividualHPPanel(); updateTracker(); alert(`✅ 已成功校正為平均值：${avgValue.toFixed(2)} 萬！`);
}
function resetIndividualHP() { bossHPMap = {}; bossHPHistory = {}; try { localStorage.removeItem('ww_boss_hp'); localStorage.removeItem('ww_boss_hp_history'); } catch(e) {} initBossHPMap(); }

function getEnvSettings() {
    return {
        scoreRatio: parseFloat(document.getElementById('env-ratio').value) || 10,
        r1_hp: parseFloat(document.getElementById('env-r1').value) || 400.89, r2_hp: parseFloat(document.getElementById('env-r2').value) || 783.56,
        r3_hp: parseFloat(document.getElementById('env-r3').value) || 1384.9, growth: (parseFloat(document.getElementById('env-growth').value) || 5) / 100,
        transTime: parseFloat(document.getElementById('env-trans').value) || 1.5, battleTime: parseFloat(document.getElementById('env-time').value) || 120,
        resPenalty: parseFloat(document.getElementById('env-res').value) || 40
    };
}

// --- 7. 初始化與表格邏輯 ---
function initBoard() {
    const b = document.getElementById('team-board');
    let rOpts = `<option value="">R?</option>` + Array.from({length:10}, (_,i)=>`<option value="${i+1}">R${i+1}</option>`).join('');
    let idxOpts = `<option value="">號?</option>` + [1,2,3,4].map(idx=>`<option value="${idx}">${idx}</option>`).join('');
    
    for(let i=1; i<=16; i++) {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td style="font-weight:bold; color:#d4af37;">${t("第")}${i}${t("隊")}</td>
                        <td><select class="char-select" onchange="updateTracker()"></select></td>
                        <td><select class="char-select" onchange="updateTracker()"></select></td>
                        <td>
                            <select class="char-select" onchange="updateTracker()"></select>
                            <button onclick="resetRowDps(this)" class="btn-reset-dps">🔄 重設預設 DPS</button>
                        </td>
                        <td style="font-size:0.85em; text-align:center;">
                            <input type="number" class="score-input" placeholder="${t('實戰得分')}" title="${t('打完結算給的總分')}"><br>
                            <div style="display:flex; justify-content:center; align-items:center; gap:2px; margin-bottom:4px; background:#1e2b24; padding:3px; border-radius:4px; border:1px solid #00ffaa;">
                                <span style="color:#00ffaa; font-weight:bold;">🎯終:</span>
                                <select class="hp-calc-select end-boss-r">${rOpts}</select>
                                <span style="color:#00ffaa;">-</span>
                                <select class="hp-calc-select end-boss-idx">${idxOpts}</select>
                                <span style="color:#00ffaa; margin-left:2px;">🩸剩:</span>
                                <input type="number" class="hp-calc-input end-boss-hp" placeholder="%" onblur="clampHpPct(this)">
                            </div>
                            <div class="res-chk-group">
                                <span style="color:#888;">抗性王:</span>
                                <label><input type="checkbox" class="res-chk-1" onchange="updateTracker()">[1]</label>
                                <label><input type="checkbox" class="res-chk-2" onchange="updateTracker()">[2]</label>
                                <label><input type="checkbox" class="res-chk-3" onchange="updateTracker()">[3]</label>
                                <label><input type="checkbox" class="res-chk-4" onchange="updateTracker()">[4]</label>
                            </div>
                        </td>
                        <td class="relay-result" style="font-size:0.85em; text-align:left; padding-left:15px; border-left:2px solid #00ffaa;">-</td>`;
        b.appendChild(tr);
    }
}

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
            s.classList.toggle('error', s.value && used[getBase(s.value)] > charData[getBase(s.value)].max);
        });
    });

    const tracker = document.getElementById('tracker');
    tracker.innerHTML = `<div style="background:#3f3f4e;padding:12px;border-radius:8px;margin-bottom:15px;border:1px solid #d4af37;text-align:center;">
        📊 ${t("理論最大")}：<span style="color:#4caf50;font-weight:bold;font-size:1.2em;">${getMaxTeams({})}</span> <span style="color:#aaa;">${t("隊")}</span> | ⏳ ${t("剩餘可排")}：<span style="color:#ffb300;font-weight:bold;font-size:1.2em;">${getMaxTeams(used)}</span> <span style="color:#aaa;">${t("隊")}</span>
    </div>`;

    let groups = { "生存位 (可用 2 次)": [], "一般角色 (可用 1 次)": [] };
    ownedCharacters.forEach(name => { let base = getBase(name); if(charData[base]) groups[charData[base].type].push(name); });
    for(let type in groups) {
        if(groups[type].length === 0) continue;
        tracker.innerHTML += `<div class="type-title">${t(type.split(" ")[0])} <span style="font-size:0.8em; color:#888;">${t(type.substring(type.indexOf("(")))}</span></div>`;
        groups[type].sort((a,b) => {
            let rA = charData[getBase(a)].max - (used[getBase(a)]||0), rB = charData[getBase(b)].max - (used[getBase(b)]||0);
            if(rA > 0 && rB <= 0) return -1; if(rA <= 0 && rB > 0) return 1; return characterOrder.indexOf(a) - characterOrder.indexOf(b);
        });
        groups[type].forEach(name => {
            let rem = charData[getBase(name)].max - (used[getBase(name)]||0);
            tracker.innerHTML += `<div class="char-row"><span>${t(name)}</span><span class="count-badge ${rem<=0?'count-empty':''}">${rem<=0?t('耗盡'):rem}</span></div>`;
        });
    }

    const ps = document.getElementById('preset-select');
    let ph = `<option value="">-- ${t("選擇推薦配隊")} --</option>`;
    dpsData.filter(d => checkedRotations.has(d.id) && isOwned(d.c1) && isOwned(d.c2) && isOwned(d.c3) && 
        (activePresetAttrs.size===0 || activePresetAttrs.has(charAttrMap[d.c1]||"未知")) &&
        (activePresetGens.size===0 || activePresetGens.has(d.gen.toString()))
    ).forEach(d => {
        let r = getRotDpsRange(d), dpsStr = (r.max > 0 || r.isCustom) ? `${r.min.toFixed(2)}~${r.max.toFixed(2)}w` : t('無DPS');
        ph += `<option value="${d.c1},${d.c2},${d.c3}">${t(d.c1)} + ${t(d.c2)} + ${t(d.c3)} (${dpsStr})</option>`;
    });
    ps.innerHTML = ph;

    // 雙軌推演引擎
    let env = getEnvSettings(), current_r_min = 1, current_index_min = 1, current_hp_min = getBossMaxHP(1, 1), current_r_max = 1, current_index_max = 1, current_hp_max = getBossMaxHP(1, 1), totalMatrixScoreMin = 0, totalMatrixScoreMax = 0;

    document.querySelectorAll('#team-board tr').forEach(row => {
        let ss = row.querySelectorAll('select.char-select'), c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value;
        let resTd = row.querySelector('.relay-result'), chk_res = [row.querySelector('.res-chk-1').checked, row.querySelector('.res-chk-2').checked, row.querySelector('.res-chk-3').checked, row.querySelector('.res-chk-4').checked];

        if (c1 && c2 && c3) {
            let possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3 && checkedRotations.has(d.id));
            if (possibleRots.length > 0) {
                possibleRots.sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min);
                let dpsRange = getRotDpsRange(possibleRots[0]);
                if (dpsRange.max <= 0) { resTd.innerHTML = `<span style="color:#d32f2f;">${t("DPS過低")}<br>${t("無法推演")}</span>`; return; }

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

                resTd.innerHTML = `<div style="line-height:1.4;"><span style="color:#aaa;">下限:</span> <span style="color:#ffaa00;">${resMin.startStr} ➔ ${resMin.endStr}</span><br><span style="color:#aaa;">上限:</span> <span style="color:#00ffaa;">${resMax.startStr} ➔ ${resMax.endStr}</span><br><span style="color:#cf00ff; font-weight:bold;">${Math.floor(resMin.dmg * env.scoreRatio).toLocaleString()} ~ ${Math.floor(resMax.dmg * env.scoreRatio).toLocaleString()} 分</span></div>`;
            } else { resTd.innerHTML = "-"; }
        } else { resTd.innerHTML = "-"; }
    });

    document.getElementById('matrix-total-score').innerText = `${Math.floor(totalMatrixScoreMin).toLocaleString()} ~ ${Math.floor(totalMatrixScoreMax).toLocaleString()} ` + t("分");
    saveData();
}

// --- 8. 無損洗牌與代數反解 ---
function reverseInferAndOptimize() {
    initBossHPMap();
    let env = getEnvSettings(), currentTeams = [], rows = document.querySelectorAll('#team-board tr'), start_r = 1, start_idx = 1, start_hp = getBossMaxHP(1, 1);

    rows.forEach((row) => {
        let ss = row.querySelectorAll('select.char-select'), c1 = ss[0].value, c2 = ss[1].value, c3 = ss[2].value;
        let scoreInput = row.querySelector('.score-input').value, ebR = row.querySelector('.end-boss-r').value, ebIdx = row.querySelector('.end-boss-idx').value, ebHp = row.querySelector('.end-boss-hp').value;
        let chk_res = [row.querySelector('.res-chk-1').checked, row.querySelector('.res-chk-2').checked, row.querySelector('.res-chk-3').checked, row.querySelector('.res-chk-4').checked];

        if (c1) { 
            let rotId = null, calculatedMinDps = 0;
            let possibleRots = dpsData.filter(d => d.c1 === c1 && d.c2 === c2 && d.c3 === c3 && checkedRotations.has(d.id));
            if (possibleRots.length > 0) { possibleRots.sort((a,b) => getRotDpsRange(b).min - getRotDpsRange(a).min); rotId = possibleRots[0].id; }

            let actualScore = parseFloat(scoreInput);
            if (!isNaN(actualScore) && actualScore > 0 && rotId) {
                let dmg_left = actualScore / env.scoreRatio, kills = 0, effective_dmg_sum = 0, tmp_r = start_r, tmp_idx = start_idx, tmp_hp = start_hp, dmgDealtToKilledBosses = 0;

                while (dmg_left > 0) {
                    let r_factor = chk_res[tmp_idx - 1] ? (1 - env.resPenalty / 100) : 1; if (r_factor <= 0) r_factor = 0.1; 
                    if (dmg_left >= tmp_hp) {
                        dmg_left -= tmp_hp; dmgDealtToKilledBosses += tmp_hp; effective_dmg_sum += (tmp_hp / r_factor);
                        kills++; tmp_idx++; if (tmp_idx > 4) { tmp_r++; tmp_idx = 1; } tmp_hp = getBossMaxHP(tmp_r, tmp_idx);
                    } else {
                        effective_dmg_sum += (dmg_left / r_factor);
                        let ebRInt = parseInt(ebR), ebIdxInt = parseInt(ebIdx), ebHpPct = parseFloat(ebHp);
                        if (!isNaN(ebRInt) && !isNaN(ebIdxInt) && !isNaN(ebHpPct) && ebRInt === tmp_r && ebIdxInt === tmp_idx && ebHpPct >= 0.01 && ebHpPct <= 100) {
                            let dmgDoneToEndBoss = (actualScore / env.scoreRatio) - dmgDealtToKilledBosses;
                            let trueTotalHP = dmgDoneToEndBoss / (1 - (ebHpPct / 100));
                            let hKey = `R${ebRInt}-${ebIdxInt}`;
                            if (!bossHPHistory[hKey]) bossHPHistory[hKey] = []; bossHPHistory[hKey].push(trueTotalHP);
                        }
                        tmp_hp -= dmg_left; dmg_left = 0;
                    }
                }
                
                let effective_time = env.battleTime - (kills * env.transTime);
                let trueBaseDps = effective_time > 0 ? (effective_dmg_sum / effective_time) : 0;

                if (trueBaseDps > 0) {
                    let currStats = customStatsMap[rotId] || { stability: 100, buff: 0 };
                    customStatsMap[rotId] = { dps: trueBaseDps, stability: currStats.stability, buff: currStats.buff };
                    calculatedMinDps = trueBaseDps * (currStats.stability / 100);
                }
                start_r = tmp_r; start_idx = tmp_idx; start_hp = tmp_hp;
            } else if (rotId) { calculatedMinDps = getRotDpsRange(possibleRots[0]).min; }
            
            currentTeams.push({ c1, c2, c3, scoreInput, ebR, ebIdx, ebHp, chk_res, calculatedMinDps });
        }
    });
    
    try { localStorage.setItem('ww_custom_stats', JSON.stringify(customStatsMap)); localStorage.setItem('ww_boss_hp_history', JSON.stringify(bossHPHistory)); } catch(e) {}
    renderIndividualHPPanel(); renderRotations();

    if (currentTeams.length > 0) {
        currentTeams.sort((a, b) => b.calculatedMinDps - a.calculatedMinDps);
        document.querySelectorAll('.char-select, .score-input, .end-boss-r, .end-boss-idx, .end-boss-hp').forEach(el => el.value = "");
        document.querySelectorAll('input[type="checkbox"][class^="res-chk"]').forEach(c => c.checked = false);

        currentTeams.forEach((tData, index) => {
            let row = rows[index];
            if(row) {
                let ss = row.querySelectorAll('select.char-select');
                if(ss[0].querySelector(`option[value="${tData.c1}"]`) == null) ss[0].innerHTML += `<option value="${tData.c1}">${tData.c1}</option>`;
                if(ss[1].querySelector(`option[value="${tData.c2}"]`) == null) ss[1].innerHTML += `<option value="${tData.c2}">${tData.c2}</option>`;
                if(ss[2].querySelector(`option[value="${tData.c3}"]`) == null) ss[2].innerHTML += `<option value="${tData.c3}">${tData.c3}</option>`;
                ss[0].value = tData.c1; ss[1].value = tData.c2; ss[2].value = tData.c3;
                row.querySelector('.score-input').value = tData.scoreInput || ""; row.querySelector('.end-boss-r').value = tData.ebR || "";
                row.querySelector('.end-boss-idx').value = tData.ebIdx || ""; row.querySelector('.end-boss-hp').value = tData.ebHp || "";
                row.querySelector('.res-chk-1').checked = tData.chk_res[0]; row.querySelector('.res-chk-2').checked = tData.chk_res[1];
                row.querySelector('.res-chk-3').checked = tData.chk_res[2]; row.querySelector('.res-chk-4').checked = tData.chk_res[3];
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
        let b1 = getBase(team.c1), b2 = getBase(team.c2), b3 = getBase(team.c3);
        let u1 = charUsageCount[b1] || 0, u2 = charUsageCount[b2] || 0, u3 = charUsageCount[b3] || 0;
        if (u1 < (charData[b1]?.max||1) && u2 < (charData[b2]?.max||1) && u3 < (charData[b3]?.max||1)) {
            if (b1 === b2 || b1 === b3 || b2 === b3) continue;
            finalOptimizedTeams.push(team); charUsageCount[b1]=u1+1; charUsageCount[b2]=u2+1; charUsageCount[b3]=u3+1;
        }
        if (finalOptimizedTeams.length >= 16) break;
    }

    document.querySelectorAll('.char-select, .score-input, .end-boss-hp, .end-boss-r, .end-boss-idx').forEach(el => el.value="");
    document.querySelectorAll('input[type="checkbox"][class^="res-chk"]').forEach(c => c.checked=false);
    
    let rows = document.querySelectorAll('#team-board tr');
    finalOptimizedTeams.forEach((tData, index) => {
        if(rows[index]) {
            let ss = rows[index].querySelectorAll('select.char-select');
            ss[0].innerHTML = `<option value="${tData.c1}">${tData.c1}</option>`;
            ss[1].innerHTML = `<option value="${tData.c2}">${tData.c2}</option>`;
            ss[2].innerHTML = `<option value="${tData.c3}">${tData.c3}</option>`;
            ss[0].value = tData.c1; ss[1].value = tData.c2; ss[2].value = tData.c3;
        }
    });
    updateTracker(); alert(t(`✅ 一鍵配置完成！共組建 ${finalOptimizedTeams.length} 隊。`));
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

function resetTeams() { 
    if(!confirm(t("確定清空編隊表嗎？"))) return;
    document.querySelectorAll('.char-select, .score-input, .end-boss-hp, .end-boss-r, .end-boss-idx').forEach(el => el.value="");
    document.querySelectorAll('input[type="checkbox"][class^="res-chk"]').forEach(c => c.checked=false);
    updateTracker(); 
}

function saveData() {
    try {
        localStorage.setItem('ww_roster', JSON.stringify([...ownedCharacters]));
        localStorage.setItem('ww_rotations', JSON.stringify([...checkedRotations]));
        let teams = []; document.querySelectorAll('#team-board tr').forEach(r => teams.push([...r.querySelectorAll('select.char-select')].map(s=>s.value)));
        localStorage.setItem('ww_teams', JSON.stringify(teams));
    } catch(e) {}
}

function submitToGoogleForm() {
    if(!confirm(t("您即將匿名提交當前表單上的數據，是否繼續？"))) return;
    let dataParams = []; let rows = document.querySelectorAll('#team-board tr');
    dataParams.push("主C,副C,生存,實戰分數,終點王R,終點王隻數,剩餘血量%,王1抗,王2抗,王3抗,王4抗");
    rows.forEach((r) => {
        let ss = r.querySelectorAll('select.char-select'), score = r.querySelector('.score-input').value, ebR = r.querySelector('.end-boss-r').value, ebIdx = r.querySelector('.end-boss-idx').value, ebHp = r.querySelector('.end-boss-hp').value;
        if(ss[0].value && ss[1].value && ss[2].value && score) {
            let res1 = r.querySelector('.res-chk-1').checked ? 1 : 0, res2 = r.querySelector('.res-chk-2').checked ? 1 : 0, res3 = r.querySelector('.res-chk-3').checked ? 1 : 0, res4 = r.querySelector('.res-chk-4').checked ? 1 : 0;
            dataParams.push(`${ss[0].value},${ss[1].value},${ss[2].value},${score},${ebR},${ebIdx},${ebHp},${res1},${res2},${res3},${res4}`);
        }
    });
    if (dataParams.length === 1) return alert(t("請先填寫實戰得分！"));
    let csvReport = dataParams.join('\n');
    window.open(`https://docs.google.com/forms/d/e/1FAIpQLSfB2g_uLwL7D2O1uUuM1iEaWkO7q29Xm9eG-8yPqg6Vw/viewform?usp=pp_url&entry.956555135=${encodeURIComponent(csvReport)}`, '_blank');
}

function exportImage() {
    const rows = document.querySelectorAll('#team-board tr'); let completed = [];
    rows.forEach((r, i) => {
        let ss = r.querySelectorAll('select.char-select'), resTd = r.querySelector('.relay-result'), score = r.querySelector('.score-input').value;
        if(ss[0].value && ss[1].value && ss[2].value) {
            let resText = resTd.innerText.replace(/\n/g, ' | '), finalScore = score ? `實得分: ${score}` : resText;
            completed.push({id: i+1, c1: ss[0].value, c2: ss[1].value, c3: ss[2].value, res: finalScore});
        }
    });
    if(!completed.length) return alert(t("請先完成至少一支滿編隊伍！"));
    let box = document.createElement('div'); box.style = "position:absolute; left:-9999px; background:#1e1e24; color:#fff; padding:30px; border-radius:15px; width:1000px; font-family:'Segoe UI',sans-serif;";
    let h = `<h2 style="color:#d4af37; text-align:center; border-bottom:2px solid #d4af37; padding-bottom:10px;">${t("鳴潮矩陣實戰推演編隊表")}</h2><table style="width:100%; border-collapse:collapse; margin-top:20px; text-align:center; font-size:1.1em;">`;
    h += `<tr style="background:#3f3f4e; color:#d4af37;"><th>${t("關卡")}</th><th>${t("主輸出")}</th><th>${t("副C/輔助")}</th><th>${t("生存/輔助")}</th><th style="color:#00ffaa;">${t("推演戰果 / 實戰得分")}</th></tr>`;
    completed.forEach(tData => h += `<tr><td style="border:1px solid #555; padding:15px; font-weight:bold; color:#4caf50;">${t("第")} ${tData.id} ${t("隊")}</td><td style="border:1px solid #555; padding:15px;">${t(tData.c1)}</td><td style="border:1px solid #555; padding:15px;">${t(tData.c2)}</td><td style="border:1px solid #555; padding:15px;">${t(tData.c3)}</td><td style="border:1px solid #555; padding:15px; font-size:0.85em; text-align:left;">${tData.res}</td></tr>`);
    box.innerHTML = h + `</table><div style="margin-top:20px; text-align:right; color:#888; font-size:0.9em;">${t("總分預估")}：${document.getElementById('matrix-total-score').innerText} | ${t("生成時間")}：${new Date().toLocaleString()}</div>`;
    document.body.appendChild(box);
    html2canvas(box, { backgroundColor: '#1e1e24', scale: 2 }).then(c => { let l = document.createElement('a'); l.download = '鳴潮矩陣推演編隊表.png'; l.href = c.toDataURL('image/png'); l.click(); document.body.removeChild(box); });
}

// --- 9. 初始化啟動引擎 ---
function initializeApp() {
    initBoard();
    try { isSimp = localStorage.getItem('ww_lang') === 'zh-CN'; } catch(e){}
    if (isSimp) document.getElementById('lang-toggle').innerText = "繁";
    
    try {
        const sr = localStorage.getItem('ww_roster');
        if (sr) {
            let parsed = JSON.parse(sr);
            if (Array.isArray(parsed)) { ownedCharacters.clear(); parsed.forEach(name => { if (charData[name] || ['光主','暗主','風主'].includes(name)) ownedCharacters.add(name); }); }
        } else { ownedCharacters = new Set(Object.keys(charData)); }
    } catch(e) { ownedCharacters = new Set(Object.keys(charData)); }

    try {
        const srot = localStorage.getItem('ww_rotations');
        if (srot) {
            let parsed = JSON.parse(srot);
            if (Array.isArray(parsed)) { checkedRotations.clear(); const validIds = new Set(dpsData.map(d => d.id)); parsed.forEach(id => { if (validIds.has(id)) checkedRotations.add(id); }); }
        } else { checkedRotations = new Set(dpsData.map(d => d.id)); }
    } catch(e) { checkedRotations = new Set(dpsData.map(d => d.id)); }

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
                    if (pt[i][0]) { ss[0].innerHTML = `<option value="${pt[i][0]}">${pt[i][0]}</option>`; ss[0].value = pt[i][0]; }
                    if (pt[i][1]) { ss[1].innerHTML = `<option value="${pt[i][1]}">${pt[i][1]}</option>`; ss[1].value = pt[i][1]; }
                    if (pt[i][2]) { ss[2].innerHTML = `<option value="${pt[i][2]}">${pt[i][2]}</option>`; ss[2].value = pt[i][2]; }
                }
            });
        }
    } catch(e) {}
    
    updateTracker(); 
    // 預設切換到第一頁
    document.querySelectorAll('.tab-btn')[0].click();
}

initializeApp();