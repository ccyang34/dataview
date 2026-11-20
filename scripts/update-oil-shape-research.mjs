#!/usr/bin/env node
/**
 * 油脂主力合约「先扬后抑形态」探索研究数据更新脚本
 *
 * 把对话中的完整探索链固化为可复现数据：
 *  1. 形态验证：44 个合约年是否普遍"先走高再走低"
 *  2. 形态分组：早顶型 / 晚顶型 / 中间型的收益差异
 *  3. 早期走势预判检验：前 3/5/7/10/20 日等特征的 AUC（是否=抛硬币）
 *  4. 期初价历史分位信号：分档晚顶率 + 置换检验 p 值 + 分品种验证
 *  5. 7→8 月跳涨：09 合约逐年 7 月末→8 月末涨幅
 *  6. 2705 预判：11 月代理价校准、当前分位、05 合约形态演变结构性信号
 *
 * 历史规律部分从 soybean-oil-y01.json / palm-oil-p01.json 计算（确定性）；
 * 2705 部分实时拉新浪日线，失败时用观测兜底值（OBSERVED_*）。
 * 输出: src/data/oil-shape-research.json
 *
 * 由 .github/workflows/oil-shape-research-update.yml 定时/手动调用。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "src", "data", "oil-shape-research.json");
const SOY = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/soybean-oil-y01.json"), "utf-8"));
const PALM = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/palm-oil-p01.json"), "utf-8"));
const D = { 豆油: SOY, 棕榈油: PALM };
const CT = ["01", "05", "09"];

const round = (v, n = 2) => (v == null || Number.isNaN(v) ? null : Math.round(v * 10 ** n) / 10 ** n);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// 兜底观测值（2026-11-19 拉取，新浪不可达时用）
const OBSERVED = {
  Y2705: { price: 8159, high: 9060, low: 7990, asof: "2026-11-19",
    proxies: { "2005": 6394, "2105": 7542, "2205": 8990, "2305": 8600, "2405": 7980, "2505": 7918, "2605": 8050 } },
  P2705: { price: 8985, high: 10851, low: 8985, asof: "2026-11-19",
    proxies: { "2005": 5826, "2105": 6448, "2205": 8744, "2305": 7930, "2405": 7626, "2505": 9210, "2605": 8772 } },
};

async function fetchDaily(sym) {
  const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_${sym}=/InnerFuturesNewService.getDailyKLine?symbol=${sym}&_=${Date.now()}`;
  const headers = { "User-Agent": "Mozilla/5.0", "Referer": "https://finance.sina.com.cn/", "Accept": "*/*" };
  try {
    const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(12000) });
    const text = await res.text();
    const m = text.match(/=\s*\((\[[\s\S]*?\])\)/);
    if (!m) return [];
    const arr = JSON.parse(m[1]);
    if (!Array.isArray(arr)) return [];
    return arr.map((it) => ({ d: String(it.d), c: parseFloat(it.c), p: parseFloat(it.p) })).filter((x) => x.d && !Number.isNaN(x.c));
  } catch (e) {
    console.warn(`  ${sym} 拉取失败: ${e.message}`);
    return [];
  }
}

/** 构造每合约年记录 + 逐日绝对价序列 */
function buildRows() {
  const rows = [];
  for (const [oil, d] of Object.entries(D)) {
    for (const ct of CT) {
      const daily = d.types[ct].daily.series;
      for (const s of d.types[ct].series) {
        const dd = daily.find((x) => x.symbol === s.symbol);
        const ab = (dd?.abs || []).filter((v) => v != null);
        if (!ab.length) continue;
        const n = ab.length;
        const pos = n > 1 ? Math.round((s.peak_days / (n - 1)) * 100) : 0;
        const tag = pos < 50 ? "早顶" : pos >= 80 ? "晚顶" : "中间";
        const fall = round(s.peak_pct - s.win_daily_pct, 2);
        rows.push({
          oil, ct, sym: s.symbol, year: s.deliver_year, pos, tag,
          peak: s.peak_pct, end: s.win_daily_pct, fall,
          startPrice: s.start_price,
          // 早期特征（前 N 日相对开盘）
          r3: round(ab[Math.min(3, n - 1)] / ab[0] - 1, 4),
          r5: round(ab[Math.min(5, n - 1)] / ab[0] - 1, 4),
          r7: round(ab[Math.min(7, n - 1)] / ab[0] - 1, 4),
          r10: round(ab[Math.min(10, n - 1)] / ab[0] - 1, 4),
          r20: round(ab[Math.min(20, n - 1)] / ab[0] - 1, 4),
          hi10: round(Math.max(...ab.slice(0, Math.min(11, n))) / ab[0] - 1, 4),
          lo10: round(Math.min(...ab.slice(0, Math.min(11, n))) / ab[0] - 1, 4),
          broke10: Math.min(...ab.slice(1, Math.min(11, n))) < ab[0] ? 1 : 0,
          up10: round(ab.slice(1, Math.min(11, n)).filter((v, i) => v > ab.slice(0, Math.min(10, n))[i]).length / Math.max(1, Math.min(10, n - 1)), 4),
          amp20: round((Math.max(...ab.slice(0, Math.min(21, n))) - Math.min(...ab.slice(0, Math.min(21, n)))) / ab[0], 4),
          vol20: (() => {
            const seg = ab.slice(0, Math.min(21, n));
            const rets = [];
            for (let i = 1; i < seg.length; i++) rets.push(seg[i] / seg[i - 1] - 1);
            const m = mean(rets);
            return round(Math.sqrt(mean(rets.map((r) => (r - m) ** 2))), 4);
          })(),
        });
      }
    }
  }
  // 期初价历史分位（同品种同合约组内）
  for (const oil of Object.keys(D)) {
    for (const ct of CT) {
      const grp = rows.filter((r) => r.oil === oil && r.ct === ct);
      const prices = grp.map((r) => r.startPrice);
      grp.forEach((r) => { r.startPct = round(prices.filter((p) => p < r.startPrice).length / prices.length, 4); });
    }
  }
  return rows;
}

