#!/usr/bin/env node
/**
 * 把油脂研究三份 JSON 规范化为单一 SQLite 数据库文件。
 *
 * 输入: src/data/soybean-oil-y01.json, palm-oil-p01.json, oil-shape-research.json
 * 输出: public/data/oil-research.sqlite  +  src/data/oil-database-meta.json（表清单/行数/说明，供浏览页展示）
 *
 * 由各数据更新 workflow 在数据刷新后调用，保证数据库与报告同源。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "src/data");
const OUT_DIR = path.join(ROOT, "public/data");
const OUT_DB = path.join(OUT_DIR, "oil-research.sqlite");
const OUT_META = path.join(DATA, "oil-database-meta.json");

const SOY = JSON.parse(fs.readFileSync(path.join(DATA, "soybean-oil-y01.json"), "utf-8"));
const PALM = JSON.parse(fs.readFileSync(path.join(DATA, "palm-oil-p01.json"), "utf-8"));
const RES = JSON.parse(fs.readFileSync(path.join(DATA, "oil-shape-research.json"), "utf-8"));

const num = (v) => (v == null || v === "" ? null : typeof v === "number" ? v : Number(v));
const SQL = await initSqlJs();
const db = new SQL.Database();

/** 通用建表+插入：cols 为 [name,type] 元组数组，rows 为对象数组 */
function table(name, comment, cols, rows) {
  const defs = cols.map(([n, t]) => `"${n}" ${t}`).join(", ");
  db.run(`CREATE TABLE "${name}" (${defs})`);
  if (rows.length) {
    const names = cols.map((c) => c[0]);
    const sql = `INSERT INTO "${name}" (${names.map((n) => `"${n}"`).join(",")}) VALUES (${names.map(() => "?").join(",")})`;
    const stmt = db.prepare(sql);
    for (const r of rows) stmt.run(names.map((n) => {
      const v = r[n] ?? null;
      return typeof v === "object" ? JSON.stringify(v) : v;
    }));
    stmt.free();
  }
  const cnt = db.exec(`SELECT COUNT(*) FROM "${name}"`)[0].values[0][0];
  meta.tables.push({ name, comment, columns: cols.map(([n, t]) => `${n}:${t}`), rows: cnt });
  return cnt;
}

const meta = {
  database: "oil-research.sqlite",
  title: "油脂研究数据库",
  description: "豆油(Y)、棕榈油(P) 主力 01/05/09 合约历史行情、持仓与形态研究复算结果的单一 SQLite 数据库。与网页报告同源，由脚本生成。",
  generated_at: new Date().toISOString(),
  sources: [
    { name: "豆油主力分析", file: "soybean-oil-y01.json", updated_at: SOY.updated_at, source: SOY.source },
    { name: "棕榈油主力分析", file: "palm-oil-p01.json", updated_at: PALM.updated_at, source: PALM.source },
    { name: "油脂形态研究", file: "oil-shape-research.json", updated_at: RES.updated_at, source: RES.source },
  ],
  window_rule: SOY.window_rule,
  tables: [],
};

// ========== 1. 数据集与元信息 ==========
table("dataset", "数据源清单：三份输入 JSON 的来源与更新时间",
  [["id", "TEXT"], ["name", "TEXT"], ["file", "TEXT"], ["source", "TEXT"], ["updated_at", "TEXT"], ["window_rule", "TEXT"]],
  meta.sources.map((s, i) => ({ id: `D${i + 1}`, name: s.name, file: s.file, source: s.source, updated_at: s.updated_at, window_rule: meta.window_rule })));

