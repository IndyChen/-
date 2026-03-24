// ==========================================
// 檔案：data_manager.js
// 職責：Base85 高密度壓縮引擎、本機資料庫管理、純資料層 API (拒絕 DOM 操作)
// ==========================================

const SAFE_BASE85 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";
const BASE = BigInt(85);

// ==========================================
// --- 1. 高密度加解密引擎 (Base85) ---
// ==========================================
function encodeBase85(bytes) {
    if (bytes.length === 0) return "";
    let hex = "0x";
    for(let i=0; i<bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
    let num = BigInt(hex);
    let str = "";
    while (num > 0n) {
        str = SAFE_BASE85[Number(num % BASE)] + str;
        num = num / BASE;
    }
    let leadingZeros = 0;
    for(let i=0; i<bytes.length; i++) {
        if (bytes[i] === 0) leadingZeros++; else break;
    }
    for(let i=0; i<leadingZeros; i++) str = SAFE_BASE85[0] + str;
    return str;
}

function decodeBase85(str) {
    if (str.length === 0) return new Uint8Array(0);
    let num = 0n;
    let leadingZeros = 0;
    let countingZeros = true;
    for(let i=0; i<str.length; i++) {
        if (countingZeros && str[i] === SAFE_BASE85[0]) leadingZeros++;
        else countingZeros = false;
        num = (num * BASE) + BigInt(SAFE_BASE85.indexOf(str[i]));
    }
    let hex = num.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    let bytes = [];
    for(let i=0; i<leadingZeros; i++) bytes.push(0);
    for(let i=0; i<hex.length; i+=2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
}

// ==========================================
// --- 2. 全域資料庫管理與儲存容量 API ---
// ==========================================
function getStorageUsageKB() {
    let total = 0;
    try {
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key) && key.startsWith('ww_')) {
                total += ((localStorage[key].length + key.length) * 2);
            }
        }
    } catch (e) { return 0; }
    return (total / 1024).toFixed(1);
}

function clearDataCategoryStorage(category) {
    if (category === 'roster') {
        localStorage.removeItem('ww_roster');
        localStorage.removeItem('ww_rotations');
        ownedCharacters.clear();
        checkedRotations.clear();
    } else if (category === 'env') {
        localStorage.removeItem('ww_env_dom_state');
        localStorage.removeItem('ww_skill_slider');
        localStorage.removeItem('ww_display_count');
    } else if (category === 'lineups') {
        localStorage.removeItem('ww_saved_lineups');
        savedLineups = [];
    } else if (category === 'hp') {
        localStorage.removeItem('ww_boss_hp');
        localStorage.removeItem('ww_boss_hp_history');
        bossHPMap = {};
        bossHPHistory = {};
    }
}

function factoryResetStorage() {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('ww_')) {
            localStorage.removeItem(key);
        }
    });
}

function exportGlobalData(currentEnv) {
    let data = {
        roster: [...ownedCharacters],
        rotations: [...checkedRotations],
        customStats: customStatsMap,
        bossHp: bossHPHistory,
        customTeams: customRotations,
        savedLineups: savedLineups,
        bossHPMap: bossHPMap,
        envSettings: currentEnv || {}
    };
    return typeof safeEncodeB64 === 'function' ? safeEncodeB64(JSON.stringify(data)) : btoa(encodeURIComponent(JSON.stringify(data)));
}

function importGlobalData(code) {
    let jsonStr = typeof safeDecodeB64 === 'function' ? safeDecodeB64(code) : decodeURIComponent(atob(code));
    let data = JSON.parse(jsonStr);
    
    if(data.roster) safeStorageSet('ww_roster', data.roster);
    if(data.rotations) safeStorageSet('ww_rotations', data.rotations);
    if(data.customStats) safeStorageSet('ww_custom_stats', data.customStats);
    if(data.bossHp) safeStorageSet('ww_boss_hp_history', data.bossHp);
    if(data.customTeams) safeStorageSet('ww_custom_rotations_v2', data.customTeams);
    if(data.savedLineups) safeStorageSet('ww_saved_lineups', data.savedLineups);
    if(data.bossHPMap) safeStorageSet('ww_boss_hp', data.bossHPMap);
    
    return data; // 回傳給 UI 層去套用畫面
}

// ==========================================
// --- 3. 排軸與編隊資料庫 API (Data Management API) ---
// ==========================================

// 儲存/新增一筆自訂排軸資料 (由 UI 層呼叫)
function saveCustomRotationData(c1, c2, c3, dps, diff, duration, totalDmg, gridData, curvePoints, rotName = "自訂") {
    let newId = Date.now();
    let internalId = 'custom_rot_' + newId;

    // 1. 更新自訂排軸清單
    let newRot = { id: newId, c1: c1, c2: c2, c3: c3, dps: dps, rot: rotName, diff: diff, duration: duration, totalDmg: totalDmg, gridData: gridData };
    customRotations.push(newRot);
    safeStorageSet('ww_custom_rotations_v2', customRotations);

    // 2. 注入全局 dpsData 供沙盤運算
    let genVal = (typeof charData !== 'undefined' && charData[getBase(c1)]) ? charData[getBase(c1)].gen : 1;
    dpsData.push({ id: internalId, c1: c1, c2: c2, c3: c3, dps: dps, rot: rotName, diff: diff, gen: genVal, isUserCustom: true, duration: duration, totalDmg: totalDmg });

    // 3. 更新特徵點曲線與穩定度設定
    let diffKey = diff.includes('⚠️') ? '⚠️' : diff.includes('⭐') ? '⭐' : diff.includes('🔵') ? '🔵' : diff.includes('🟩') ? '🟩' : '🧩';
    customStatsMap[internalId] = {
        dps: dps,
        stability: typeof diffStability !== 'undefined' ? (diffStability[diffKey] || 100) : 100,
        buff: 0,
        curveK: null,
        curvePoints: curvePoints || []
    };
    safeStorageSet('ww_custom_stats', customStatsMap);

    // 4. 自動勾選該排軸並解鎖對應角色
    checkedRotations.add(internalId);
    safeStorageSet('ww_rotations', [...checkedRotations]);
    
    ownedCharacters.add(getBase(c1));
    ownedCharacters.add(getBase(c2));
    ownedCharacters.add(getBase(c3));
    safeStorageSet('ww_roster', [...ownedCharacters]);

    return internalId;
}

// 刪除一筆自訂排軸資料
function deleteCustomRotationData(index) {
    let cr = customRotations.splice(index, 1)[0];
    if (!cr) return false;

    safeStorageSet('ww_custom_rotations_v2', customRotations);
    dpsData = dpsData.filter(d => d.id !== 'custom_rot_' + cr.id);

    if (customStatsMap['custom_rot_' + cr.id]) {
        delete customStatsMap['custom_rot_' + cr.id];
        safeStorageSet('ww_custom_stats', customStatsMap);
    }
    return true;
}

// 刪除記憶編隊資料
function deleteSavedLineupData(index) {
    savedLineups.splice(index, 1);
    safeStorageSet('ww_saved_lineups', savedLineups);
}

// 刪除 Boss 校正血量資料
function deleteCalibratedHPData(key) {
    delete bossHPMap[key];
    safeStorageSet('ww_boss_hp', bossHPMap);
}