/**
 * 持仓量二次分析：把每日持仓序列(p)并到形态样本上。
 * 关键区分：
 *  - 持仓"生命周期曲线"(先增仓→临近交割减仓)与形态几乎无关，早期持仓不能预判；
 *  - "期初持仓同比"(新合约相对上一交割年同合约的期初持仓)是独立的事前信号；
 *  - "价格高点时的持仓水位"区分力极强，但本质是高点出现时间的代理，属事后确认。
 */
function attachOiFeatures(rows) {
  let ok = 0;
  for (const [oil, d] of Object.entries(D)) {
    for (const ct of CT) {
      const ddMap = new Map(d.types[ct].daily.series.map((x) => [x.symbol, x]));
      const sMap = new Map(d.types[ct].series.map((x) => [x.symbol, x]));
      const grp = rows.filter((r) => r.oil === oil && r.ct === ct);
      for (const r of grp) {
        const dd = ddMap.get(r.sym), s = sMap.get(r.sym);
        if (!dd || !Array.isArray(dd.oi) || !s) continue;
        const P = dd.abs.map((p, i) => ({ p, o: dd.oi[i], d: dd.dates[i] }))
          .filter((x) => x.p != null && x.o != null && x.o > 0);
        if (P.length < 30) continue;
        const n = P.length, o0 = P[0].o;
        const curve = Array.from({ length: 21 }, (_, k) => round(P[Math.round(k / 20 * (n - 1))].o / o0 * 100, 1));
        let maxI = 0;
        P.forEach((x, i) => { if (x.o > P[maxI].o) maxI = i; });
        let pi = P.findIndex((x) => x.d === s.peak_date);
        if (pi < 0) pi = Math.min(s.peak_days ?? 0, n - 1);
        Object.assign(r, {
          oiStart: Math.round(o0),
          oiAtPeak: round((P[pi].o / o0 - 1) * 100, 1),      // 价格高点日持仓 vs 起点
          oiChg: round((P[n - 1].o / o0 - 1) * 100, 1),        // 全程持仓变化
          oiEarly20: round((P[Math.min(19, n - 1)].o / o0 - 1) * 100, 1),
          oiPeakProg: round(maxI / (n - 1) * 100, 0),          // 持仓峰出现在窗口的进度
          oiLag: maxI - pi,                                    // 持仓峰相对价格峰的交易日差
          oiCurve: curve,
        });
        ok++;
      }
      // 期初持仓的历史分位与同比（同品种同合约逐年）
      const withOi = grp.filter((r) => r.oiStart != null).sort((a, b) => a.year - b.year);
      const vals = withOi.map((r) => r.oiStart);
      withOi.forEach((r, i) => {
        r.oiStartPct = round(vals.filter((v) => v < r.oiStart).length / vals.length * 100, 0);
        r.oiYoy = i > 0 ? round((r.oiStart / withOi[i - 1].oiStart - 1) * 100, 1) : null;
      });
    }
  }
  return ok;
}

/**
 * 持仓深度辨析：把「早顶持仓是否高于历史同期」追问拆成三个可证伪的口径。
 *  1. 同比（vs 上一交割年同合约起点） vs 历史分位（同品种同合约排位）——两个「同期」定义答案相反；
 *  2. 顶部同一日历日 vs 去年同日的持仓同比——分母在临近交割时坍缩，属伪信号；
 *  3. 持仓峰进度与持仓峰−价格峰先后——持仓峰节奏两组一致，差异来自价格峰位置。
 */