// ========== 2. 合约明细（44 个合约年，豆油+棕榈油 × 01/05/09） ==========
const CONTRACT_COLS = [
  ["symbol", "TEXT"], ["oil", "TEXT"], ["contract", "TEXT"], ["deliver_year", "INTEGER"],
  ["win_start", "TEXT"], ["win_end", "TEXT"], ["start_date", "TEXT"], ["end_date", "TEXT"],
  ["start_price", "REAL"], ["end_price", "REAL"], ["peak_date", "TEXT"], ["peak_price", "REAL"],
  ["peak_days", "INTEGER"], ["bars", "INTEGER"], ["nodes", "INTEGER"],
  ["win_pct", "REAL"], ["win_daily_pct", "REAL"], ["peak_pct", "REAL"],
  ["start_label", "TEXT"], ["peak_label", "TEXT"],
  ["tag", "TEXT"], ["pos", "INTEGER"], ["peak", "REAL"], ["end", "REAL"], ["fall", "REAL"],
  ["start_pct", "REAL"], ["oi_at_peak", "REAL"], ["oi_yoy", "REAL"],
  ["is_partial", "INTEGER"],
];
const contractRows = [];
for (const [oilKey, d] of [["豆油", SOY], ["棕榈油", PALM]]) {
  for (const ct of ["01", "05", "09"]) {
    const t = d.types[ct];
    const ddMap = new Map(t.daily.series.map((x) => [x.symbol, x]));
    const rMap = new Map(RES.allRows.map((x) => [x.sym, x]));
    for (const s of t.series) {
      const dd = ddMap.get(s.symbol) || {};
      const r = rMap.get(s.symbol) || {};
      contractRows.push({
        symbol: s.symbol, oil: oilKey, contract: ct, deliver_year: num(s.deliver_year),
        win_start: s.win_start, win_end: s.win_end, start_date: s.start_date, end_date: s.end_date,
        start_price: num(s.start_price), end_price: num(s.end_price),
        peak_date: s.peak_date, peak_price: num(s.peak_price), peak_days: num(s.peak_days),
        bars: num(s.bars), nodes: num(s.nodes),
        win_pct: num(s.win_pct), win_daily_pct: num(s.win_daily_pct), peak_pct: num(s.peak_pct),
        start_label: s.start_label, peak_label: s.peak_label,
        tag: r.tag, pos: num(r.pos), peak: num(r.peak), end: num(r.end), fall: num(r.fall),
        start_pct: num(r.startPct), oi_at_peak: num(r.oiAtPeak), oi_yoy: num(r.oiYoy),
        is_partial: dd.is_partial ? 1 : 0,
      });
    }
  }
}
table("contracts", "合约主表：每个合约年一行（44 行），含窗口、价格、峰位、形态标签与持仓特征", CONTRACT_COLS, contractRows);

// ========== 3. 逐日行情（每个合约 × 每个交易日一行） ==========
const dailyRows = [];
for (const [oilKey, d] of [["豆油", SOY], ["棕榈油", PALM]]) {
  for (const ct of ["01", "05", "09"]) {
    const t = d.types[ct];
    for (const ds of t.daily.series) {
      for (let i = 0; i < ds.dates.length; i++) {
        if (!ds.dates[i]) continue;
        dailyRows.push({
          symbol: ds.symbol, oil: oilKey, contract: ct, deliver_year: num(ds.deliver_year),
          trade_date: ds.dates[i], progress_idx: i, md: t.daily.axis[i] || null,
          close: num(ds.abs[i]), norm: num(ds.norm[i]), oi: num(ds.oi ? ds.oi[i] : null),
        });
      }
    }
  }
}
table("daily_quotes", "逐日行情明细：合约 × 交易日的收盘价、归一化价、持仓量（4776 行）",
  [["symbol", "TEXT"], ["oil", "TEXT"], ["contract", "TEXT"], ["deliver_year", "INTEGER"],
   ["trade_date", "TEXT"], ["progress_idx", "INTEGER"], ["md", "TEXT"],
   ["close", "REAL"], ["norm", "REAL"], ["oi", "REAL"]], dailyRows);

// ========== 4. 月末节点（6 节点归一化） ==========
const nodeRows = [];
for (const [oilKey, d] of [["豆油", SOY], ["棕榈油", PALM]]) {
  for (const ct of ["01", "05", "09"]) {
    const t = d.types[ct];
    for (const s of t.series) {
      for (let i = 0; i < s.dates.length; i++) {
        nodeRows.push({ symbol: s.symbol, oil: oilKey, contract: ct, node_idx: i,
          date: s.dates[i], close: num(s.abs[i]), norm: num(s.norm[i]) });
      }
    }
  }
}
table("monthly_nodes", "月末 6 节点：归一化首月末=100 的月度锚点",
  [["symbol", "TEXT"], ["oil", "TEXT"], ["contract", "TEXT"], ["node_idx", "INTEGER"],
   ["date", "TEXT"], ["close", "REAL"], ["norm", "REAL"]], nodeRows);

