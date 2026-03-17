// ==========================================
// 1. 介面導航與高精度逐詞翻譯引擎
// ==========================================
function switchTab(pageId, btnElement) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    btnElement.classList.add('active');
}

const phraseDict = [
    ["鳴潮矩陣編隊工具", "鸣潮矩阵编队工具"], ["測試版", "测试版"], ["數據庫設計與邏輯", "数据库设计与逻辑"], 
    ["報錯與意見回饋", "报错与意见反馈"], ["第一步：角色與排軸設定", "第一步：角色与排轴设定"], 
    ["第二步：矩陣編隊與實戰推演", "第二步：矩阵编队与实战推演"], ["歡迎使用！點此查看「頁面操作指南」", "欢迎使用！点此查看「页面操作指南」"],
    ["當前頁面：角色與排軸設定", "当前页面：角色与排轴设定"], ["選擇角色：", "选择角色："], 
    ["篩選排軸難度：", "筛选排轴难度："], ["系統只會顯示您可以組建的隊伍。", "系统只会显示您可以组建的队伍。"],
    ["微調穩定性：", "微调稳定性："], ["下一頁預告：", "下一页预告："], ["完成設定後，點擊右下角按鈕前往下一頁。", "完成设定后，点击右下角按钮前往下一页。"],
    ["實戰分數反推與無損洗牌重排", "实战分数反推与无损洗牌重排"], ["開發者備註", "开发者备注"], 
    ["平滑均傷", "平滑均伤"], ["爆發前置", "爆发前置"], ["平滑出傷", "平滑出伤"],
    ["自訂各軸傷害折線", "自订各轴伤害折线"], ["自訂循環次數", "自订循环次数"], ["版本更新說明", "版本更新说明"], 
    ["無損實戰洗牌", "无损实战洗牌"], ["防呆選單與血量鎖定", "防呆选单与血量锁定"], ["一鍵重設預設", "一键重设预设"], 
    ["雙檔分離與分頁", "双档分离与分页"], ["近期版本更新概略", "近期版本更新概略"], ["一鍵編制邏輯", "一键编制逻辑"],
    ["內建軸穩定性計算器", "内建轴稳定性计算器"], ["手法折損全局與微調拉桿", "手法折损全局与微调拉杆"],
    ["請先按照您在遊戲中實際出戰的順序，將隊伍排在表格上。", "请先按照您在游戏中实际出战的顺序，将队伍排在表格上。"],
    ["在表格內的「實戰得分」欄位，填入該隊打完結算的總分。", "在表格内的「实战得分」栏位，填入该队打完结算的总分。"],
    ["勾選該隊伍遭遇抗性的是第幾隻王", "勾选该队伍遭遇抗性的是第几只王"],
    ["若該隊伍沒把王打死，請在「🎯終:」下拉選單選擇終點王", "若该队伍没把王打死，请在「🎯终:」下拉选单选择终点王"],
    ["系統會精準扣除轉場動畫延遲與抗性干擾，推算真實", "系统会精准扣除转场动画延迟与抗性干扰，推算真实"],
    ["為您無損地重新排序最佳出戰順序！", "为您无损地重新排序最佳出战顺序！"],
    ["將您本次排出的矩陣波次與分數傳送給開發者，協助校正王血量公式！", "将您本次排出的矩阵波次与分数传送给开发者，协助校正王血量公式！"],
    ["當您填寫表格中的「終點王殘血反解」與分數後，系統會自動將其加入背景的代數校正池。若需要剔除錯誤樣本，請前往右上角的「⚙️ 數據總管與備份」進行管理。", "当您填写表格中的「终点王残血反解」与分数后，系统会自动将其加入背景的代数校正池。若需要剔除错误样本，请前往右上角的「⚙️ 数据总管与备份」进行管理。"],
    ["提示：在表格內填寫【實戰得分】並點擊反推，系統會自動修改該隊伍的「自訂 DPS」。若要還原，請點擊該隊伍下方的「🔄 重設預設 DPS」。", "提示：在表格内填写【实战得分】并点击反推，系统会自动修改该队伍的「自订 DPS」。若要还原，请点击该队伍下方的「🔄 重设预设 DPS」。"],
    ["點擊展開", "点击展开"], ["前往下一步：編隊與推演", "前往下一步：编队与推演"],
    ["一鍵理論編隊", "一键理论编队"], ["依排軸難度微調各別穩定性", "依排轴难度微调各别稳定性"],
    ["全局操作達成率", "全局操作达成率"], ["自動依難度換算折損", "自动依难度换算折损"],
    ["搜尋擁有角色", "搜寻拥有角色"], ["搜尋排軸角色", "搜寻排轴角色"], ["清空角色勾選", "清空角色勾选"], 
    ["清空所有排軸", "清空所有排轴"], ["依據理論最高", "依据理论最高"], ["自動為您滿編", "自动为您满编"],
    ["根據表格分數反推真實", "根据表格分数反推真实"], ["現有隊伍無損洗牌", "现有队伍无损洗牌"],
    ["為最優順序！", "为最优顺序！"], ["一鍵編制", "一键编制"], ["理論推演", "理论推演"],
    ["依實戰得分反推與無損重排", "依实战得分反推与无损重排"], ["重設編制", "重设编制"],
    ["截圖分享", "截图分享"], ["貢獻實戰大數據", "贡献实战大数据"], ["剩餘可用次數", "剩余可用次数"], 
    ["隊伍編排", "队伍编排"], ["極限上限16隊", "极限上限16队"], ["矩陣實戰接力推演與環境設定", "矩阵实战接力推演与环境设定"], 
    ["影響分數與轉場計算", "影响分数与转场计算"], ["計分比例(分/萬)", "计分比例(分/万)"], 
    ["每 1 萬傷害等於多少分數", "每 1 万伤害等于多少分数"], ["預設", "预设"], ["得1分", "得1分"], 
    ["均血(萬)", "均血(万)"], ["後續成長(%)", "后续成长(%)"], ["以後每階血量成長率", "以后每阶血量成长率"], 
    ["抗性減傷(%)", "抗性减伤(%)"], ["當隊伍遭遇抗性王時，降低的DPS百分比", "当队伍遭遇抗性王时，降低的DPS百分比"],
    ["轉場耗時(秒)", "转场耗时(秒)"], ["擊殺BOSS後的出場動畫延遲", "击杀BOSS后的出场动画延迟"],
    ["單隊時限(秒)", "单队时限(秒)"], ["進階：個別 BOSS 血量覆寫與代數反解校正面板", "进阶：个别 BOSS 血量覆写与代数反解校正面板"],
    ["主輸出篩選", "主输出筛选"], ["世代", "世代"], ["推薦配隊快速填入", "推荐配队快速填入"],
    ["填入下一空位", "填入下一空位"], ["當前編隊 矩陣接力推演總分", "当前编队 矩阵接力推演总分"],
    ["隊伍", "队伍"], ["位置 1 (主C)", "位置 1 (主C)"], ["位置 2 (副C)", "位置 2 (副C)"], ["位置 3 (生存)", "位置 3 (生存)"],
    ["實戰得分 / 殘血反解與抗性", "实战得分 / 残血反解与抗性"], ["推演戰果 (接力波次進度)", "推演战果 (接力波次进度)"],
    ["填寫檢測數據與環境加權", "填写检测数据与环境加权"], ["真實", "真实"], ["當期屬性增傷加權", "当期属性增伤加权"],
    ["取消", "取消"], ["清除自訂", "清除自订"], ["儲存", "储存"], ["實戰手法穩定性檢測", "实战手法稳定性检测"],
    ["基準理論耗時", "基准理论耗时"], ["實測耗時紀錄", "实测耗时纪录"], ["以逗號分隔", "以逗号分隔"],
    ["執行檢測分析", "执行检测分析"], ["平均耗時", "平均耗时"], ["節奏標準差", "节奏标准差"],
    ["綜合穩定性", "综合稳定性"], ["關閉", "关闭"], ["套用至全局拉桿", "套用至全局拉杆"],
    ["數據提供", "数据提供"], ["整理", "整理"], ["流量統計", "流量统计"], ["第一步", "第一步"], 
    ["角色", "角色"], ["排軸", "排轴"], ["設定", "设定"], ["第二步", "第二步"], ["實戰", "实战"], 
    ["推演", "推演"], ["全局", "全局"], ["輪椅", "轮椅"], ["進階", "进阶"], ["中等", "中等"], 
    ["極難", "极难"], ["非主流", "非主流"], ["一般角色", "一般角色"], ["生存位", "生存位"], 
    ["主輸出", "主输出"], ["副C/輔助", "副C/辅助"], ["生存/輔助", "生存/辅助"], ["適配推薦", "适配推荐"], 
    ["其他角色", "其他角色"], ["耗盡", "耗尽"], ["在隊", "在队"], ["理論最大", "理论最大"], 
    ["剩餘可排", "剩余可排"], ["無預設", "无预设"], ["點擊自訂", "点击自订"], ["選擇推薦配隊", "选择推荐配队"], 
    ["無DPS", "无DPS"], ["無法推演", "无法推演"], ["請先排滿該隊伍的成員", "请先排满该队伍的成员"], 
    ["找不到此組合的排軸資料", "找不到此组合的排轴资料"], ["已清除該隊伍排軸的自訂", "已清除该队伍排轴的自订"], 
    ["恢復系統預設值", "恢复系统预设值"], ["請先在上方勾選擁有的角色", "请先在上方勾选拥有的角色"], 
    ["以解鎖可組建的排軸", "以解锁可组建的排轴"], ["套用校正", "套用校正"], ["已成功校正為平均值", "已成功校正为平均值"], 
    ["號?", "号?"], ["抗性王", "抗性王"], ["打完結算給的總分", "打完结算给的总分"], ["實戰得分", "实战得分"], 
    ["下限", "下限"], ["上限", "上限"], ["將清空當前編隊並自動生成極限陣容，確定執行？", "将清空当前编队并自动生成极限阵容，确定执行？"],
    ["一鍵配置完成！共組建", "一键配置完成！共组建"], ["沒有空白隊伍了！", "没有空白队伍了！"],
    ["確定清空編隊表嗎？", "确定清空编队表吗？"], ["您即將匿名提交當前表單上的數據，是否繼續？", "您即将匿名提交当前表单上的数据，是否继续？"],
    ["請先填寫實戰得分！", "请先填写实战得分！"], ["請先完成至少一支滿編隊伍！", "请先完成至少一支满编队伍！"],
    ["實得分", "实得分"], ["推演編隊表", "推演编队表"], ["總分預估", "总分预估"], ["生成時間", "生成时间"],
    ["冷凝", "冷凝"], ["熱熔", "热熔"], ["導電", "导电"], ["氣動", "气动"], ["衍射", "衍射"], ["湮滅", "湮灭"],
    ["漂泊者", "漂泊者"], ["維里奈", "维里奈"], ["守岸人", "守岸人"], ["今汐", "今汐"], ["長離", "长离"], 
    ["忌炎", "忌炎"], ["相里要", "相里要"], ["椿", "椿"], ["折枝", "折枝"], ["吟霖", "吟霖"], 
    ["卡卡羅", "卡卡罗"], ["安可", "安可"], ["凌陽", "凌阳"], ["鑒心", "鉴心"], ["散華", "散华"], 
    ["白芷", "白芷"], ["熾霞", "炽霞"], ["秧秧", "秧秧"], ["丹瑾", "丹瑾"], ["釉瑚", "釉瑚"], 
    ["桃祈", "桃祈"], ["秋水", "秋水"], ["莫特斐", "莫特斐"], ["淵武", "渊武"], ["燈燈", "灯灯"], 
    ["珂萊塔", "珂莱塔"], ["洛可可", "洛可可"], ["菲比", "菲比"], ["布蘭特", "布兰特"], ["坎特蕾拉", "坎特蕾拉"], 
    ["贊妮", "赞妮"], ["夏空", "夏空"], ["卡提希婭", "卡提希娅"], ["露帕", "露帕"], ["弗洛洛", "弗洛洛"], 
    ["奧古斯塔", "奥古斯塔"], ["尤諾", "尤诺"], ["嘉貝莉娜", "嘉贝莉娜"], ["仇遠", "仇远"], ["千咲", "千咲"], 
    ["卜靈", "卜灵"], ["琳奈", "琳奈"], ["莫寧", "莫宁"], ["陸·赫斯", "陆·赫斯"], ["愛彌斯", "爱弥斯"], 
    ["西格莉卡", "西格莉卡"], ["光主", "光主"], ["暗主", "暗主"], ["風主", "风主"],
    ["常規", "常规"], ["錯輪", "错轮"], ["死告", "死告"], ["龍切", "龙切"], ["離火", "离火"], 
    ["雙延", "双延"], ["奶套", "奶套"], ["轉聚暴", "转聚暴"], ["雙下", "双下"], ["劍切", "剑切"], 
    ["雙錨", "双锚"], ["錯延", "错延"], ["旋踢", "旋踢"], ["新增自訂編隊", "新增自订编队"], ["預設理論", "预设理论"],
    ["數據總管與備份", "数据总管与备份"], ["返回正式版", "返回正式版"], ["管理校正樣本", "管理校正样本"], 
    ["匯出存檔", "汇出存档"], ["匯入存檔", "汇入存档"], ["複製代碼", "复制代码"], ["還原設定", "还原设定"],
    ["排序", "排序"]
];