function oiDeepDive(rows) {
  const pct0 = (v) => `${v > 0 ? "+" : ""}${Math.round(v)}%`;
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const aucEO = (rs, key) => {
    const e = rs.filter((r) => r.tag === "早顶" && r[key] != null).map((r) => r[key]);
    const l = rs.filter((r) => r.tag === "晚顶" && r[key] != null).map((r) => r[key]);
    if (!e.length || !l.length) return null;
    let w = 0;
    for (const a of e) for (const b of l) w += a > b ? 1 : a === b ? 0.5 : 0;
    return round(w / (e.length * l.length), 3);
  };
  const tagged = rows.filter((r) => (r.tag === "早顶" || r.tag === "晚顶") && r.oiStart != null);
  const E0 = tagged.filter((r) => r.tag === "早顶"), L0 = tagged.filter((r) => r.tag === "晚顶");

  // ---- 1. 两个「历史同期」口径 ----
  const eY = E0.filter((r) => r.oiYoy != null), lY = L0.filter((r) => r.oiYoy != null);
  const eP = E0.filter((r) => r.oiStartPct != null), lP = L0.filter((r) => r.oiStartPct != null);
  const caliber = {
    rows: [
      { label: "A 期初持仓同比（vs 上一年同合约起点）",
        early: { n: eY.length, avg: round(mean(eY.map((r) => r.oiYoy)), 1), pos: eY.filter((r) => r.oiYoy > 0).length },
        late: { n: lY.length, avg: round(mean(lY.map((r) => r.oiYoy)), 1), pos: lY.filter((r) => r.oiYoy > 0).length },
        auc: aucEO(tagged, "oiYoy"), verdict: "成立：早顶显著增仓启动" },
      { label: "B 期初持仓历史分位（7–8 年排位）",
        early: { n: eP.length, avg: round(mean(eP.map((r) => r.oiStartPct)), 1), pos: eP.filter((r) => r.oiStartPct >= 65).length },
        late: { n: lP.length, avg: round(mean(lP.map((r) => r.oiStartPct)), 1), pos: lP.filter((r) => r.oiStartPct >= 65).length },
        auc: aucEO(tagged, "oiStartPct"), verdict: "基本不成立：仅略偏高位" },
    ],
    posLabel: ["正增长数", "Q≥65% 数"],
    buckets: [[0, 35, "Q<35%"], [35, 50, "Q35–50%"], [50, 65, "Q50–65%"], [65, 101, "Q≥65%"]].map(([lo, hi, label]) => {
      const g = tagged.filter((r) => r.oiStartPct >= lo && r.oiStartPct < hi);
      const e = g.filter((r) => r.tag === "早顶").length;
      return { label, n: g.length, early: e, earlyRate: g.length ? round(e / g.length * 100, 0) : null };
    }),
    earlyDetail: E0.map((r) => `${r.sym} Q${r.oiStartPct}${r.oiYoy != null ? " 同比" + pct0(r.oiYoy) : ""}`),
    note: "同为「历史同期」，同比口径成立（早顶相对去年增仓 20%），历史排位口径判别力 AUC≈0.56、分档还不单调，不能当稳定信号。",
  };

  // ---- 2. 顶部同日历日同比（证伪） ----
  const same = [];
  for (const [oil, d] of Object.entries(D)) {
    for (const ct of CT) {
      const dm = new Map(d.types[ct].daily.series.map((x) => [x.deliver_year, x]));
      const sm = new Map(d.types[ct].series.map((x) => [x.deliver_year, x]));
      for (const r of tagged.filter((x) => x.oil === oil && x.ct === ct)) {
        const dd = dm.get(r.year), prev = dm.get(r.year - 1), s = sm.get(r.year);
        if (!dd || !prev || !s || !s.peak_date) continue;
        const mm = s.peak_date.slice(5);
        const i = dd.dates.findIndex((x) => x && x.slice(5) === mm);
        const j = prev.dates.findIndex((x) => x && x.slice(5) === mm);
        if (i < 0 || j < 0 || !dd.oi[i] || !prev.oi[j]) continue;
        const o0 = dd.oi.find((v) => v != null && v > 0);
        same.push({ ...r, peakDate: s.peak_date.slice(5),
          sameTimeYoy: round((dd.oi[i] / prev.oi[j] - 1) * 100, 1),
          selfPeak: round(dd.oi[i] / o0 * 100, 0),
          oiNow: dd.oi[i], oiPrev: prev.oi[j] });
      }
    }
  }
  const statCal = (key) => {
    const e = same.filter((r) => r.tag === "早顶" && r[key] != null), l = same.filter((r) => r.tag === "晚顶" && r[key] != null);
    return { early: { n: e.length, avg: round(mean(e.map((r) => r[key])), 1), pos: e.filter((r) => r[key] > 0).length },
      late: { n: l.length, avg: round(mean(l.map((r) => r[key])), 1), pos: l.filter((r) => r[key] > 0).length },
      auc: aucEO(same, key) };
  };
  const anomalies = same.filter((r) => r.tag === "晚顶" && r.sameTimeYoy > 100)
    .sort((a, b) => b.sameTimeYoy - a.sameTimeYoy).slice(0, 6)
    .map((r) => ({ sym: r.sym, peakDate: r.peakDate, oiNow: r.oiNow, oiPrev: r.oiPrev,
      yoy: r.sameTimeYoy, selfPeak: r.selfPeak }));
  const sameTime = {
    n: same.length, earlyN: same.filter((r) => r.tag === "早顶").length,
    lateN: same.filter((r) => r.tag === "晚顶").length,
    sameTimeYoy: statCal("sameTimeYoy"), startYoy: statCal("oiYoy"),
    anomalies, outlierCount: same.filter((r) => r.tag === "晚顶" && r.sameTimeYoy > 100).length,
    note: "顶部同日历日对齐会把交割前持仓枯竭误读成巨量增仓：晚顶组均值 +322%（分母极小），AUC=0.500 完全失效。持仓对比必须在流动性可比的窗口起点做。",
  };

  // ---- 3. 持仓峰的节奏 ----
  const pE = tagged.filter((r) => r.tag === "早顶" && r.oiPeakProg != null);
  const pL = tagged.filter((r) => r.tag === "晚顶" && r.oiPeakProg != null);
  const groupPeak = (g) => ({ n: g.length,
    oiProgAvg: round(mean(g.map((r) => r.oiPeakProg)), 1), oiProgMed: med(g.map((r) => r.oiPeakProg)),
    priceProgAvg: round(mean(g.map((r) => r.pos)), 1),
    lagAvg: round(mean(g.map((r) => r.oiLag)), 1),
    lagLater: g.filter((r) => r.oiLag > 0).length });
  const peakPos = {
    early: groupPeak(pE), late: groupPeak(pL),
    aucOiProg: aucEO(tagged, "oiPeakProg"), aucLag: aucEO(tagged, "oiLag"),
    note: "持仓峰进度两组都在窗口约 1/3 处（AUC≈0.50），不是早顶更早。真正拉开差距的是价格峰位置：晚顶价格峰拖到末端，持仓峰−价格峰差达 −64 个交易日，才造成「持仓先见顶」的观感。",
  };

  console.log("持仓深度辨析: 同比AUC", caliber.rows[0].auc, "分位AUC", caliber.rows[1].auc,
    "| 同刻AUC", sameTime.sameTimeYoy.auc, "| 持仓峰进度AUC", peakPos.aucOiProg, "峰差AUC", peakPos.aucLag);
  return { caliber, sameTime, peakPos };
}