// ========== 5. 平均路径（月末 + 逐日） ==========
const avgRows = [];
for (const [oilKey, d] of [["豆油", SOY], ["棕榈油", PALM]]) {
  for (const ct of ["01", "05", "09"]) {
    const t = d.types[ct];
    t.avg_norm.forEach((v, i) => avgRows.push({ oil: oilKey, contract: ct, kind: "月末6节点", idx: i, value: num(v) }));
    t.daily_avg_norm.forEach((v, i) => avgRows.push({ oil: oilKey, contract: ct, kind: "逐日121点", idx: i, value: num(v) }));
  }
}
table("avg_paths", "平均归一化路径：各品种各合约的月末节点与逐日等权平均",
  [["oil", "TEXT"], ["contract", "TEXT"], ["kind", "TEXT"], ["idx", "INTEGER"], ["value", "REAL"]], avgRows);

// ========== 6. 形态验证与分组 ==========
const sv = RES.shapeValidation, sg = RES.shapeGroups;
const shapeStats = [
  { metric: "样本总数", value: sv.total, unit: "个" },
  { metric: "终点前见顶", value: sv.peakBeforeEnd, unit: "个" },
  { metric: "曾高于期初", value: sv.aboveStart, unit: "个" },
  { metric: "出现回落", value: sv.pullback, unit: "个" },
  { metric: "末价高于期初", value: sv.endAboveStart, unit: "个" },
];
table("shape_stats", "形态验证汇总指标（先高后低是否普遍）",
  [["metric", "TEXT"], ["value", "REAL"], ["unit", "TEXT"]], shapeStats);

table("shape_groups", "形态分组：早顶/晚顶/中间三组的平均表现",
  [["grp", "TEXT"], ["count", "INTEGER"], ["share", "REAL"], ["avg_pos", "REAL"],
   ["avg_peak", "REAL"], ["avg_end", "REAL"], ["avg_fall", "REAL"], ["end_above", "INTEGER"], ["end_below", "INTEGER"]],
  Object.entries(sg).map(([k, v]) => ({ grp: { early: "早顶型", late: "晚顶型", mid: "中间型" }[k] || k,
    count: v.count, share: v.share, avg_pos: v.avgPos, avg_peak: v.avgPeak, avg_end: v.avgEnd,
    avg_fall: v.avgFall, end_above: v.endAbove, end_below: v.endBelow })));

// ========== 7. 早期特征判别力（AUC） ==========
const ef = RES.earlyFeatures;
const featName = { r3: "前3日涨幅", r5: "前5日涨幅", r7: "前7日涨幅", r10: "前10日涨幅", r20: "前20日涨幅",
  hi10: "前10日最高", lo10: "前10日最低", broke10: "前10日跌破开盘", up10: "前10日上涨天数占比",
  amp20: "前20日振幅", vol20: "前20日波动率", startPct: "期初价历史分位" };
const aucRows = Object.entries(ef.auc).map(([k, v]) => ({
  feature: k, name: featName[k] || k, auc: v,
  early_mean: ef.groupMeans[k]?.early ?? null, late_mean: ef.groupMeans[k]?.late ?? null,
  category: "早期走势/价格",
}));
// 持仓与深度辨析的 AUC 也并入
const oi = RES.oiAnalysis, dd = RES.oiDeepDive;
for (const [k, v] of Object.entries(oi.lifecycle.earlyAuc)) aucRows.push({ feature: k, name: ({ oiEarly20: "前20日持仓变化", oiStartPct: "期初持仓分位", oiYoy: "期初持仓同比 ★" })[k] || k, auc: v, early_mean: null, late_mean: null, category: "持仓" });
aucRows.push(
  { feature: "oiAtPeak", name: "高点持仓水位", auc: oi.atPeak.auc, early_mean: oi.atPeak.earlyAvg, late_mean: oi.atPeak.lateAvg, category: "持仓(事后)" },
  { feature: "caliber_yoy", name: "持仓同比(早>晚)", auc: dd.caliber.rows[0].auc, early_mean: dd.caliber.rows[0].early.avg, late_mean: dd.caliber.rows[0].late.avg, category: "持仓口径辨析" },
  { feature: "caliber_pct", name: "持仓历史分位(早>晚)", auc: dd.caliber.rows[1].auc, early_mean: dd.caliber.rows[1].early.avg, late_mean: dd.caliber.rows[1].late.avg, category: "持仓口径辨析" },
  { feature: "same_time_yoy", name: "顶部同日同比(伪信号)", auc: dd.sameTime.sameTimeYoy.auc, early_mean: dd.sameTime.sameTimeYoy.early.avg, late_mean: dd.sameTime.sameTimeYoy.late.avg, category: "持仓口径辨析" },
  { feature: "oi_peak_prog", name: "持仓峰进度(早>晚)", auc: dd.peakPos.aucOiProg, early_mean: dd.peakPos.early.oiProgAvg, late_mean: dd.peakPos.late.oiProgAvg, category: "持仓峰位" },
  { feature: "oi_peak_lag", name: "持仓峰-价格峰差(早>晚)", auc: dd.peakPos.aucLag, early_mean: dd.peakPos.early.lagAvg, late_mean: dd.peakPos.late.lagAvg, category: "持仓峰位" },
);
table("signal_auc", "信号判别力：各特征区分早/晚顶的 AUC（0.5=抛硬币）",
  [["feature", "TEXT"], ["name", "TEXT"], ["auc", "REAL"], ["early_mean", "REAL"], ["late_mean", "REAL"], ["category", "TEXT"]], aucRows);