phraseDict.sort((a, b) => b[0].length - a[0].length);

let isSimp = false;
function t(str) { 
    if (!isSimp || !str || typeof str !== 'string') return str; 
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
    document.querySelectorAll('input[placeholder], textarea[placeholder], option').forEach(el => {
        if (el.tagName === 'OPTION' && el.label) {
            if (el.originalLabel === undefined) el.originalLabel = el.label;
            el.label = isSimp ? t(el.originalLabel) : el.originalLabel;
        }
        if (el.placeholder) {
            if (el.originalPlaceholder === undefined) el.originalPlaceholder = el.placeholder;
            el.placeholder = isSimp ? t(el.originalPlaceholder) : el.originalPlaceholder;
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
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ==========================================
// 2. 核心資料庫與自訂系統
// ==========================================
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
        { c2:"散華", c3:"守岸人", dps:5.59, rot:"常規", diff:"🟩" }, { c2:"洛可可", c3:"守岸人", dps:6.35, rot:"上限", diff:"⭐" }, { c2:"洛可可", c3:"守岸人", dps:5.95, rot:"常規", diff:"🔵" }
    ],
    "暗主": [
        { c2:"琳奈", c3:"守岸人", dps:7.10, rot:"錯亂2min軸", diff:"⭐" }, { c2:"琳奈", c3:"守岸人", dps:6.77, rot:"錯輪", diff:"🔵" }, { c2:"琳奈", c3:"守岸人", dps:5.48, rot:"常規", diff:"🟩" },
        { c2:"散華", c3:"守岸人", dps:6.16, rot:"錯輪", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:5.40, rot:"常規", diff:"🟩" },
        { c2:"洛可可", c3:"守岸人", dps:6.48, rot:"常規", diff:"🔵" }, { c2:"洛可可", c3:"守岸人", dps:5.60, rot:"常規", diff:"🟩" }
    ],
    "今汐": [
        { c2:"坎特蕾拉", c3:"守岸人", dps:6.07, rot:"常規", diff:"🔵" }, { c2:"折枝", c3:"守岸人", dps:6.38, rot:"常規", diff:"⭐" }, { c2:"折枝", c3:"守岸人", dps:5.85, rot:"常規", diff:"🔵" },
        { c2:"折枝", c3:"卜靈", dps:5.77, rot:"常規", diff:"🔵" }, { c2:"吟霖", c3:"守岸人", dps:6.45, rot:"錯輪", diff:"⭐" }, { c2:"吟霖", c3:"守岸人", dps:5.73, rot:"常規", diff:"🔵" }
    ],
    "安可": [
        { c2:"露帕", c3:"莫寧", dps:6.47, rot:"常規上限", diff:"🔵" }, { c2:"露帕", c3:"守岸人", dps:6.25, rot:"6鏈", diff:"🔵" }, { c2:"露帕", c3:"守岸人", dps:5.79, rot:"常規", diff:"🔵" },
        { c2:"散華", c3:"守岸人", dps:5.50, rot:"錯輪", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:5.00, rot:"常規", diff:"🟩" }
    ],
    "長離": [
        { c2:"露帕", c3:"莫寧", dps:7.20, rot:"極限", diff:"⭐" }, { c2:"露帕", c3:"莫寧", dps:6.90, rot:"錯輪", diff:"⭐" }, { c2:"露帕", c3:"莫寧", dps:6.40, rot:"常規", diff:"🔵" },
        { c2:"露帕", c3:"守岸人", dps:6.01, rot:"7離火", diff:"⭐" }, { c2:"露帕", c3:"守岸人", dps:5.83, rot:"6離火", diff:"🔵" }, { c2:"露帕", c3:"守岸人", dps:5.63, rot:"5離火", diff:"🟩" },
        { c2:"散華", c3:"守岸人", dps:4.81, rot:"錯輪", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:4.20, rot:"常規", diff:"🟩" }
    ],
    "忌炎": [
        { c2:"夏空", c3:"守岸人", dps:7.81, rot:"龍切", diff:"⭐" }, { c2:"夏空", c3:"守岸人", dps:6.79, rot:"常規", diff:"⭐" }, { c2:"夏空", c3:"尤諾", dps:6.55, rot:"常規", diff:"🔵" },
        { c2:"莫特斐", c3:"守岸人", dps:5.85, rot:"常規", diff:"⭐" }, { c2:"莫特斐", c3:"守岸人", dps:5.60, rot:"常規", diff:"🔵" }
    ],
    "相里要": [
        { c2:"琳奈", c3:"守岸人", dps:6.28, rot:"常規", diff:"🔵" }, { c2:"吟霖", c3:"守岸人", dps:5.25, rot:"常規", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:4.58, rot:"錯輪", diff:"🔵" }
    ],
    "卡卡羅": [
        { c2:"琳奈", c3:"守岸人", dps:7.65, rot:"6鏈死告", diff:"⚠️" }, { c2:"琳奈", c3:"守岸人", dps:7.53, rot:"6鏈死告", diff:"⭐" }, { c2:"琳奈", c3:"守岸人", dps:7.20, rot:"6鏈死告", diff:"🔵" },
        { c2:"琳奈", c3:"守岸人", dps:6.40, rot:"4死告", diff:"⭐" }, { c2:"琳奈", c3:"守岸人", dps:6.10, rot:"常規", diff:"🔵" }, { c2:"琳奈", c3:"守岸人", dps:5.80, rot:"基礎", diff:"🟩" },
        { c2:"吟霖", c3:"守岸人", dps:6.10, rot:"6鏈", diff:"⭐" }, { c2:"吟霖", c3:"守岸人", dps:5.72, rot:"6鏈", diff:"🔵" }, { c2:"吟霖", c3:"守岸人", dps:5.07, rot:"4死告", diff:"⭐" },
        { c2:"吟霖", c3:"守岸人", dps:4.65, rot:"常規", diff:"🔵" }, { c2:"散華", c3:"守岸人", dps:4.13, rot:"常規", diff:"🔵" }
    ],
    "凌陽": [
        { c2:"琳奈", c3:"守岸人", dps:5.18, rot:"常規", diff:"🔵" }, { c2:"折枝", c3:"守岸人", dps:5.08, rot:"6鏈", diff:"🔵" }, { c2:"折枝", c3:"守岸人", dps:4.32, rot:"常規", diff:"🔵" }
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
    ]
};

let dpsData = [];
let rotIdCounter = 0;
for (let c1 in teamDB) {
    teamDB[c1].forEach(tData => {
        dpsData.push({ id: 'rot_' + rotIdCounter++, c1: c1, c2: tData.c2, c3: tData.c3, dps: tData.dps, rot: tData.rot, diff: tData.diff, gen: charData[c1]?charData[c1].gen:1 });
    });
}

// ==========================================
// 3. 系統狀態與全域變數
// ==========================================
let ownedCharacters = new Set();
let checkedRotations = new Set();
let show5Star = true, show4Star = true, showG1 = true, showG2 = true, showG3 = true;
let customStatsMap = {};
const noRecChars = new Set(["莫特斐", "秧秧", "桃祈", "淵武", "釉瑚"]);
let diffStability = { '⚠️': 100, '⭐': 100, '🔵': 100, '🟩': 100, '🧩': 100 };
let bossHPMap = {};

// 🩸 矩陣血量校正引擎 2.0 (總和權重算法)
// 改為儲存物件: { dmg: 造成傷害, pct: 扣除的百分比 }
let bossHPHistory = {};

let customRotations = [];

// 🚀 Debounce 核心渲染引擎
const debouncedRenderAndTrack = debounce(() => {
    renderRotations();
    updateTracker();
}, 150);

function clampHpPct(el) {
    let val = parseFloat(el.value);
    if (isNaN(val)) { el.value = ''; return; }
    if (val < 0.01) el.value = 0.01;
    if (val > 100) el.value = 100;
}

function getBase(n) { return ['光主', '暗主', '風主'].includes(n) ? '漂泊者' : n; }
function isOwned(n) { return ['光主', '暗主', '風主'].includes(n) ? ownedCharacters.has('漂泊者') : ownedCharacters.has(n); }

// ==========================================
// 4. 新增自訂編隊 (存儲於本機)
// ==========================================
function loadCustomRotations() {
    try {
        let stored = localStorage.getItem('ww_custom_rotations_v2');
        if (stored) customRotations = JSON.parse(stored);
    } catch(e) {}
    customRotations.forEach(cr => {
        dpsData.push({ id: 'custom_rot_' + cr.id, c1: cr.c1, c2: cr.c2, c3: cr.c3, dps: cr.dps, rot: cr.rot, diff: cr.diff, gen: charData[cr.c1]?charData[cr.c1].gen:1, isUserCustom: true });
    });
}

function openCustomTeamModal() {
    let m = document.getElementById('custom-team-modal');
    let charOpts = Object.keys(charData).map(n => `<option value="${n}">${t(n)}</option>`).join('');
    m.innerHTML = `
        <div style="background:#2b2b36; padding:25px; border-radius:10px; border:1px solid #ff9800; width:340px; box-shadow: 0 0 20px rgba(0,0,0,0.8);">
            <h3 style="margin-top:0; color:#ff9800; text-align:center; margin-bottom: 20px;">${t('➕ 新增自訂編隊')}</h3>
            <select id="ct-c1" style="width:100%; margin-bottom:10px; padding:8px; background:#1e1e24; color:#fff; border:1px solid #555; border-radius:4px;">
                <option value="">-- ${t('選擇主輸出')} --</option>${charOpts}
            </select>
            <select id="ct-c2" style="width:100%; margin-bottom:10px; padding:8px; background:#1e1e24; color:#fff; border:1px solid #555; border-radius:4px;">
                <option value="">-- ${t('選擇副C/輔助')} --</option>${charOpts}
            </select>
            <select id="ct-c3" style="width:100%; margin-bottom:10px; padding:8px; background:#1e1e24; color:#fff; border:1px solid #555; border-radius:4px;">
                <option value="">-- ${t('選擇生存/輔助')} --</option>${charOpts}
            </select>
            <input type="number" id="ct-dps" placeholder="${t('預設理論')} DPS (${t('萬')})" style="width:100%; margin-bottom:10px; padding:8px; background:#1e1e24; color:#fff; border:1px solid #555; border-radius:4px;">
            <select id="ct-diff" style="width:100%; margin-bottom:20px; padding:8px; background:#1e1e24; color:#fff; border:1px solid #555; border-radius:4px;">
                <option value="🟩">🟩 ${t('輪椅')}</option>
                <option value="🔵">🔵 ${t('中等')}</option>
                <option value="⭐">⭐ ${t('進階')}</option>
                <option value="⚠️">⚠️ ${t('極難')}</option>
                <option value="🧩">🧩 ${t('非主流')}</option>
            </select>
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('custom-team-modal').style.display='none'" style="flex:1; padding:8px; background:#555; color:#fff; border:none; border-radius:4px; cursor:pointer;">${t('取消')}</button>
                <button onclick="saveCustomTeam()" style="flex:1; padding:8px; background:#4caf50; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">${t('儲存')}</button>
            </div>
        </div>
    `;
    m.style.display = 'flex';
}

function saveCustomTeam() {
    let c1 = document.getElementById('ct-c1').value, c2 = document.getElementById('ct-c2').value, c3 = document.getElementById('ct-c3').value;
    let dps = parseFloat(document.getElementById('ct-dps').value) || 0;
    let diff = document.getElementById('ct-diff').value;
    
    if (!c1 || !c2 || !c3) return alert(t('請完整選擇三名角色！'));
    
    let newId = Date.now();
    let newRot = { id: newId, c1: c1, c2: c2, c3: c3, dps: dps, rot: "自訂", diff: diff };
    customRotations.push(newRot);
    try { localStorage.setItem('ww_custom_rotations_v2', JSON.stringify(customRotations)); } catch(e){}
    
    dpsData.push({ id: 'custom_rot_' + newId, c1: c1, c2: c2, c3: c3, dps: dps, rot: "自訂", diff: diff, gen: charData[c1]?charData[c1].gen:1, isUserCustom: true });
    
    document.getElementById('custom-team-modal').style.display = 'none';
    debouncedRenderAndTrack();
    alert(t('自訂編隊已成功加入，並儲存於本機。'));
}

// ==========================================
// 5. 數據總管與備份系統 (Export/Import & Management)
// ==========================================
function openDataManager() {
    let content = document.getElementById('data-manager-content');
    let html = ``;

    // 備份與還原
    html += `<div style="margin-bottom: 25px;">
                <h3 style="color:#d4af37; margin-bottom: 10px;">💾 ${t('玩家設定檔備份 (匯出 / 匯入)')}</h3>
                <p style="color:#aaa; font-size:0.9em;">${t('包含您的角色勾選、排軸狀態、自訂編隊、修改過的王血量與 DPS 覆寫紀錄。')}</p>
                <textarea id="dm-code" rows="4" style="width:100%; padding:10px; background:#1e1e24; color:#00ffaa; border:1px solid #555; border-radius:5px; font-family:monospace; resize:none;"></textarea>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button onclick="generateExportCode()" style="flex:1; background:#3498db; color:white; border:none; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">📥 ${t('產生匯出代碼')}</button>
                    <button onclick="importFromCode()" style="flex:1; background:#4caf50; color:white; border:none; padding:8px; border-radius:5px; font-weight:bold; cursor:pointer;">📤 ${t('貼上後還原設定')}</button>
                </div>
             </div>`;

    // 自訂編隊管理
    html += `<div style="margin-bottom: 25px; border-top: 1px dashed #555; padding-top: 15px;">
                <h3 style="color:#ff9800; margin-bottom: 10px;">📝 ${t('自訂編隊管理')}</h3>`;
    if(customRotations.length === 0) {
        html += `<p style="color:#888; font-style:italic;">${t('目前沒有自訂編隊。')}</p>`;
    } else {
        html += `<div style="background:#1e1e24; padding:10px; border-radius:5px; max-height:150px; overflow-y:auto;">`;
        customRotations.forEach((cr, index) => {
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid #333;">
                        <span style="color:#ddd; font-size:0.9em;">${cr.diff} ${t(cr.c1)} + ${t(cr.c2)} + ${t(cr.c3)} (${cr.dps}w)</span>
                        <button onclick="deleteCustomTeam(${index})" style="background:#d9534f; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:0.8em; cursor:pointer;">❌</button>
                     </div>`;
        });
        html += `</div>`;
    }
    html += `</div>`;

    // 矩陣血量校正樣本管理 (Pooled Estimator History)
    html += `<div style="border-top: 1px dashed #555; padding-top: 15px;">
                <h3 style="color:#cf00ff; margin-bottom: 10px;">🩸 ${t('矩陣血量校正樣本管理')}</h3>`;
    if(Object.keys(bossHPHistory).length === 0) {
        html += `<p style="color:#888; font-style:italic;">${t('目前沒有收集到任何反解樣本。')}</p>`;
    } else {
        html += `<div style="background:#1e1e24; padding:10px; border-radius:5px; max-height:200px; overflow-y:auto;">`;
        for(let key in bossHPHistory) {
            html += `<div style="margin-bottom: 10px;"><strong style="color:#00ffaa;">[${key}]</strong>`;
            bossHPHistory[key].forEach((sample, index) => {
                html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; margin-left:10px; border-bottom:1px dashed #444;">
                            <span style="color:#ccc; font-size:0.85em;">${t('傷害')} ${sample.dmg.toFixed(2)}w (扣除 ${(sample.pct*100).toFixed(2)}%)</span>
                            <button onclick="deleteHPSample('${key}', ${index})" style="background:transparent; color:#d9534f; border:1px solid #d9534f; padding:2px 6px; border-radius:4px; font-size:0.7em; cursor:pointer;">❌</button>
                         </div>`;
            });
            html += `</div>`;
        }
        html += `</div>`;
    }
    html += `</div>`;

    content.innerHTML = html;
    document.getElementById('data-manager-modal').style.display = 'flex';
}

function closeDataManager() { document.getElementById('data-manager-modal').style.display = 'none'; }

function generateExportCode() {
    let data = {
        roster: [...ownedCharacters],
        rotations: [...checkedRotations],
        customStats: customStatsMap,
        bossHp: bossHPHistory,
        customTeams: customRotations
    };
    let code = btoa(encodeURIComponent(JSON.stringify(data)));
    document.getElementById('dm-code').value = code;
    alert(t('✅ 代碼已產生，請全選複製。'));
}

function importFromCode() {
    let code = document.getElementById('dm-code').value;
    if(!code) return alert(t('請貼上代碼！'));
    if(!confirm(t('這將會覆寫您當前所有的設定，確定執行？'))) return;
    try {
        let data = JSON.parse(decodeURIComponent(atob(code)));
        if(data.roster) localStorage.setItem('ww_roster', JSON.stringify(data.roster));
        if(data.rotations) localStorage.setItem('ww_rotations', JSON.stringify(data.rotations));
        if(data.customStats) localStorage.setItem('ww_custom_stats', JSON.stringify(data.customStats));
        if(data.bossHp) localStorage.setItem('ww_boss_hp_history', JSON.stringify(data.bossHp));
        if(data.customTeams) localStorage.setItem('ww_custom_rotations_v2', JSON.stringify(data.customTeams));
        alert(t('✅ 設定已還原！即將重新載入頁面...'));
        window.location.reload();
    } catch(e) {
        alert(t('❌ 代碼解析失敗，請確認代碼是否完整！'));
    }
}

function deleteCustomTeam(index) {
    if(!confirm(t('確定刪除此自訂編隊？'))) return;
    let cr = customRotations.splice(index, 1)[0];
    try { localStorage.setItem('ww_custom_rotations_v2', JSON.stringify(customRotations)); } catch(e){}
    dpsData = dpsData.filter(d => d.id !== 'custom_rot_' + cr.id);
    debouncedRenderAndTrack(); openDataManager(); // 重新渲染總管介面
}

function deleteHPSample(key, index) {
    bossHPHistory[key].splice(index, 1);
    if(bossHPHistory[key].length === 0) delete bossHPHistory[key];
    try { localStorage.setItem('ww_boss_hp_history', JSON.stringify(bossHPHistory)); } catch(e){}
    debouncedRenderAndTrack(); openDataManager(); // 重新渲染總管介面
}

// ==========================================
// 6. UI 互動與畫面渲染
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

// --- Modals ---
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
    if (currentEditRotId) { delete customStatsMap[currentEditRotId]; try { localStorage.setItem('ww_custom_stats', JSON.stringify(customStatsMap)); } catch(e) {} debouncedRenderAndTrack(); }
    closeStatsModal();
}
function saveStatsModal() {
    let dpsVal = parseFloat(document.getElementById('stats-dps').value), stabVal = parseFloat(document.getElementById('stats-stab').value), buffVal = parseFloat(document.getElementById('stats-buff').value) || 0;
    if (isNaN(dpsVal) || isNaN(stabVal)) { alert(t("請輸入有效的數字！")); return; }
    if (currentEditRotId) { customStatsMap[currentEditRotId] = { dps: dpsVal, stability: Math.min(100, Math.max(0, stabVal)), buff: buffVal }; try { localStorage.setItem('ww_custom_stats', JSON.stringify(customStatsMap)); } catch(e) {} debouncedRenderAndTrack(); }
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

// ==========================================
// 7. 矩陣排兵布陣與拖曳系統 (Drag & Drop)
// ==========================================
function updateRowNumbers() {
    const rows = document.querySelectorAll('#team-board tr');
    rows.forEach((row, idx) => {
        const td = row.querySelector('td:first-child');
        if(td) td.innerHTML = `${t("第")} ${idx + 1} ${t("隊")}`;
    });
}

function initBoard() {
    const b = document.getElementById('team-board');
    let rOpts = `<option value="">R?</option>` + Array.from({length:10}, (_,i)=>`<option value="${i+1}">R${i+1}</option>`).join('');
    let idxOpts = `<option value="">${t("號?")}</option>` + [1,2,3,4].map(idx=>`<option value="${idx}">${idx}</option>`).join('');
    
    for(let i=1; i<=16; i++) {
        let tr = document.createElement('tr');
        tr.className = 'draggable-row';
        tr.draggable = true; // 開啟拖曳
        tr.innerHTML = `<td style="font-weight:bold; color:#d4af37; cursor:grab;">${t("第")} ${i} ${t("隊")}</td>
                        <td><select class="char-select" onchange="updateTracker()"></select></td>
                        <td><select class="char-select" onchange="updateTracker()"></select></td>
                        <td>
                            <select class="char-select" onchange="updateTracker()"></select>
                            <button onclick="resetRowDps(this)" class="btn-reset-dps">🔄 ${t('重設預設')} DPS</button>
                        </td>
                        <td style="font-size:0.85em; text-align:center;">
                            <input type="number" class="score-input" placeholder="${t('實戰得分')}" title="${t('打完結算給的總分')}"><br>
                            <div style="display:flex; justify-content:center; align-items:center; gap:2px; margin-bottom:4px; background:#1e2b24; padding:3px; border-radius:4px; border:1px solid #00ffaa;">
                                <span style="color:#00ffaa; font-weight:bold;">🎯${t('終')}:</span>
                                <select class="hp-calc-select end-boss-r">${rOpts}</select>
                                <span style="color:#00ffaa;">-</span>
                                <select class="hp-calc-select end-boss-idx">${idxOpts}</select>
                                <span style="color:#00ffaa; margin-left:2px;">🩸${t('剩')}:</span>
                                <input type="number" class="hp-calc-input end-boss-hp" placeholder="%" onblur="clampHpPct(this)">
                            </div>
                            <div class="res-chk-group">
                                <span style="color:#888;">${t('抗性王')}:</span>
                                <label><input type="checkbox" class="res-chk-1" onchange="updateTracker()">[1]</label>
                                <label><input type="checkbox" class="res-chk-2" onchange="updateTracker()">[2]</label>
                                <label><input type="checkbox" class="res-chk-3" onchange="updateTracker()">[3]</label>
                                <label><input type="checkbox" class="res-chk-4" onchange="updateTracker()">[4]</label>
                            </div>
                        </td>
                        <td class="relay-result" style="font-size:0.85em; text-align:left; padding-left:15px; border-left:2px solid #00ffaa;">-</td>`;
        b.appendChild(tr);
    }

    // 🚀 實作 Drag & Drop 邏輯
    let draggedRow = null;
    b.addEventListener('dragstart', function(e) {
        draggedRow = e.target.closest('tr');
        if(draggedRow) draggedRow.classList.add('dragging');
    });
    
    b.addEventListener('dragover', function(e) {
        e.preventDefault(); // 允許 Drop
        const targetRow = e.target.closest('tr');
        if(targetRow && targetRow !== draggedRow && targetRow.classList.contains('draggable-row')) {
            const bounding = targetRow.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if(e.clientY - offset > 0) {
                targetRow.after(draggedRow); // 拖到下半部，插在後面
            } else {
                targetRow.before(draggedRow); // 拖到上半部，插在前面
            }
            updateRowNumbers();
        }
    });

    b.addEventListener('dragend', function(e) {
        if(draggedRow) draggedRow.classList.remove('dragging');
        draggedRow = null;
        updateRowNumbers();
        debouncedRenderAndTrack(); // 順序改變，觸發重新算分
    });
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

                resTd.innerHTML = `<div style="line-height:1.4;"><span style="color:#aaa;">${t("下限")}:</span> <span style="color:#ffaa00;">${resMin.startStr} ➔ ${resMin.endStr}</span><br><span style="color:#aaa;">${t("上限")}:</span> <span style="color:#00ffaa;">${resMax.startStr} ➔ ${resMax.endStr}</span><br><span style="color:#cf00ff; font-weight:bold;">${Math.floor(resMin.dmg * env.scoreRatio).toLocaleString()} ~ ${Math.floor(resMax.dmg * env.scoreRatio).toLocaleString()} ${t("分")}</span></div>`;
            } else { resTd.innerHTML = "-"; }
        } else { resTd.innerHTML = "-"; }
    });

    document.getElementById('matrix-total-score').innerText = `${Math.floor(totalMatrixScoreMin).toLocaleString()} ~ ${Math.floor(totalMatrixScoreMax).toLocaleString()} ` + t("分");
    saveData();
}