/** 2705 当前持仓 vs 上一交割年 05 合约同期持仓（代理同比） */
async function fetchOiForecast() {
  const out = {};
  for (const [sym, prev] of [["Y2705", "Y2605"], ["P2705", "P2605"]]) {
    const [a, b] = await Promise.all([fetchDaily(sym), fetchDaily(prev)]);
    const cur = a.at(-1);
    const y = cur ? String(Number(cur.d.slice(0, 4)) - 1) : "";
    const mm = cur ? cur.d.slice(5, 7) : "";
    const base = b.filter((x) => x.d.startsWith(`${y}-${mm}`) && +x.d.slice(8, 10) >= 15 && +x.d.slice(8, 10) <= 21).at(-1) || b.at(-1);
    out[sym] = {
      oi: cur?.p ?? null,
      prevOi: base?.p ?? null,
      asof: cur?.d ?? null,
      prevDate: base?.d ?? null,
      yoy: cur?.p && base?.p ? round((cur.p / base.p - 1) * 100, 1) : null,
    };
    console.log(`  ${sym} 持仓代理: ${out[sym].oi} vs ${out[sym].prevOi} (${out[sym].prevDate}) → ${out[sym].yoy}%`);
  }
  return out;
}

/** 持仓量二次分析主计算 */
async function oiAnalysis(rows) {
  const core = rows.filter((r) => (r.tag === "早顶" || r.tag === "晚顶") && r.oiYoy != null);
  const E = core.filter((r) => r.tag === "早顶"), L = core.filter((r) => r.tag === "晚顶");
  const avgCurve = (g) => Array.from({ length: 21 }, (_, k) => round(mean(g.map((r) => r.oiCurve[k])), 1));
  const withOi = rows.filter((r) => r.oiCurve != null);

  // (1) 生命周期：持仓曲线本身能否预判？
  const earlyKeys = ["oiEarly20", "oiStartPct", "oiYoy"];
  const earlyAuc = {};
  earlyKeys.forEach((k) => { earlyAuc[k] = auc(core, k); });
  // oiYoy 已是百分数；除以 100 复用 permutationTest 的 pp 口径
  const perm = permutationTest(E.map((r) => r.oiYoy / 100), L.map((r) => r.oiYoy / 100));
  const loo = looAccuracy(core, "oiYoy");
  const byOil = {};
  for (const oil of Object.keys(D)) {
    const g = core.filter((r) => r.oil === oil);
    byOil[oil] = {
      n: g.length,
      auc: auc([...g.filter((r) => r.tag === "晚顶").map((r) => ({ tag: "晚顶", v: r.oiYoy })),
        ...g.filter((r) => r.tag === "早顶").map((r) => ({ tag: "早顶", v: r.oiYoy }))], "v"),
      earlyAvg: round(mean(g.filter((r) => r.tag === "早顶").map((r) => r.oiYoy)), 1),
      lateAvg: round(mean(g.filter((r) => r.tag === "晚顶").map((r) => r.oiYoy)), 1),
    };
  }
  const lifecycle = {
    axis: Array.from({ length: 21 }, (_, k) => k * 5),
    all: avgCurve(withOi),
    early: avgCurve(withOi.filter((r) => r.tag === "早顶")),
    late: avgCurve(withOi.filter((r) => r.tag === "晚顶")),
    earlyAuc, permutation: perm, loo,
    baseline: { hits: Math.max(E.length, L.length), total: core.length },
    byOil,
    earlyAvg: round(mean(E.map((r) => r.oiYoy)), 1),
    lateAvg: round(mean(L.map((r) => r.oiYoy)), 1),
    yearRho: spearman(core.map((r) => r.oiYoy), core.map((r) => r.year)),
    note: "持仓生命周期曲线（先快速增仓、临近交割减仓）在早/晚顶组几乎重合；前20日持仓变化 AUC≈0.5，不能预判。但期初持仓同比是独立信号：同比减少的合约多为晚顶。",
  };

  // (2) 价格高点时的持仓水位：事后确认
  const inc = core.filter((r) => r.oiAtPeak > 0), dec = core.filter((r) => r.oiAtPeak <= 0);
  const atPeak = {
    earlyAvg: round(mean(E.map((r) => r.oiAtPeak)), 1),
    lateAvg: round(mean(L.map((r) => r.oiAtPeak)), 1),
    auc: auc(core, "oiAtPeak"),
    inc: { n: inc.length, late: inc.filter((r) => r.tag === "晚顶").length },
    dec: { n: dec.length, late: dec.filter((r) => r.tag === "晚顶").length },
    oiPeakProgEarly: round(mean(E.map((r) => r.oiPeakProg)), 0),
    oiPeakProgLate: round(mean(L.map((r) => r.oiPeakProg)), 0),
    note: "高点持仓水位区分力极强，但持仓峰进度在两组几乎相同（约 1/3 窗口），说明这是「价格高点何时出现」的代理，属事后确认而非事前预判。",
  };

  // (3) 期初价分位 × 期初持仓同比 二维矩阵
  const matrix = [];
  for (const [qL, qLo, qHi] of [["低分位 <50%", 0, 0.5], ["高分位 ≥50%", 0.5, 1.01]]) {
    for (const [oL, oNeg] of [["持仓同比 <0（缩量）", true], ["持仓同比 ≥0（增量）", false]]) {
      const g = core.filter((r) => r.startPct >= qLo && r.startPct < qHi && (oNeg ? r.oiYoy < 0 : r.oiYoy >= 0));
      const late = g.filter((r) => r.tag === "晚顶").length;
      matrix.push({ q: qL, oi: oL, n: g.length, late, early: g.length - late,
        lateRate: g.length ? round(late / g.length * 100, 0) : null,
        avgEnd: g.length ? round(mean(g.map((r) => r.end)), 1) : null,
        syms: g.map((r) => r.sym) });
    }
  }

  console.log("持仓二次分析: core", core.length, "| 同比AUC", earlyAuc.oiYoy, "p", perm.pValue,
    "| LOO", `${loo.hits}/${loo.total}`, "| 高点持仓AUC", atPeak.auc);
  return { coverage: { total: rows.length, withOi: withOi.length, core: core.length },
    lifecycle, atPeak, matrix, forecast: await fetchOiForecast() };
}