// ========== 8. 期初价分位信号 ==========
const qs = RES.quantileSignal;
table("quantile_bands", "期初价历史分位分档 → 晚顶率与末涨",
  [["label", "TEXT"], ["n", "INTEGER"], ["late", "INTEGER"], ["early", "INTEGER"], ["late_rate", "REAL"], ["avg_end", "REAL"]],
  qs.bands.map((b) => ({ label: b.label, n: b.n, late: b.late, early: b.early, late_rate: b.lateRate, avg_end: b.avgEnd })));
table("quantile_by_oil", "期初价分位信号分品种验证",
  [["oil", "TEXT"], ["low_n", "INTEGER"], ["low_late", "INTEGER"], ["low_late_rate", "REAL"],
   ["high_n", "INTEGER"], ["high_late", "INTEGER"], ["high_late_rate", "REAL"]],
  Object.entries(qs.byOil).map(([oil, v]) => ({ oil, low_n: v.lowN, low_late: v.lowLate, low_late_rate: v.lowLateRate,
    high_n: v.highN, high_late: v.highLate, high_late_rate: v.highLateRate })));
table("signal_tests", "统计检验汇总：置换检验、留一验证与基线",
  [["test", "TEXT"], ["stat", "TEXT"], ["value", "REAL"], ["note", "TEXT"]],
  [
    { test: "期初价分位置换检验", stat: "p值", value: qs.permutation.pValue, note: `${qs.permutation.permutations} 次置换，差异 ${qs.permutation.diffPp}pp` },
    { test: "持仓同比置换检验", stat: "p值", value: oi.lifecycle.permutation.pValue, note: `${oi.lifecycle.permutation.permutations} 次置换，差异 ${oi.lifecycle.permutation.diffPp}pp` },
    { test: "期初价分位留一", stat: "命中", value: ef.loo.hits, note: `共 ${ef.loo.total} 例，基线 ${ef.loo.baseline ?? ef.baseline.hits}/${ef.baseline.total}` },
    { test: "持仓同比留一", stat: "命中", value: oi.lifecycle.loo.hits, note: `共 ${oi.lifecycle.loo.total} 例，基线 ${oi.lifecycle.baseline.hits}/${oi.lifecycle.baseline.total}` },
    { test: "持仓同比与年份秩相关", stat: "Spearman ρ", value: oi.lifecycle.yearRho, note: "越高提示体制混淆风险越大" },
    { test: "期初价分位 早顶均值", stat: "分位%", value: qs.earlyAvgQ, note: "" },
    { test: "期初价分位 晚顶均值", stat: "分位%", value: qs.lateAvgQ, note: "" },
  ]);

// ========== 9. 7→8 月跳涨 ==========
const mj = RES.monthJump;
table("month_jump", "09 合约 7 月末→8 月末涨幅（逐年，豆油/棕榈油）",
  [["year", "INTEGER"], ["soy_pct", "REAL"], ["palm_pct", "REAL"]],
  mj.years.map((y, i) => ({ year: y, soy_pct: mj.soy[i], palm_pct: mj.palm[i] })));

