// 周易六十四卦 App v3 — 含小象辭 + 日夜配色切換
(function () {
  "use strict";

  // ── DOM 參考 ────────────────────────────────────────
  const appEl       = document.getElementById("app");
  const headerTitle = document.getElementById("headerTitle");
  const backBtn     = document.getElementById("backBtn");
  const bottomNav   = document.getElementById("bottomNav");
  const themeBtn    = document.getElementById("themeBtn");
  const htmlEl      = document.documentElement;

  // ── 狀態 ────────────────────────────────────────────
  let selected = null;   // 目前卦號 1–64
  let tab      = "yao";  // yao | related | nuclear | bagong

  // ── 主題循環：auto → light → dark → auto ────────────
  const THEMES      = ["auto", "light", "dark"];
  const THEME_ICONS = { auto: "⊙", light: "☀", dark: "☾" };
  const THEME_KEY   = "iching-theme";

  let currentTheme = localStorage.getItem(THEME_KEY) || "auto";

  function applyTheme(t) {
    currentTheme = t;
    htmlEl.dataset.theme = t;
    themeBtn.textContent = THEME_ICONS[t];
    themeBtn.title = { auto:"跟隨系統", light:"日間模式", dark:"夜間模式" }[t];
    localStorage.setItem(THEME_KEY, t);
  }

  themeBtn.addEventListener("click", () => {
    const next = THEMES[(THEMES.indexOf(currentTheme) + 1) % THEMES.length];
    applyTheme(next);
  });

  applyTheme(currentTheme);

  // ── 資料索引 ────────────────────────────────────────
  const byBin = {};
  HEXAGRAMS.forEach(h => (byBin[h.bin] = h));
  const byNum = {};
  HEXAGRAMS.forEach(h => (byNum[h.n]   = h));

  function findByBin(bin) { return byBin[bin]; }

  // ── 錯綜複雜 ─────────────────────────────────────────
  function invert(bin)  { return bin.split("").map(b => b==="1"?"0":"1").join(""); }
  function flipRev(bin) { return bin.split("").reverse().join(""); }

  function getRelated(h) {
    return {
      erro: findByBin(invert(h.bin)),
      zong: findByBin(flipRev(h.bin)),
      fu:   findByBin(invert(flipRev(h.bin))),
    };
  }

  // ── 六爻三極卦 ───────────────────────────────────────
  function getNuclear(h) {
    const b = h.bin.split("");
    return [
      { label:"初～四爻 (123／234)", lo:[0,1,2], up:[1,2,3] },
      { label:"二～五爻 (234／345)", lo:[1,2,3], up:[2,3,4] },
      { label:"三～六爻 (345／456)", lo:[2,3,4], up:[3,4,5] },
    ].map(g => ({
      label: g.label,
      gua:   findByBin(g.lo.map(i=>b[i]).join("") + g.up.map(i=>b[i]).join("")),
    }));
  }

  // ── 八宮卦位（動態計算）─────────────────────────────
  const PURE = {
    乾:"111111", 震:"100100", 坎:"010010", 艮:"001001",
    坤:"000000", 巽:"011011", 離:"101101", 兌:"110110",
  };
  const WUXING = { 乾:"金",震:"木",坎:"水",艮:"土",坤:"土",巽:"木",離:"火",兌:"金" };
  const SHI_IDX  = [5,0,1,2,3,4,3,2];
  const YING_IDX = [2,3,4,5,0,1,0,5];
  const POS_NAMES = ["本宮","一世","二世","三世","四世","五世","遊魂","歸魂"];
  const YAO_POS   = ["初","二","三","四","五","上"];

  const BAGONG_MAP = {};
  (function buildBagongMap() {
    Object.keys(PURE).forEach(gong => {
      const b = PURE[gong].split("");
      let cur = PURE[gong];
      function rec(bin, idx) {
        BAGONG_MAP[bin] = { gong, wuxing:WUXING[gong],
          pos:POS_NAMES[idx], shi:SHI_IDX[idx], ying:YING_IDX[idx] };
      }
      rec(cur, 0);
      for (let i = 0; i < 5; i++) {
        const a = cur.split(""); a[i] = a[i]==="1"?"0":"1"; cur = a.join(""); rec(cur, i+1);
      }
      const yh = cur.split(""); yh[3]=b[3]; cur=yh.join(""); rec(cur,6);
      const gh = cur.split(""); gh[0]=b[0]; gh[1]=b[1]; gh[2]=b[2]; cur=gh.join(""); rec(cur,7);
    });
  })();

  function getBagong(h) { return BAGONG_MAP[h.bin]; }

  // ── 爻位輔助 ─────────────────────────────────────────
  function yaoLabel(idx, isYang) { return YAO_POS[idx] + (isYang?"九":"六"); }
  function stripYaoPrefix(t)     { return t.replace(/^[初二三四五上][九六]，/,""); }

  // ── 渲染：卦格列表 ──────────────────────────────────
  function renderGrid() {
    headerTitle.textContent = "周易六十四卦";
    backBtn.hidden = true;
    bottomNav.hidden = true;

    const cards = HEXAGRAMS.map(h => {
      const bg = getBagong(h);
      return `<div class="hcard" data-n="${h.n}">
        <div class="num">${h.n}</div>
        <div class="gua">${h.sym}</div>
        <div class="name">${h.name}</div>
        <div class="gong-tag">${bg ? bg.gong+"宮" : ""}</div>
      </div>`;
    }).join("");

    appEl.innerHTML = `
      <div class="search-bar">
        <input type="text" id="searchInput"
          placeholder="搜尋卦名、卦序或宮名，如：乾 / 坎宮 / 12" />
      </div>
      <div class="grid" id="hexGrid">${cards}</div>`;

    document.getElementById("hexGrid").addEventListener("click", e => {
      const c = e.target.closest(".hcard");
      if (c) selectHexagram(Number(c.dataset.n));
    });
    document.getElementById("searchInput").addEventListener("input", e => {
      filterGrid(e.target.value.trim());
    });
  }

  function filterGrid(q) {
    const grid = document.getElementById("hexGrid");
    if (!grid) return;
    grid.querySelectorAll(".hcard").forEach(c => {
      if (!q) { c.style.display = ""; return; }
      const h  = byNum[Number(c.dataset.n)];
      const bg = getBagong(h);
      const ok = h.name.includes(q) || String(h.n)===q || h.sym===q ||
                 (bg && (bg.gong+"宮").includes(q)) ||
                 (bg && bg.wuxing===q) || (bg && bg.pos===q);
      c.style.display = ok ? "" : "none";
    });
  }

  // ── 渲染：卦詳頁框架 ────────────────────────────────
  function renderDetail() {
    const h  = byNum[selected];
    const bg = getBagong(h);

    headerTitle.textContent = `${h.n}. ${h.name}`;
    backBtn.hidden  = false;
    bottomNav.hidden = false;
    bottomNav.querySelectorAll(".nav-btn").forEach(btn =>
      btn.classList.toggle("active", btn.dataset.tab === tab));

    const bagongBadges = bg ? `
      <div class="bagong-badges">
        <span class="bb bb-gong">${bg.gong}宮</span>
        <span class="bb bb-wx">${bg.wuxing}行</span>
        <span class="bb bb-pos">${bg.pos}</span>
        <span class="bb bb-shi">世：${YAO_POS[bg.shi]}爻</span>
        <span class="bb bb-ying">應：${YAO_POS[bg.ying]}爻</span>
      </div>` : "";

    const headHtml = `
      <div class="detail-head">
        <div class="symbol">${h.sym}</div>
        <div class="detail-head-body">
          <h2>${h.n}. ${h.name}</h2>
          ${bagongBadges}
          <div class="lines-meta">
            ${h.bin.split("").map((b,i) =>
              `<span class="${bg&&bg.shi===i?"shi-yao":""}${bg&&bg.ying===i?" ying-yao":""}"
              >${yaoLabel(i,b==="1")}:${b==="1"?"陽":"陰"}</span>`
            ).join("")}
          </div>
        </div>
      </div>`;

    let body = "";
    if      (tab === "yao")     body = renderYaoTab(h, bg);
    else if (tab === "related") body = renderRelatedTab(h);
    else if (tab === "nuclear") body = renderNuclearTab(h);
    else if (tab === "bagong")  body = renderBagongTab(h, bg);

    appEl.innerHTML = headHtml + body;
    bindDetailEvents();
  }

  // ── 分頁：爻辭（含小象辭）───────────────────────────
  function renderYaoTab(h, bg) {
    const rows = h.bin.split("").map((b, i) => {
      const isYang = b === "1";
      const label  = yaoLabel(i, isYang);
      const text   = stripYaoPrefix(h.yaos[i]);
      const xiao   = h.xiao && h.xiao[i] ? h.xiao[i] : null;
      const isShi  = bg && bg.shi  === i;
      const isYing = bg && bg.ying === i;
      const markers = (isShi  ? `<span class="yao-marker shi-m">世</span>`  : "") +
                      (isYing ? `<span class="yao-marker ying-m">應</span>` : "");
      const xiaoHtml = xiao
        ? `<div class="yao-xiao"><span class="xiao-prefix">《象》</span>${xiao}</div>`
        : "";
      return `<div class="yao-row">
        <div class="yao-main">
          <span class="yao-label">${label}</span>
          <span class="yao-text">${text}</span>
          <span class="yao-markers">${markers}</span>
        </div>
        ${xiaoHtml}
      </div>`;
    }).join("");

    return `
      <div class="section">
        <div class="section-title">卦辭</div>
        <div class="judgment">${h.judgment}</div>
      </div>
      <div class="section">
        <div class="section-title">大象辭</div>
        <div class="judgment">${h.xiang}</div>
      </div>
      <div class="section">
        <div class="section-title">爻辭與小象辭
          <span class="shi-legend">
            <span class="yao-marker shi-m">世</span>世爻
            <span class="yao-marker ying-m">應</span>應爻
          </span>
        </div>
        ${rows}
      </div>`;
  }

  // ── 分頁：錯綜複雜 ──────────────────────────────────
  function relCardHtml(g, tagLabel, showYao) {
    if (!g) return `<div class="empty">同體（無對應卦）</div>`;
    const gbg = getBagong(g);
    const gbadges = gbg
      ? `<span class="rel-bb">${gbg.gong}宮</span>
         <span class="rel-bb">${gbg.wuxing}行</span>
         <span class="rel-bb">${gbg.pos}</span>`
      : "";
    let yaoHtml = "";
    if (showYao) {
      const rows = g.bin.split("").map((b,i) => {
        const label  = yaoLabel(i, b==="1");
        const text   = stripYaoPrefix(g.yaos[i]);
        const xiao   = g.xiao && g.xiao[i] ? g.xiao[i] : null;
        const isShi  = gbg && gbg.shi  === i;
        const isYing = gbg && gbg.ying === i;
        const m = (isShi  ? `<span class="yao-marker shi-m">世</span>`  : "") +
                  (isYing ? `<span class="yao-marker ying-m">應</span>` : "");
        const xiaoHtml = xiao
          ? `<div class="rel-yao-xiao">《象》${xiao}</div>` : "";
        return `<div class="rel-yao-row">
          <span class="rel-yao-lbl">${label}</span>
          <div style="flex:1"><span>${text}</span>${m}${xiaoHtml}</div>
        </div>`;
      }).join("");
      yaoHtml = `<div class="rel-yao">${rows}</div>`;
    }
    return `
      <div class="rel-card" data-n="${g.n}">
        <div class="rel-header">
          <span class="rel-gua">${g.sym}</span>
          <div>
            <span class="rel-name">${g.n}. ${g.name}</span>
            <span class="rel-tag">${tagLabel}</span>
            <div class="rel-bagong-row">${gbadges}</div>
            <div class="rel-meta">點擊查看詳情</div>
          </div>
        </div>
        <div class="rel-judgment">${g.judgment}</div>
        ${yaoHtml}
      </div>`;
  }

  function renderRelatedTab(h) {
    const { erro, zong, fu } = getRelated(h);
    return `
      <div class="section">
        <div class="section-title">錯卦（陰陽相錯，逐爻變）</div>
        ${relCardHtml(erro, "錯卦", true)}
      </div>
      <div class="section">
        <div class="section-title">綜卦（上下顛倒）</div>
        ${relCardHtml(zong, "綜卦", false)}
      </div>
      <div class="section">
        <div class="section-title">複雜卦（錯綜合體）</div>
        ${relCardHtml(fu, "複雜卦", false)}
      </div>`;
  }

  // ── 分頁：六爻三極卦 ────────────────────────────────
  function renderNuclearTab(h) {
    const cards = getNuclear(h).map(item => {
      const g = item.gua;
      if (!g) return `
        <div class="nuc-card">
          <div class="nuc-body">
            <div class="nuc-label">${item.label}</div>
            <div class="empty">無對應卦</div>
          </div>
        </div>`;
      const gbg = getBagong(g);
      const gbadges = gbg
        ? `<span class="rel-bb" style="font-size:10px">${gbg.gong}宮</span>
           <span class="rel-bb" style="font-size:10px">${gbg.pos}</span>`
        : "";
      const judgePreview = g.judgment.length > 36
        ? g.judgment.slice(0,36) + "…" : g.judgment;
      return `
        <div class="nuc-card" data-n="${g.n}">
          <div class="nuc-sym">${g.sym}</div>
          <div class="nuc-body">
            <div class="nuc-label">${item.label}</div>
            <div class="nuc-name">${g.n}. ${g.name} ${gbadges}</div>
            <div class="nuc-judge">${judgePreview}</div>
          </div>
        </div>`;
    }).join("");
    return `
      <div class="section">
        <div class="section-title">六爻三極卦（依爻位取三組互卦）</div>
        <div class="nuclear-grid">${cards}</div>
      </div>`;
  }

  // ── 分頁：八宮卦位 ──────────────────────────────────
  function renderBagongTab(h, bg) {
    if (!bg) return `<div class="empty">無八宮資料</div>`;
    const pureBin = PURE[bg.gong];
    const gongHexs = POS_NAMES.map(pos => {
      const entry = Object.entries(BAGONG_MAP).find(([,v]) =>
        v.gong === bg.gong && v.pos === pos);
      return entry ? findByBin(entry[0]) : null;
    });
    const rows = gongHexs.map((g,i) => {
      if (!g) return "";
      const cur = g.n === h.n;
      return `
        <div class="bgrow ${cur?"bgrow-current":""}" data-n="${g.n}">
          <div class="bgrow-pos">${POS_NAMES[i]}</div>
          <div class="bgrow-gua">${g.sym}</div>
          <div class="bgrow-name">${g.n}. ${g.name}</div>
          <div class="bgrow-meta">世:${YAO_POS[SHI_IDX[i]]}爻 應:${YAO_POS[YING_IDX[i]]}爻</div>
        </div>`;
    }).join("");
    const wxDesc = {
      金:"主肅殺收斂，對應秋季，性剛烈而具決斷",
      木:"主生長升發，對應春季，性仁慈而具生機",
      水:"主潤下藏納，對應冬季，性智慧而具流通",
      火:"主炎上明照，對應夏季，性禮儀而具光明",
      土:"主敦厚承載，對應四季末，性信義而具包容",
    };
    return `
      <div class="section">
        <div class="section-title">本卦八宮資訊</div>
        <div class="bagong-info-grid">
          <div class="bi-item"><span class="bi-lbl">所屬宮</span><span class="bi-val">${bg.gong}宮</span></div>
          <div class="bi-item"><span class="bi-lbl">五行</span><span class="bi-val wx-${bg.wuxing}">${bg.wuxing}</span></div>
          <div class="bi-item"><span class="bi-lbl">卦位</span><span class="bi-val">${bg.pos}</span></div>
          <div class="bi-item"><span class="bi-lbl">世爻</span><span class="bi-val shi-val">${YAO_POS[bg.shi]}爻</span></div>
          <div class="bi-item"><span class="bi-lbl">應爻</span><span class="bi-val ying-val">${YAO_POS[bg.ying]}爻</span></div>
        </div>
        <div class="wx-desc">${wxDesc[bg.wuxing]||""}</div>
      </div>
      <div class="section">
        <div class="section-title">${bg.gong}宮八卦序列（點擊可跳轉）</div>
        <div class="bagong-list">${rows}</div>
      </div>`;
  }

  // ── 事件綁定 ────────────────────────────────────────
  function bindDetailEvents() {
    appEl.querySelectorAll(".rel-card[data-n], .nuc-card[data-n], .bgrow[data-n]")
      .forEach(el => {
        el.addEventListener("click", () => {
          selectHexagram(Number(el.dataset.n));
          tab = "yao";
        });
      });
  }

  // ── 導覽 ────────────────────────────────────────────
  function selectHexagram(n) { selected=n; tab="yao"; render(); appEl.scrollTop=0; }
  function goBack()  { selected=null; render(); }
  function setTab(t) { tab=t; render(); }

  function render() {
    if (selected === null) renderGrid();
    else renderDetail();
  }

  backBtn.addEventListener("click", goBack);
  bottomNav.addEventListener("click", e => {
    const btn = e.target.closest(".nav-btn");
    if (btn) setTab(btn.dataset.tab);
  });

  window.IChing = { selectHexagram, goBack, setTab, HEXAGRAMS, byNum, BAGONG_MAP, applyTheme };
  render();
})();