function auc(rows, key) {
  const pos = rows.filter((r) => r.tag === "晚顶").map((r) => r[key]);
  const neg = rows.filter((r) => r.tag === "早顶").map((r) => r[key]);
  let w = 0;
  for (const p of pos) for (const n of neg) w += p > n ? 1 : p === n ? 0.5 : 0;
  return round(w / (pos.length * neg.length), 3);
}

// 固定种子 PRNG（可复现置换检验）
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function permutationTest(early, late, N = 20000) {
  const obs = mean(early) - mean(late);
  const all = [...early, ...late];
  const n1 = early.length;
  const rnd = mulberry32(42);
  let cnt = 0;
  for (let k = 0; k < N; k++) {
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    if (Math.abs(mean(all.slice(0, n1)) - mean(all.slice(n1))) >= Math.abs(obs)) cnt++;
  }
  return { diffPp: round(obs * 100, 1), pValue: round(cnt / N, 4), significant: cnt / N < 0.05, permutations: N };
}

/** 留一交叉验证：某特征阈值规则判早/晚顶的命中率 */
function looAccuracy(core, key) {
  const direction = auc(core, key) > 0.5 ? 1 : -1;
  const predict = (train, test) => {
    const vals = [...new Set(train.map((r) => r[key]))].sort((a, b) => a - b);
    const cands = vals.slice(0, -1).map((v, i) => (v + vals[i + 1]) / 2);
    let best = -1, bt = null;
    for (const th of cands) {
      const acc = train.filter((r) => ((direction * r[key] > direction * th) === (r.tag === "晚顶"))).length / train.length;
      if (acc > best) { best = acc; bt = th; }
    }
    return (direction * test[key] > direction * bt) === (test.tag === "晚顶");
  };
  let hits = 0;
  core.forEach((t, i) => { if (predict(core.filter((_, j) => j !== i), t)) hits++; });
  return { hits, total: core.length };
}