// ========== 10. 2705 预判 ==========
const fc = RES.forecast;
table("forecast_2705", "2705 合约形态预判：现价、历史分位、持仓代理与结论",
  [["symbol", "TEXT"], ["price", "REAL"], ["high", "REAL"], ["low", "REAL"], ["asof", "TEXT"],
   ["quantile", "INTEGER"], ["off_high", "REAL"], ["verdict", "TEXT"],
   ["oi", "REAL"], ["oi_prev", "REAL"], ["oi_yoy", "REAL"], ["oi_signal", "TEXT"], ["price_signal", "TEXT"]],
  ["Y2705", "P2705"].map((sym) => {
    const c = fc.contracts[sym], of = oi.forecast[sym], comb = oi.forecast.combined[sym];
    return { symbol: sym, price: c.price, high: c.high, low: c.low, asof: c.asof, quantile: c.quantile,
      off_high: c.offHigh, verdict: c.verdict, oi: of.oi, oi_prev: of.prevOi, oi_yoy: of.yoy,
      oi_signal: comb.oiSignal, price_signal: comb.priceSignal };
  }));
table("forecast_proxies", "2705 历史校准价：往年同期 05 合约价格",
  [["symbol", "TEXT"], ["proxy_year", "TEXT"], ["proxy_price", "REAL"]],
  ["Y2705", "P2705"].flatMap((sym) => Object.entries(fc.contracts[sym].proxies).map(([y, v]) => ({ symbol: sym, proxy_year: y, proxy_price: v }))));
const st = fc.structural;
table("structural_evolution", "05 合约形态演变（逐年早晚顶结构，体制切换依据）",
  [["oil", "TEXT"], ["year", "INTEGER"], ["tag", "TEXT"], ["pos", "INTEGER"], ["end", "REAL"]],
  st.years.flatMap((y, i) => [
    { oil: "豆油", year: y, tag: st.soy[i]?.tag, pos: st.soy[i]?.pos, end: st.soy[i]?.end },
    { oil: "棕榈油", year: y, tag: st.palm[i]?.tag, pos: st.palm[i]?.pos, end: st.palm[i]?.end },
  ]));

// ========== 11. 持仓生命周期曲线 ==========
table("oi_lifecycle_curve", "持仓生命周期曲线：窗口进度 0-100% 的平均持仓水位(起点=100)",
  [["progress", "INTEGER"], ["all", "REAL"], ["early", "REAL"], ["late", "REAL"]],
  oi.lifecycle.axis.map((p, i) => ({ progress: p, all: oi.lifecycle.all[i], early: oi.lifecycle.early[i], late: oi.lifecycle.late[i] })));

// ========== 12. 持仓双信号矩阵 ==========
table("oi_matrix", "双信号矩阵：期初价分位 × 期初持仓同比 → 晚顶率与末涨",
  [["price_band", "TEXT"], ["oi_band", "TEXT"], ["n", "INTEGER"], ["late", "INTEGER"],
   ["early", "INTEGER"], ["late_rate", "REAL"], ["avg_end", "REAL"], ["symbols", "TEXT"]],
  oi.matrix.map((m) => ({ price_band: m.q, oi_band: m.oi, n: m.n, late: m.late, early: m.early,
    late_rate: m.lateRate, avg_end: m.avgEnd, symbols: m.syms.join(" ") })));

// ========== 13. 持仓口径辨析 ==========
table("oi_caliber", "两个「历史同期」口径对比：同比 vs 历史分位",
  [["label", "TEXT"], ["early_n", "INTEGER"], ["early_avg", "REAL"], ["early_pos", "INTEGER"],
   ["late_n", "INTEGER"], ["late_avg", "REAL"], ["late_pos", "INTEGER"], ["auc", "REAL"], ["verdict", "TEXT"]],
  dd.caliber.rows.map((r) => ({ label: r.label, early_n: r.early.n, early_avg: r.early.avg, early_pos: r.early.pos,
    late_n: r.late.n, late_avg: r.late.avg, late_pos: r.late.pos, auc: r.auc, verdict: r.verdict })));
