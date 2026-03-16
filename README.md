# 🌊 鳴潮矩陣編隊工具 (Wuthering Waves Doubled Pawns Matrix Team Builder)

![Version](https://img.shields.io/badge/version-v4.7.2-blue.svg)
![Platform](https://img.shields.io/badge/platform-Web_Browser-success.svg)
![Tech Stack](https://img.shields.io/badge/tech-HTML_|_CSS_|_JS-orange.svg)
![License](https://img.shields.io/badge/license-CC_BY--NC--SA_4.0-green.svg)

專為《鳴潮》(Wuthering Waves)「矩陣疊兵」模式設計的純前端開源編隊與 DPS 計算輔助工具。**。
不僅提供全角色的配隊數據查閱，更內建了 **「手法穩定性檢測」** 與 **「貪婪演算法一鍵編隊」**，幫助玩家在有限的角色池與疲勞值內，找出最適合自己手感的極限通關陣容！

🌐 **[點此直接使用工具 (Live Demo)](https://indychen.github.io/DPM-Team-Builder/)**

---

聲明:本專案在v4.6.3後雖使用了google analytics工具追蹤網頁使用量，但不會有增設廣告之未來動作。

---

## ✨ 核心特色功能 (Key Features)

### 🤖 智能一鍵編隊 (Auto-Build Engine)
不再為安排角色疲勞值傷腦筋！只要勾選你擁有的角色與會打的排軸，點擊「🔥 一鍵編制」，系統將透過**貪婪演算法**，自動為你配置出容錯率最高、DPS 最大的陣容，並將最強隊伍**完美壓軸置底**。

### 🎯 實戰手法折損系統 (Combat Stability & Loss System)
紙上談兵的 11萬 DPS 極限軸，實戰中真的打得出來嗎？
- 系統針對不同排軸難度（⚠️極難、⭐進階、🔵中等、🟩輪椅、🧩非主流）設定了專屬的**失誤懲罰權重**。
- 透過調整「操作達成率」，系統會動態展示極限軸在失誤時的 DPS 暴跌，並推薦更適合你手感的穩定陣容。

### ⏱️ 內建軸穩定性計算器 (Rotation Stability Calculator)
結合統計學檢定，玩家可輸入自己打樁的「基準理論耗時」與「多次實測耗時」，系統將自動運算：
* **平均耗時**
* **節奏標準差 (σ)**
* **回歸擬合估算 (R²)**
* **綜合穩定性評分 (%) 與實戰評級 (SSS ~ C)**
算出你的穩定度後，可一鍵套用至全域 DPS 折損計算！

### ✍️ 專屬 DPS 覆寫與記憶 (Custom DPS & Local Storage)
嫌預設的 DPS 算得不準？點擊任何排軸旁的數值，即可手動灌入你親自按出來的「專屬 DPS」與「穩定度」，系統會自動存入瀏覽器本機記憶，並用你的專屬數據來執行一鍵最佳化排隊。

### 🌍 即時繁簡切換 (i18n Translation)
內建字典映射技術，無縫支援繁體/簡體中文切換，照顧不同語系的玩家需求。

---

## 🚀 快速上手 (How to Use)

1. **勾選擁有角色**：在頂部選單勾選你目前擁有的角色（支援星級、世代快速篩選）。
2. **配置實戰排軸**：
   * 在清單中勾選你會操作的排軸。
   * 利用「穩定性計算器」或「折損拉桿」設定你的操作達成率。
   * （可選）點擊排軸旁的數字輸入你的專屬 DPS。
3. **一鍵智能編隊**：點擊「🔥 一鍵編制」，取得最佳爬塔陣容！
4. **匯出分享**：點擊「📷 截圖分享」，將完美編排的矩陣圖存成圖片與社群分享。

---

## 🐛 報錯與意見回饋 (Feedback & Issues)
如果你發現工具中有 Bug，或是身為排軸大佬有更極限的 DPS 數據/新隊伍想提供，歡迎透過 [GitHub Issues](https://github.com/你的帳號/你的專案名稱/issues) 提交給我們！

---

## 📊 數據來源與鳴謝 (Credits)
* **數據庫設計與邏輯 (AI架構)**：由 AI 輔助架構與演算優化。
* **數據提供**：QuichilOvO、南邊
* **整理**：Kolton
---

## 📜 授權聲明 (License)

本專案採用 **[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-TW)** (姓名標示-非商業性-相同方式分享) 授權條款。

- **完全免費開源**：歡迎社群玩家自由 Fork、修改與分享。
- **嚴禁商業利用**：禁止將本專案用於任何形式的營利行為（包含但不限於販售、植入廣告或放入付費牆）。
- **允許自願性贊助**：在遵守非商業條款的前提下，衍生專案的貢獻者可放置個人的自願性贊助連結。