function spearman(a, b) {
  const rank = (arr) => {
    const idx = arr.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
    const r = new Array(arr.length);
    idx.forEach(([v, i], k) => { r[i] = k; });
    return r;
  };
  const ra = rank(a), rb = rank(b);
  const ma = mean(ra), mb = mean(rb);
  const num = ra.reduce((s, v, i) => s + (v - ma) * (rb[i] - mb), 0);
  const den = Math.sqrt(ra.reduce((s, v) => s + (v - ma) ** 2, 0) * rb.reduce((s, v) => s + (v - mb) ** 2, 0));
  return round(num / den, 3);
}

async function main() {
  const rows = buildRows();
  const core = rows.filter((r) => r.tag === "早顶" || r.tag === "晚顶");
  console.log(`构造合约年样本 ${rows.length} 条，早/晚顶核心 ${core.length} 条`);
  const oiN = attachOiFeatures(rows);
  console.log(`持仓序列并入 ${oiN} 条`);

  // ---- 1. 形态验证 ----
  const shapeValidation = {
    total: rows.length,
    peakBeforeEnd: rows.filter((r) => r.pos < 100).length,
    aboveStart: rows.filter((r) => r.peak > 0).length,
    pullback: rows.filter((r) => r.fall > 0).length,
    endAboveStart: rows.filter((r) => r.end > 0).length,
    byOil: {},
  };
  for (const oil of Object.keys(D)) {
    const g = rows.filter((r) => r.oil === oil);
    shapeValidation.byOil[oil] = {
      total: g.length,
      endAboveStart: g.filter((r) => r.end > 0).length,
    };
  }

  // ---- 2. 形态分组 ----
  const groupStat = (tag) => {
    const g = rows.filter((r) => r.tag === tag);
    return {
      count: g.length, share: round(g.length / rows.length * 100, 0),
      avgPos: round(mean(g.map((r) => r.pos)), 0),
      avgPeak: round(mean(g.map((r) => r.peak)), 1),
      avgEnd: round(mean(g.map((r) => r.end)), 1),
      avgFall: round(mean(g.map((r) => r.fall)), 1),
      endAbove: g.filter((r) => r.end > 0).length,
      endBelow: g.filter((r) => r.end <= 0).length,
    };
  };
  const shapeGroups = { early: groupStat("早顶"), late: groupStat("晚顶"), mid: groupStat("中间") };

  // ---- 3. 早期特征 AUC ----
  const featKeys = ["r3", "r5", "r7", "r10", "r20", "hi10", "lo10", "broke10", "up10", "amp20", "vol20", "startPct"];
  const aucMap = {};
  featKeys.forEach((k) => { aucMap[k] = auc(core, k); });
  const invalidFeats = ["r3", "r5", "r7", "r10", "r20", "hi10", "lo10", "broke10", "up10", "amp20", "vol20"];
  const bestInvalid = invalidFeats.reduce((a, b) => (Math.abs(aucMap[a] - 0.5) > Math.abs(aucMap[b] - 0.5) ? a : b));
  const loo = looAccuracy(core, bestInvalid);
  const earlyFeatures = {
    auc: aucMap,
    groupMeans: (() => {
      const o = {};
      featKeys.forEach((k) => {
        o[k] = {
          early: round(mean(core.filter((r) => r.tag === "早顶").map((r) => r[k])), 3),
          late: round(mean(core.filter((r) => r.tag === "晚顶").map((r) => r[k])), 3),
        };
      });
      return o;
    })(),
    bestInvalidFeature: bestInvalid,
    loo, baseline: { hits: Math.max(core.filter((r) => r.tag === "早顶").length, core.filter((r) => r.tag === "晚顶").length), total: core.length },
    lure: rows.filter((r) => r.r10 > 0.15 && r.end < 0).map((r) => ({ sym: r.sym, r10: round(r.r10 * 100, 1), end: r.end })),
  };

  // ---- 4. 期初价分位信号 ----
  const earlyP = core.filter((r) => r.tag === "早顶").map((r) => r.startPct);
  const lateP = core.filter((r) => r.tag === "晚顶").map((r) => r.startPct);
  const perm = permutationTest(earlyP, lateP);
  const bands = [
    { label: "低位 <35%", lo: 0, hi: 0.35 },
    { label: "中位 35–65%", lo: 0.35, hi: 0.65 },
    { label: "高位 >65%", lo: 0.65, hi: 1.01 },
  ].map((b) => {
    const g = core.filter((r) => r.startPct >= b.lo && r.startPct < b.hi);
    const late = g.filter((r) => r.tag === "晚顶").length;
    return { label: b.label, n: g.length, late, early: g.length - late,
      lateRate: g.length ? round(late / g.length * 100, 0) : 0,
      avgEnd: g.length ? round(mean(g.map((r) => r.end)), 1) : 0 };
  });
  const byOil = {};
  for (const oil of Object.keys(D)) {
    const g = core.filter((r) => r.oil === oil);
    const lo = g.filter((r) => r.startPct < 0.5), hi = g.filter((r) => r.startPct >= 0.5);
    byOil[oil] = {
      lowN: lo.length, lowLate: lo.filter((r) => r.tag === "晚顶").length,
      lowLateRate: lo.length ? round(lo.filter((r) => r.tag === "晚顶").length / lo.length * 100, 0) : 0,
      highN: hi.length, highLate: hi.filter((r) => r.tag === "晚顶").length,
      highLateRate: hi.length ? round(hi.filter((r) => r.tag === "晚顶").length / hi.length * 100, 0) : 0,
    };
  }
  const exceptions = core.filter((r) =>
    (r.startPct >= 0.65 && r.tag === "晚顶") || (r.startPct < 0.35 && r.tag === "早顶")
  ).map((r) => ({ sym: r.sym, q: round(r.startPct * 100, 0), tag: r.tag, peak: r.peak, end: r.end }));
  const quantileSignal = {
    earlyAvgQ: round(mean(earlyP) * 100, 0),
    lateAvgQ: round(mean(lateP) * 100, 0),
    permutation: perm,
    bands, byOil, exceptions,
    rule: "期初价历史分位低(<35%)→多为晚顶型、末涨为正；高(>65%)→多为早顶型、末涨≈0或负",
  };

  // ---- 5. 7→8 月跳涨（09 合约逐年） ----
  const years = SOY.types["09"].series.map((s) => s.deliver_year);
  const jumpSoy = SOY.types["09"].series.map((s) => round((s.norm[4] / s.norm[3] - 1) * 100, 1));
  const jumpPalm = PALM.types["09"].series.map((s) => round((s.norm[4] / s.norm[3] - 1) * 100, 1));
  const monthJump = {
    years, soy: jumpSoy, palm: jumpPalm,
    avgSoy: round(mean(jumpSoy), 1), avgPalm: round(mean(jumpPalm), 1),
    allPositive: [...jumpSoy, ...jumpPalm].every((v) => v > 0),
  };

  // ---- 6. 2705 预判 ----
  console.log("拉取 2705 实时数据...");
  const [yArr, pArr] = await Promise.all([fetchDaily("Y2705"), fetchDaily("P2705")]);
  const yLive = yArr.length ? { price: +yArr.at(-1).c.toFixed(0), high: +Math.max(...yArr.map((x) => x.c)).toFixed(0), low: +Math.min(...yArr.map((x) => x.c)).toFixed(0), asof: yArr.at(-1).d } : null;
  const pLive = pArr.length ? { price: +pArr.at(-1).c.toFixed(0), high: +Math.max(...pArr.map((x) => x.c)).toFixed(0), low: +Math.min(...pArr.map((x) => x.c)).toFixed(0), asof: pArr.at(-1).d } : null;

  // 历史 11 月代理价（校准用）
  async function proxies(oil) {
    const out = {};
    const prefix = oil === "豆油" ? "Y" : "P";
    for (const s of D[oil].types["05"].series) {
      const yy = s.deliver_year - 1;
      const arr = await fetchDaily(`${prefix}${String(s.deliver_year).slice(2)}05`);
      const cand = arr.filter((x) => x.d.startsWith(`${yy}-11-`) && +x.d.slice(8, 10) >= 15 && +x.d.slice(8, 10) <= 20);
      out[String(s.deliver_year).slice(2) + "05"] = cand.length ? +cand.at(-1).c.toFixed(0) : (OBSERVED[`${prefix}2705`].proxies[String(s.deliver_year).slice(2) + "05"] ?? null);
    }
    return out;
  }
  const proxySoy = await proxies("豆油");
  const proxyPalm = await proxies("棕榈油");

  // 起点价 vs 11 月代理价的分位排序相关性（校准）
  const startSoy = SOY.types["05"].series.map((s) => s.start_price);
  const startPalm = PALM.types["05"].series.map((s) => s.start_price);
  const calib = {
    soyRho: spearman(startSoy, SOY.types["05"].series.map((s) => proxySoy[String(s.deliver_year).slice(2) + "05"] ?? 0)),
    palmRho: spearman(startPalm, PALM.types["05"].series.map((s) => proxyPalm[String(s.deliver_year).slice(2) + "05"] ?? 0)),
  };

  const qOf = (proxyMap, price) => {
    const vals = Object.values(proxyMap).filter((v) => v != null);
    return round(vals.filter((v) => v < price).length / vals.length * 100, 0);
  };
  const yPrice = (yLive || OBSERVED.Y2705).price;
  const pPrice = (pLive || OBSERVED.P2705).price;
  const yQ = qOf(proxySoy, yPrice);
  const pQ = qOf(proxyPalm, pPrice);

  // 05 合约形态演变（结构信号）
  const structural = { years: [], soy: [], palm: [] };
  for (const s of SOY.types["05"].series) {
    structural.years.push(s.deliver_year);
    const r = rows.find((x) => x.oil === "豆油" && x.sym === s.symbol);
    structural.soy.push({ tag: r?.tag, pos: r?.pos, end: r?.end });
  }
  for (const s of PALM.types["05"].series) {
    const r = rows.find((x) => x.oil === "棕榈油" && x.sym === s.symbol);
    structural.palm.push({ tag: r?.tag, pos: r?.pos, end: r?.end });
  }
  structural.lateYears = structural.years.filter((y, i) => structural.soy[i]?.tag === "晚顶" || structural.palm[i]?.tag === "晚顶");
  structural.noLateSince = Math.max(...structural.years.filter((y, i) => structural.soy[i]?.tag === "晚顶" || structural.palm[i]?.tag === "晚顶")) + 1;

  const forecast = {
    calibration: calib,
    isProxy: !yLive || !pLive,
    contracts: {
      Y2705: {
        price: yPrice, high: (yLive || OBSERVED.Y2705).high, low: (yLive || OBSERVED.Y2705).low,
        asof: (yLive || OBSERVED.Y2705).asof, quantile: yQ,
        offHigh: round((yPrice / (yLive || OBSERVED.Y2705).high - 1) * 100, 1),
        proxies: proxySoy,
        verdict: yQ > 65 ? "早顶" : yQ < 35 ? "晚顶" : "中间",
      },
      P2705: {
        price: pPrice, high: (pLive || OBSERVED.P2705).high, low: (pLive || OBSERVED.P2705).low,
        asof: (pLive || OBSERVED.P2705).asof, quantile: pQ,
        offHigh: round((pPrice / (pLive || OBSERVED.P2705).high - 1) * 100, 1),
        proxies: proxyPalm,
        verdict: pQ > 65 ? "早顶" : pQ < 35 ? "晚顶" : "中间",
      },
    },
    structural,
    verdict: (yQ > 65 && pQ > 65) ? "早顶" : (yQ < 35 && pQ < 35) ? "晚顶" : "分化",
    caveat: "窗口12月才开始，当前用11月中旬价作起点代理；历史校准 Spearman ρ 高，代理分位排序可靠，但12月底需用真实起点价复核。",
  };

  // ---- 7. 持仓量二次分析 ----
  const oi = await oiAnalysis(rows);
  const deep = oiDeepDive(rows);
  const sigOf = (y) => y == null ? "未知" : y < 0 ? "晚顶" : "早顶";
  oi.forecast.combined = {
    Y2705: { oiSignal: sigOf(oi.forecast.Y2705.yoy), priceSignal: forecast.contracts.Y2705.verdict },
    P2705: { oiSignal: sigOf(oi.forecast.P2705.yoy), priceSignal: forecast.contracts.P2705.verdict },
    note: "价格分位为事前信号、持仓同比为独立事前信号；两者一致时结论增强，冲突时需在 12 月用真实起点价与持仓复核。",
  };

  // ---- 真实路径样本（形态对比图，取非归一化绝对价归一到起点=100） ----
  const sampleSyms = ["Y2001", "Y2005", "P2009"];
  const paths = {};
  for (const sym of sampleSyms) {
    for (const oil of Object.keys(D)) {
      let found = null;
      for (const ct of CT) {
        const r = D[oil].types[ct].daily.series.find((x) => x.symbol === sym);
        if (r) { found = r; break; }
      }
      if (found) {
        const ab = found.abs.filter((v) => v != null);
        paths[sym] = { oil, norm: ab.map((v) => round(v / ab[0] * 100, 1)) };
        break;
      }
    }
  }

  const out = {
    source: "形态规律由豆油/棕榈油主力分析数据复算；2705 实时价来自新浪财经期货日线 JSONP",
    fetch_date: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
    overview: {
      title: "油脂主力合约形态研究与 2705 预判",
      subtitle: "从「先扬后抑」的观察出发，验证形态、检验预判信号、落到 2705 合约",
      windowRule: D["豆油"].window_rule,
    },
    shapeValidation, shapeGroups, earlyFeatures, quantileSignal, monthJump, forecast, paths,
    oiAnalysis: oi,
    oiDeepDive: deep,
    allRows: rows.map((r) => ({ oil: r.oil, ct: r.ct, sym: r.sym, year: r.year, pos: r.pos, tag: r.tag,
      peak: r.peak, end: r.end, fall: r.fall, startPct: r.startPct == null ? null : round(r.startPct * 100, 0),
      oiAtPeak: r.oiAtPeak ?? null, oiYoy: r.oiYoy ?? null })),
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out));
  console.log(`\n✅ 已写入 ${OUT_FILE} (${fs.statSync(OUT_FILE).size} bytes)`);
  console.log("形态验证:", shapeValidation.aboveStart + "/" + rows.length, "曾高于期初,", shapeValidation.pullback + "/" + rows.length, "有回落");
  console.log("分组:", JSON.stringify({ early: shapeGroups.early.count, late: shapeGroups.late.count, mid: shapeGroups.mid.count }));
  console.log("分位置换检验:", JSON.stringify(perm));
  console.log("分档:", JSON.stringify(bands));
  console.log("2705:", yPrice, "Q" + yQ + "%", yPrice && pPrice ? "|" : "", pPrice, "Q" + pQ + "%", "→", out.forecast.verdict);
  console.log("校准 ρ:", JSON.stringify(calib), "| 代理:", !yLive || !pLive);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