table("oi_caliber_buckets", "期初持仓历史分位分档 → 早顶率（分档不单调）",
  [["label", "TEXT"], ["n", "INTEGER"], ["early", "INTEGER"], ["early_rate", "REAL"]], dd.caliber.buckets);
table("oi_sametime", "顶部同日同比 vs 窗口起点同比（同刻口径为伪信号）",
  [["method", "TEXT"], ["early_n", "INTEGER"], ["early_avg", "REAL"], ["early_pos", "INTEGER"],
   ["late_n", "INTEGER"], ["late_avg", "REAL"], ["late_pos", "INTEGER"], ["auc", "REAL"]],
  [
    { method: "顶部同日 vs 去年同日(伪)", ...prefix(dd.sameTime.sameTimeYoy) },
    { method: "窗口起点 vs 去年起点(现用)", ...prefix(dd.sameTime.startYoy) },
  ]);
function prefix(s) { return { early_n: s.early.n, early_avg: s.early.avg, early_pos: s.early.pos, late_n: s.late.n, late_avg: s.late.avg, late_pos: s.late.pos, auc: s.auc }; }
table("oi_anomalies", "晚顶组同刻同比>100% 异常样本（分母坍缩演示）",
  [["symbol", "TEXT"], ["peak_date", "TEXT"], ["oi_now", "REAL"], ["oi_prev", "REAL"],
   ["yoy", "REAL"], ["self_peak_pct", "REAL"]],
  dd.sameTime.anomalies.map((a) => ({ symbol: a.sym, peak_date: a.peakDate, oi_now: a.oiNow, oi_prev: a.oiPrev, yoy: a.yoy, self_peak_pct: a.selfPeak })));
table("oi_peak_position", "持仓峰进度与持仓峰-价格峰先后（早/晚顶对比）",
  [["grp", "TEXT"], ["n", "INTEGER"], ["oi_prog_avg", "REAL"], ["oi_prog_med", "REAL"],
   ["price_prog_avg", "REAL"], ["lag_avg", "REAL"], ["lag_later", "INTEGER"]],
  [
    { grp: "早顶型", ...dd.peakPos.early },
    { grp: "晚顶型", ...dd.peakPos.late },
  ]);

// ========== 14. 持仓峰后减仓与价格走势 ==========
const dec = RES.oiDecline;
const stat = (s) => ({ n: s.n, down: s.down, down_rate: s.downRate, avg: s.avg, med: s.med });

table("oi_decline_horizon", "持仓峰后 T+N 价格表现（相对峰日收盘，分品种/合计）",
  [["t_days", "INTEGER"], ["oil", "TEXT"], ["n", "INTEGER"], ["down", "INTEGER"],
   ["down_rate", "REAL"], ["avg_pct", "REAL"], ["med_pct", "REAL"]],
  dec.horizons.flatMap((h) => [
    { t_days: h.n, oil: "豆油", ...stat(h.soy) },
    { t_days: h.n, oil: "棕榈油", ...stat(h.palm) },
    { t_days: h.n, oil: "合计", ...stat(h.all) },
  ]));

table("oi_decline_by_contract", "持仓峰后价格表现按品种×合约细分（T+20/T+40）",
  [["t_days", "INTEGER"], ["oil", "TEXT"], ["contract", "TEXT"], ["n", "INTEGER"],
   ["down", "INTEGER"], ["down_rate", "REAL"], ["avg_pct", "REAL"], ["med_pct", "REAL"]],
  dec.byContract.flatMap((h) => {
    const map = { "01": ["豆油", h.soy01], "05": ["豆油", h.soy05], "09": ["豆油", h.soy09],
      "p01": ["棕榈油", h.palm01], "p05": ["棕榈油", h.palm05], "p09": ["棕榈油", h.palm09] };
    return Object.entries(map).map(([k, [oil, s]]) => ({ t_days: h.n, oil, contract: k.replace("p", ""), ...stat(s) }));
  }));

table("oi_decline_depth", "持仓自峰顶减仓 X% 时的价格表现（跌幅集中在减仓早期）",
  [["drop_pct", "INTEGER"], ["oil", "TEXT"], ["n", "INTEGER"], ["down", "INTEGER"],
   ["down_rate", "REAL"], ["avg_pct", "REAL"], ["med_pct", "REAL"]],
  dec.drops.flatMap((d) => [
    { drop_pct: d.drop, oil: "豆油", ...stat(d.soy) },
    { drop_pct: d.drop, oil: "棕榈油", ...stat(d.palm) },
  ]));

