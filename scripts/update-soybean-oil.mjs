#!/usr/bin/env node
/**
 * 豆油主力合约 01/05/09 核心窗口历年同比数据更新脚本
 * 数据源: 新浪财经期货日线 JSONP (大连商品交易所内盘豆油 Y)
 *   https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_X=/InnerFuturesNewService.getDailyKLine?symbol=X
 * 字段: d=日期 o=开 h=高 l=低 c=收 v=量 p=持仓 s=结算
 *
 * 窗口(对称主力期): 01=8月~次年1月; 05=12月~次年5月; 09=4月~9月
 * 对齐: 月末6节点(图③④) + 逐日MM-DD(图①) + 逐日等权平均(图②) + 逐日峰值(图③-2)
 * 输出: src/data/soybean-oil-y01.json
 *
 * 由 .github/workflows/soybean-oil-update.yml 定时/手动调用, 生成物提交入库。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "src", "data", "soybean-oil-y01.json");

const TYPES = {
  "01": { start: [8, -1], labels: ["8月", "9月", "10月", "11月", "12月", "次年1月"] },
  "05": { start: [12, -1], labels: ["12月", "1月", "2月", "3月", "4月", "5月"] },
  "09": { start: [4, 0], labels: ["4月", "5月", "6月", "7月", "8月", "9月"] },
};
const YEARS = Array.from({ length: 8 }, (_, i) => 2020 + i); // 交割年 2020..2027

const round = (v, n = 2) => (v == null || Number.isNaN(v) ? null : Math.round(v * 10 ** n) / 10 ** n);
const symOf = (ct, year) => `Y${String(year).slice(2)}${ct}`;

/** 拉取单个合约日线, 返回 [{d,o,h,l,c}...] (按日期升序) */
async function loadSymbol(sym, retries = 3) {
  const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_${sym}=/InnerFuturesNewService.getDailyKLine?symbol=${sym}&_=${Date.now()}`;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://finance.sina.com.cn/",
    "Accept": "*/*",
  };
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const m = text.match(/=\s*\((\[[\s\S]*?\])\)/);
      if (!m) return []; // 无数据(如未上市合约)
      const data = JSON.parse(m[1]);
      if (!Array.isArray(data)) return [];
      return data.map((it) => ({
        d: String(it.d),
        c: parseFloat(it.c),
        h: parseFloat(it.h),
        p: parseFloat(it.p), // 持仓量
      })).filter((x) => x.d && !Number.isNaN(x.c) && !Number.isNaN(x.h));
    } catch (e) {
      if (attempt === retries) {
        console.error(`  ${sym} 拉取失败(${retries}次): ${e.message}`);
        return [];
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  return [];
}

/** 众数: 平局取较大值 */
function modePick(values, fallback) {
  if (!values.length) return fallback;
  const cnt = new Map();
  for (const v of values) cnt.set(v, (cnt.get(v) || 0) + 1);
  const top = Math.max(...cnt.values());
  return [...cnt.entries()].filter(([, c]) => c === top).map(([v]) => v).sort().at(-1);
}

function labelOf(dateStr, dy, startMonth, yearOff, labels) {
  const yy = parseInt(dateStr.slice(0, 4), 10);
  const mm = parseInt(dateStr.slice(5, 7), 10);
  const ii = (yy - (dy + yearOff)) * 12 + (mm - startMonth);
  return ii >= 0 && ii < labels.length ? labels[ii] : `${dateStr.slice(5, 7)}月`;
}

async function main() {
  const out = {
    source: "新浪财经期货日线 JSONP (InnerFuturesNewService.getDailyKLine) · 大连商品交易所内盘豆油(Y)",
    fetch_date: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
    window_rule: "对称主力期: 01合约8月~次年1月; 05合约12月~次年5月; 09合约4月~9月",
    align_note: "月末6节点(首月末=100) + 逐日MM-DD对齐(图①) + 逐日等权平均路径(图②) + 逐日峰值(起始交易日收盘→最高价日high)",
    types: {},
  };

  for (const [ct, cfg] of Object.entries(TYPES)) {
    const [sm, yoff] = cfg.start;
    const series = [];
    const dailyRecords = [];

    for (const dy of YEARS) {
      const sym = symOf(ct, dy);
      const df = await loadSymbol(sym);
      if (df.length === 0) { console.log(sym, "EMPTY/SKIP"); continue; }

      const win = new Map();   // idx -> {d,c} 月末收盘
      const daily = new Map(); // MM-DD -> {d,c,idx} 逐日收盘
      const winDaily = [];     // {d,c,h} 窗口内所有交易日
      for (const row of df) {
        const y = parseInt(row.d.slice(0, 4), 10);
        const m = parseInt(row.d.slice(5, 7), 10);
        const idx = (y - (dy + yoff)) * 12 + (m - sm);
        if (idx >= 0 && idx <= 5) {
          win.set(idx, { d: row.d, c: row.c });          // 覆盖到月末
          daily.set(row.d.slice(5), { d: row.d, c: row.c, idx, oi: Number.isFinite(row.p) ? row.p : null });
          winDaily.push({ d: row.d, c: row.c, h: row.h, p: row.p });
        }
      }
      if (win.size < 2) { console.log(sym, "FEW-WINDOW", [...win.keys()]); continue; }

      const first = Math.min(...win.keys());
      const lastI = Math.max(...win.keys());
      const base = win.get(first).c;
      const abs = Array.from({ length: 6 }, (_, i) => (win.has(i) ? round(win.get(i).c, 0) : null));
      const dates = Array.from({ length: 6 }, (_, i) => (win.has(i) ? win.get(i).d : null));
      const norm = Array.from({ length: 6 }, (_, i) => (win.has(i) ? round((win.get(i).c / base) * 100, 2) : null));

      // 逐日峰值: 起始交易日收盘 → 窗口内最高价日 high
      winDaily.sort((a, b) => a.d.localeCompare(b.d));
      const start = winDaily[0];
      const end = winDaily[winDaily.length - 1];
      let peak = winDaily[0];
      let peakIdx = 0;
      winDaily.forEach((r, i) => { if (r.h > peak.h) { peak = r; peakIdx = i; } });
      const peakDays = peakIdx; // 起始交易日 → 最高价日 的交易日间隔数

      series.push({
        symbol: sym,
        deliver_year: dy,
        win_start: dates[first],
        win_end: dates[lastI],
        nodes: win.size,
        first_idx: first,
        norm, abs, dates,
        win_pct: round((win.get(lastI).c / base - 1) * 100, 2),
        win_daily_pct: round((end.c / start.c - 1) * 100, 2),
        peak_pct: round((peak.h / start.c - 1) * 100, 2),
        peak_days: peakDays,
        start_date: start.d,
        start_price: round(start.c, 0),
        end_date: end.d,
        end_price: round(end.c, 0),
        start_label: labelOf(start.d, dy, sm, yoff, cfg.labels),
        peak_date: peak.d,
        peak_price: round(peak.h, 0),
        peak_label: labelOf(peak.d, dy, sm, yoff, cfg.labels),
        bars: df.length,
      });
      console.log(sym, "nodes", win.size, dates[first], "~", dates[lastI],
        "win%", series.at(-1).win_pct, "winDaily%", series.at(-1).win_daily_pct,
        "peak%", series.at(-1).peak_pct, "days", daily.size);
      dailyRecords.push({ symbol: sym, deliver_year: dy, daily, base, nodes: win.size,
        ordered: winDaily.map((r) => round((r.c / base) * 100, 2)) });
    }

    // 平均窗口路径(等权, 各节点有效值平均)
    const avg = Array.from({ length: 6 }, (_, i) => {
      const vals = series.map((s) => s.norm[i]).filter((v) => v != null);
      return vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length, 2) : null;
    });

    // axis_md: 每节点各年度真实月末日期众数
    const axis_md = Array.from({ length: 6 }, (_, i) => {
      const mds = series.map((s) => (s.dates[i] ? s.dates[i].slice(5) : null)).filter(Boolean);
      return modePick(mds, cfg.labels[i]);
    });

    // 逐日对齐(图①): MM-DD 并集, 按(窗口月序, 日)排序
    const order = new Map();
    for (const rec of dailyRecords) {
      for (const [md, v] of rec.daily) {
        const day = parseInt(v.d.slice(8, 10), 10);
        const key = v.idx * 100 + day;
        if (!order.has(md) || order.get(md) > key) order.set(md, key);
      }
    }
    const axisDays = [...order.entries()].sort((a, b) => a[1] - b[1]).map(([md]) => md);
    const dailySeries = dailyRecords.map((rec) => {
      const norm = [], abs = [], dates = [], oi = [];
      for (const md of axisDays) {
        const v = rec.daily.get(md);
        if (v) {
          norm.push(round((v.c / rec.base) * 100, 2));
          abs.push(round(v.c, 0));
          dates.push(v.d);
          oi.push(v.oi);
        } else {
          norm.push(null); abs.push(null); dates.push(null); oi.push(null);
        }
      }
      return {
        symbol: rec.symbol,
        deliver_year: rec.deliver_year,
        norm, abs, dates, oi,
        n_days: norm.filter((v) => v != null).length,
        is_partial: rec.nodes < 6,
      };
    });

    // 逐日等权平均路径(图②): 各合约窗口交易日数不同(进行中合约更短),
    // 先按各自交易日序号映射到统一的进度轴(0~100%, 共 STEP 个点), 线性插值, 再等权平均。
    // 这样所有合约全程覆盖, 起点=100、末点≈月末口径, 不受个别合约长度差异干扰。
    const STEP = 120;
    const dailyAvgNorm = [];
    for (let k = 0; k <= STEP; k++) {
      const p = k / STEP;
      const vals = dailyRecords.map((r) => {
        const n = r.ordered.length;
        if (!n) return null;
        const pos = p * (n - 1);
        const lo = Math.floor(pos), hi = Math.ceil(pos);
        const a = r.ordered[lo], b = r.ordered[hi];
        if (a == null || b == null) return null;
        return lo === hi ? a : round(a + (b - a) * (pos - lo), 2);
      }).filter((v) => v != null);
      dailyAvgNorm.push(vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length, 2) : null);
    }

    out.types[ct] = {
      name: `${ct}合约`,
      labels: cfg.labels,
      axis_md,
      series,
      avg_norm: avg,
      daily: { axis: axisDays, series: dailySeries },
      daily_avg_norm: dailyAvgNorm,
    };
    console.log(`\n[${ct}] avg:`, avg, "| daily axis:", axisDays.length, "天", axisDays[0], "~", axisDays.at(-1),
      "| daily_avg 非空:", dailyAvgNorm.filter((v) => v != null).length);
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out));
  console.log(`\n✅ 已写入 ${OUT_FILE} (${fs.statSync(OUT_FILE).size} bytes)`);
  console.log("updated_at:", out.updated_at);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