// ==========================================
// 8. 實戰反推與演算法優化 (Pooled Estimator)
// ==========================================
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
                        
                        // 🩸 血量校正引擎 2.0: 將傷害與扣除血量%存入歷史池 (用於總和權重算法)
                        if (!isNaN(ebRInt) && !isNaN(ebIdxInt) && !isNaN(ebHpPct) && ebRInt === tmp_r && ebIdxInt === tmp_idx && ebHpPct >= 0.01 && ebHpPct <= 100) {
                            let dmgDoneToEndBoss = (actualScore / env.scoreRatio) - dmgDealtToKilledBosses;
                            let hKey = `R${ebRInt}-${ebIdxInt}`;
                            if (!bossHPHistory[hKey]) bossHPHistory[hKey] = [];
                            bossHPHistory[hKey].push({ dmg: dmgDoneToEndBoss, pct: (1 - (ebHpPct / 100)) });
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

// 🩸 血量校正引擎 2.0 (將歷史 {dmg, pct} 陣列，轉換為總和權重算法)
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
            
            // 使用 Pooled Estimator 算法
            if (bossHPHistory[key] && bossHPHistory[key].length >= 3) {
                const totalDmg = bossHPHistory[key].reduce((sum, h) => sum + h.dmg, 0);
                const totalPct = bossHPHistory[key].reduce((sum, h) => sum + h.pct, 0);
                let avg = totalDmg / totalPct; // 權重最佳解
                
                if (Math.abs(avg - getBaseEnvHP(r, i)) / getBaseEnvHP(r, i) > 0.03 && data.isDefault) {
                    btnHtml = `<button class="btn-calib" onclick="applyCalibratedHP('${key}', ${avg})">⚠️ ${t('套用校正')}: ${avg.toFixed(1)}W</button>`;
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
    renderIndividualHPPanel(); updateTracker(); alert(t(`已成功校正為平均值`) + `：${avgValue.toFixed(2)} ` + t(`萬`) + `！`);
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

// 📤 問卷大數據升級：隱藏夾帶真實 DPS 與計算血量
function submitToGoogleForm() {
    if(!confirm(t("您即將匿名提交當前表單上的數據，是否繼續？"))) return;
    let dataParams = []; let rows = document.querySelectorAll('#team-board tr');
    let env = getEnvSettings();
    dataParams.push("主C,副C,生存,實戰分數,真實DPS,終點王R,終點王隻數,剩餘血量%,推算王血量,王1抗,王2抗,王3抗,王4抗");
    
    rows.forEach((r) => {
        let ss = r.querySelectorAll('select.char-select'), score = parseFloat(r.querySelector('.score-input').value), ebR = parseInt(r.querySelector('.end-boss-r').value), ebIdx = parseInt(r.querySelector('.end-boss-idx').value), ebHp = parseFloat(r.querySelector('.end-boss-hp').value);
        if(ss[0].value && ss[1].value && ss[2].value && !isNaN(score)) {
            let res1 = r.querySelector('.res-chk-1').checked ? 1 : 0, res2 = r.querySelector('.res-chk-2').checked ? 1 : 0, res3 = r.querySelector('.res-chk-3').checked ? 1 : 0, res4 = r.querySelector('.res-chk-4').checked ? 1 : 0;
            
            // 背景模擬真實 DPS 與反解血量 (同反推邏輯)
            let dmg_left = score / env.scoreRatio, kills = 0, effective_dmg_sum = 0, tmp_r = 1, tmp_idx = 1, tmp_hp = getBossMaxHP(1, 1), dmgDealtToKilledBosses = 0;
            let chk_res = [res1, res2, res3, res4];
            let calculatedTotalHP = 0;
            
            while (dmg_left > 0 && kills < 40) { // 避免死迴圈
                let r_factor = chk_res[tmp_idx - 1] ? (1 - env.resPenalty / 100) : 1; if (r_factor <= 0) r_factor = 0.1; 
                if (dmg_left >= tmp_hp) {
                    dmg_left -= tmp_hp; dmgDealtToKilledBosses += tmp_hp; effective_dmg_sum += (tmp_hp / r_factor);
                    kills++; tmp_idx++; if (tmp_idx > 4) { tmp_r++; tmp_idx = 1; } tmp_hp = getBossMaxHP(tmp_r, tmp_idx);
                } else {
                    effective_dmg_sum += (dmg_left / r_factor);
                    if (!isNaN(ebR) && !isNaN(ebIdx) && !isNaN(ebHp) && ebR === tmp_r && ebIdx === tmp_idx) {
                        let dmgDoneToEndBoss = (score / env.scoreRatio) - dmgDealtToKilledBosses;
                        calculatedTotalHP = dmgDoneToEndBoss / (1 - (ebHp / 100));
                    }
                    dmg_left = 0;
                }
            }
            let effective_time = env.battleTime - (kills * env.transTime);
            let trueBaseDps = effective_time > 0 ? (effective_dmg_sum / effective_time) : 0;

            dataParams.push(`${ss[0].value},${ss[1].value},${ss[2].value},${score},${trueBaseDps.toFixed(2)},${ebR||''},${ebIdx||''},${ebHp||''},${calculatedTotalHP ? calculatedTotalHP.toFixed(2) : ''},${res1},${res2},${res3},${res4}`);
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
            let resText = resTd.innerText.replace(/\n/g, ' | '), finalScore = score ? `${t('實得分')}: ${score}` : resText;
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
                    if (pt[i][0]) { ss[0].innerHTML = `<option value="${pt[i][0]}">${t(pt[i][0])}</option>`; ss[0].value = pt[i][0]; }
                    if (pt[i][1]) { ss[1].innerHTML = `<option value="${pt[i][1]}">${t(pt[i][1])}</option>`; ss[1].value = pt[i][1]; }
                    if (pt[i][2]) { ss[2].innerHTML = `<option value="${pt[i][2]}">${t(pt[i][2])}</option>`; ss[2].value = pt[i][2]; }
                }
            });
        }
    } catch(e) {}
    
    updateTracker(); 
    document.querySelectorAll('.tab-btn')[0].click();
    translateDOM(document.body);
}

initializeApp();