table("oi_decline_event_path", "事件研究价格路径：持仓峰=100，峰前后交易日 -30~+60",
  [["oil", "TEXT"], ["day_from_peak", "INTEGER"], ["price_norm", "REAL"]],
  [...dec.path.soy.map(([d, v]) => ({ oil: "豆油", day_from_peak: d, price_norm: v })),
   ...dec.path.palm.map(([d, v]) => ({ oil: "棕榈油", day_from_peak: d, price_norm: v }))]);

table("oi_decline_timing", "日度减仓择时检验：减仓日 vs 增仓日后续收益（AUC≈0.5=无择时价值）",
  [["future_days", "INTEGER"], ["oil", "TEXT"], ["dec_n", "INTEGER"], ["inc_n", "INTEGER"],
   ["dec_avg_pct", "REAL"], ["inc_avg_pct", "REAL"], ["auc", "REAL"]],
  dec.timing.flatMap((tm) => [
    { future_days: tm.k, oil: "豆油", dec_n: tm.soy.decN, inc_n: tm.soy.incN, dec_avg_pct: tm.soy.decAvg, inc_avg_pct: tm.soy.incAvg, auc: tm.soy.auc },
    { future_days: tm.k, oil: "棕榈油", dec_n: tm.palm.decN, inc_n: tm.palm.incN, dec_avg_pct: tm.palm.decAvg, inc_avg_pct: tm.palm.incAvg, auc: tm.palm.auc },
    { future_days: tm.k, oil: "合计", dec_n: tm.all.decN, inc_n: tm.all.incN, dec_avg_pct: tm.all.decAvg, inc_avg_pct: tm.all.incAvg, auc: tm.all.auc },
  ]));

table("oi_decline_current", "当前进行中合约的持仓峰定位（Y2701/P2701，不计入历史统计）",
  [["symbol", "TEXT"], ["peak_date", "TEXT"], ["peak_progress", "REAL"], ["after_days", "INTEGER"],
   ["oi_peak", "REAL"], ["oi_now", "REAL"], ["declined_pct", "REAL"], ["price_from_peak_pct", "REAL"]],
  dec.current.map((c) => ({ symbol: c.sym, peak_date: c.peakDate, peak_progress: c.progress, after_days: c.after,
    oi_peak: c.oiPeak, oi_now: c.oiNow, declined_pct: c.declined, price_from_peak_pct: c.priceFromPeak })));

table("oi_decline_similar", "当前合约的历史相似案例（同品种、持仓峰进度<30%）",
  [["current_sym", "TEXT"], ["sym", "TEXT"], ["peak_date", "TEXT"], ["peak_progress", "REAL"],
   ["px20_pct", "REAL"], ["px40_pct", "REAL"]],
  dec.current.flatMap((c) => c.similar.map((s) => ({ current_sym: c.sym, sym: s.sym, peak_date: s.date,
    peak_progress: s.progress, px20_pct: s.px20, px40_pct: s.px40 }))));

// ========== 15. 例外样本 ==========
table("exceptions", "例外样本：与整体规律相反的合约（用于稳健性核查）",
  [["symbol", "TEXT"], ["quantile", "REAL"], ["tag", "TEXT"], ["peak", "REAL"], ["end", "REAL"]],
  qs.exceptions.map((e) => ({ symbol: e.sym, quantile: e.q, tag: e.tag, peak: e.peak, end: e.end })));

// ========== 导出 ==========
fs.mkdirSync(OUT_DIR, { recursive: true });
const bytes = db.export();
fs.writeFileSync(OUT_DB, Buffer.from(bytes));
fs.writeFileSync(OUT_META, JSON.stringify(meta, null, 2));
const totalRows = meta.tables.reduce((s, t) => s + t.rows, 0);
console.log(`✅ ${OUT_DB} (${(bytes.length / 1024).toFixed(1)} KB)`);
console.log(`✅ ${OUT_META}`);
console.log(`   表 ${meta.tables.length} 张，总行数 ${totalRows}`);
for (const t of meta.tables) console.log(`   ${t.name.padEnd(22)} ${String(t.rows).padStart(6)} 行  ${t.comment}`);
db.close();
