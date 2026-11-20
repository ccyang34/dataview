"use client";

import React, { useMemo, useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { COLORS, ContractType, RED, GREEN, PalmOilData } from "@/lib/palm-oil-p01";

const CT = ["01", "05", "09"] as const;

/** 读取 CSS 变量作为 ECharts 颜色（适配深浅主题） */
function useThemeColors() {
  const [t, setT] = useState({ fg: "#0F172A", muted: "#64748B", border: "#E2E8F0", card: "#FFFFFF", split: "#EEF2F6" });
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      setT({
        fg: cs.getPropertyValue("--foreground").trim() || "#0F172A",
        muted: cs.getPropertyValue("--muted").trim() || "#64748B",
        border: cs.getPropertyValue("--border").trim() || "#E2E8F0",
        card: cs.getPropertyValue("--card").trim() || "#FFFFFF",
        split: document.documentElement.classList.contains("dark") ? "#2a3949" : "#EEF2F6",
      });
    };
    read();
    window.addEventListener("resize", read);
    // 监听 <html> class 变化（Navbar 主题切换会 toggle "dark"），切换主题时同步图表配色
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { window.removeEventListener("resize", read); obs.disconnect(); };
  }, []);
  return t;
}

function Card({ title, children, desc, src, id }: { title: string; children: React.ReactNode; desc?: React.ReactNode; src?: string; id?: string }) {
  return (
    <div id={id} className="card p-4 sm:p-5" style={{ scrollMarginTop: 92 }}>
      <h3 className="text-base sm:text-lg font-semibold mb-1">{title}</h3>
      {desc && <div className="text-xs text-[var(--muted)] mb-3 leading-relaxed">{desc}</div>}
      {children}
      {src && <div className="text-[10px] text-[var(--muted-foreground)] mt-2">{src}</div>}
    </div>
  );
}

export function PalmOilCharts({ data }: { data: PalmOilData }) {
  const t = useThemeColors();
  const [curCt, setCurCt] = useState<(typeof CT)[number]>("01");
  const [mode, setMode] = useState<"norm" | "abs">("norm");
  // 图③/③-2 共享图例选中状态：点任一图例，两图同步切换合约
  const [legendSel, setLegendSel] = useState<Record<string, boolean>>({
    "01合约": true, "05合约": true, "09合约": true,
  });
  const onLegendChange = (params: { name: string; selected: Record<string, boolean> }) => {
    setLegendSel({ ...params.selected });
  };

  const types = data.types;
  const avgChange = useMemo(() => {
    const r: Record<string, number> = {};
    CT.forEach((ct) => { r[ct] = Math.round(((types[ct].avg_norm.at(-1) ?? 100) - 100) * 100) / 100; });
    return r;
  }, [types]);
  // 逐日峰值等权平均（图③-2 结论，数据驱动避免写死）
  const avgPeak = useMemo(() => {
    const r: Record<string, number> = {};
    CT.forEach((ct) => {
      const vs = types[ct].series.map((s) => s.peak_pct);
      r[ct] = vs.length ? Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 10) / 10 : 0;
    });
    return r;
  }, [types]);
  // 当前进行中合约（nodes<6 的最后一年）
  const cur = types["01"].series.at(-1);

  const commonTheme = {
    backgroundColor: "transparent",
    textStyle: { color: t.fg, fontFamily: "inherit" },
    tooltip: {
      backgroundColor: t.card,
      borderColor: t.border,
      textStyle: { color: t.fg, fontSize: 12 },
    },
  };

  // ---------- 图①：逐日叠加 ----------
  const opt1 = useMemo(() => {
    const T: ContractType = types[curCt];
    const key = mode === "abs" ? "abs" : "norm";
    const yname = mode === "abs" ? "价格(元/吨)" : "归一化(首月末=100)";
    const series = T.daily.series.map((s, i) => ({
      name: s.symbol,
      type: "line",
      showSymbol: false,
      smooth: 0.05,
      connectNulls: true,
      lineStyle: { width: s.is_partial ? 3 : 1.5, color: COLORS[i % COLORS.length], opacity: s.is_partial ? 1 : 0.82 },
      itemStyle: { color: COLORS[i % COLORS.length] },
      emphasis: { focus: "series", lineStyle: { width: 3.5 } },
      data: s[key],
    }));
    return {
      ...commonTheme,
      tooltip: {
        ...commonTheme.tooltip,
        trigger: "axis",
        axisPointer: { type: "line" },
        formatter: (ps: any[]) => {
          if (!ps.length) return "";
          const i = ps[0].dataIndex;
          let html = `<div style="font-weight:600;margin-bottom:3px">${T.daily.axis[i] || ""}</div>`;
          ps.forEach((p) => {
            if (p.value != null) {
              const s = T.daily.series[p.seriesIndex];
              const rd = s && s.dates[i] ? s.dates[i] : "";
              html += `<div style="display:flex;gap:6px;justify-content:space-between;min-width:150px"><span>${p.marker}${p.seriesName} <span style="opacity:.6">${rd}</span></span><b>${p.value}${mode === "abs" ? "" : ""}</b></div>`;
            }
          });
          return html;
        },
      },
      legend: { data: T.daily.series.map((s) => s.symbol), top: 0, textStyle: { color: t.muted, fontSize: 10 }, type: "scroll" },
      grid: { left: 52, right: 20, top: 46, bottom: 40 },
      xAxis: {
        type: "category", boundaryGap: false, data: T.daily.axis,
        name: `${curCt}合约窗口（月-日·逐日）`, nameLocation: "middle", nameGap: 26,
        nameTextStyle: { fontSize: 10, color: t.muted },
        axisLabel: { fontSize: 10, color: t.muted, interval: 19 },
        axisLine: { lineStyle: { color: t.border } },
      },
      yAxis: {
        type: "value", name: yname, scale: true,
        nameTextStyle: { fontSize: 10, color: t.muted },
        axisLabel: { color: t.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: t.split } },
      },
      series,
    };
  }, [types, curCt, mode, t]);

  // ---------- 图②：三合约平均路径（逐日） ----------
  const opt2 = useMemo(() => {
    const lineColor = [COLORS[0], COLORS[1], RED];
    const names = ["01合约(8→次年1月)", "05合约(12→次年5月)", "09合约(4→9月)"];
    const n = types["01"].daily_avg_norm.length; // 121 (0~100%)
    const xLabels = Array.from({ length: n }, (_, i) => i); // 索引, 显示时换算为第N交易日
    return {
      ...commonTheme,
      tooltip: {
        ...commonTheme.tooltip,
        trigger: "axis",
        formatter: (ps: any[]) => {
          if (!ps.length) return "";
          const i = ps[0].dataIndex;
          const pct = Math.round((i / (n - 1)) * 100);
          let html = `<div style="font-weight:600;margin-bottom:3px">窗口进度 ${pct}%（第 ${i + 1} / ${n} 交易日）</div>`;
          ps.forEach((p) => { if (p.value != null) html += `<div style="display:flex;gap:6px;justify-content:space-between;min-width:160px"><span>${p.marker}${p.seriesName}</span><b>${p.value}</b></div>`; });
          return html;
        },
      },
      legend: { data: names, top: 0, textStyle: { color: t.muted, fontSize: 10 } },
      grid: { left: 48, right: 20, top: 38, bottom: 40 },
      xAxis: {
        type: "category", boundaryGap: false, data: xLabels,
        name: "窗口内第 N 个交易日（等进度对齐）", nameLocation: "middle", nameGap: 26,
        nameTextStyle: { fontSize: 10, color: t.muted },
        axisLabel: { fontSize: 10, color: t.muted, interval: 19, formatter: (v: string) => `第${Number(v) + 1}日` },
        axisLine: { lineStyle: { color: t.border } },
      },
      yAxis: { type: "value", name: "归一化", scale: true, nameTextStyle: { color: t.muted, fontSize: 10 }, axisLabel: { color: t.muted, fontSize: 10 }, splitLine: { lineStyle: { color: t.split } } },
      series: CT.map((ct, i) => ({
        name: names[i], type: "line", data: types[ct].daily_avg_norm, smooth: 0.1,
        showSymbol: false, connectNulls: true,
        lineStyle: { color: lineColor[i], width: i === 2 ? 2.6 : 2 },
        itemStyle: { color: lineColor[i] }, emphasis: { focus: "series" },
      })),
    };
  }, [types, t]);

  // ---------- 图③ / ③-2：分组柱 ----------
  const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027];
  const barColor = [COLORS[0], COLORS[1], RED];
  const barLegend = ["01合约", "05合约", "09合约"];

  const buildBarOption = (field: "win_pct" | "win_daily_pct" | "peak_pct", name: string, peakMode: boolean) => {
    const series = CT.map((ct, idx) => {
      const mp = new Map(types[ct].series.map((s) => [s.deliver_year, s]));
      return {
        name: barLegend[idx], type: "bar",
        data: years.map((y) => {
          const s = mp.get(y);
          if (!s) return null;
          const v = s[field];
          const color = peakMode ? (v > 0 ? barColor[idx] : "#b8c2cb") : (v >= 0 ? barColor[idx] : GREEN);
          return {
            value: v,
            itemStyle: { color },
            symbol: s.symbol,
            startDate: s.start_date, startPrice: s.start_price,
            endDate: s.end_date, endPrice: s.end_price,
            peakDate: s.peak_date, peakPrice: s.peak_price, winPct: s.win_pct,
          };
        }),
      };
    });
    return {
      ...commonTheme,
      tooltip: {
        ...commonTheme.tooltip,
        trigger: "axis", axisPointer: { type: "shadow" },
        formatter: (ps: any[]) => {
          if (!ps.length) return "";
          let html = `<div style="font-weight:600;margin-bottom:3px">交割年 20${ps[0].axisValue}</div>`;
          ps.forEach((p) => {
            // ECharts axis trigger: p.value 为数值, 自定义字段在 p.data 上
            const d = p.data && typeof p.data === "object" ? p.data : p.value;
            const val = d && d.value != null ? d.value : (typeof p.value === "number" ? p.value : null);
            if (val == null || !d || !d.symbol) return;
            const vtxt = val.toFixed(1);
            if (peakMode) {
              html += `<div>${p.marker}${p.seriesName} ${d.symbol}: <b>${vtxt}%</b><br/><span style="opacity:.7;font-size:11px">${d.startDate.slice(5)} 收 ${Math.round(d.startPrice)} → ${d.peakDate.slice(5)} 高 ${Math.round(d.peakPrice)}；末 ${d.winPct.toFixed(1)}%</span></div>`;
            } else {
              html += `<div>${p.marker}${p.seriesName} ${d.symbol}: <b style="color:${val >= 0 ? RED : GREEN}">${vtxt}%</b><br/><span style="opacity:.7;font-size:11px">${d.startDate.slice(5)} 收 ${Math.round(d.startPrice)} → ${d.endDate.slice(5)} 收 ${Math.round(d.endPrice)}</span></div>`;
            }
          });
          return html;
        },
      },
      legend: { data: barLegend, top: 0, selected: legendSel, textStyle: { color: t.muted, fontSize: 10 } },
      grid: { left: 44, right: 16, top: 36, bottom: 26 },
      xAxis: { type: "category", data: years.map((y) => String(y).slice(2)), axisLabel: { fontSize: 10, color: t.muted }, axisLine: { lineStyle: { color: t.border } } },
      yAxis: { type: "value", name, nameTextStyle: { color: t.muted, fontSize: 10 }, axisLabel: { color: t.muted, fontSize: 10, formatter: "{value}%" }, splitLine: { lineStyle: { color: t.split } } },
      series,
    };
  };
  const opt3 = useMemo(() => buildBarOption("win_daily_pct", "起→末%", false), [types, t, legendSel]);
  const opt32 = useMemo(() => buildBarOption("peak_pct", "最高%", true), [types, t, legendSel]);

  return (
    <div className="space-y-6">
      {/* TL;DR */}
      <div id="tldr" className="card p-5 border-l-4" style={{ borderLeftColor: "var(--primary)", scrollMarginTop: 92 }}>
        <h2 className="text-base font-bold mb-2">核心结论（TL;DR）</h2>
        <ul className="text-sm space-y-1.5 list-disc pl-5">
          <li><b>区间区分后规律清晰：</b>三个主力合约各取交割前约6个月主力窗口（01=8月~次年1月、05=12月~次年5月、09=4月~9月）。等权平均窗口涨跌：<b style={{ color: RED }}>05 最强 {avgChange["05"] > 0 ? "+" : ""}{avgChange["05"]}%</b>、01 居中 {avgChange["01"] > 0 ? "+" : ""}{avgChange["01"]}%、09 最弱 {avgChange["09"] > 0 ? "+" : ""}{avgChange["09"]}%。三个窗口均值均为正，主力期整体呈季节性上行。</li>
          <li><b>01合约波动剧烈、正负交替：</b>P2001 +36.2%、P2101 +28.9%、P2201 +23.5% 连续三年大涨后，P2301 −11.3%、P2401 −9.7% 转负，P2501 +23.6% 再度走强，P2601 −11.5% 与进行中的 P2701 −16.3% 又回落，无稳定单边规律。</li>
          <li><b>逐日峰值(图③-2)远高于月末口径：</b>等权平均最大上行空间 <b style={{ color: RED }}>05 ≈ +{avgPeak["05"]}%</b>、01 ≈ +{avgPeak["01"]}%、09 ≈ +{avgPeak["09"]}%，日内 high 能捕捉月末收盘遗漏的盘中冲高。</li>
          <li><b>当前状态：</b>{cur?.symbol}（01窗口进行中）截至 {cur?.end_date?.slice(5)} 收 <b>{cur?.abs[cur.nodes - 1]}</b>, 自窗口起始日收盘 {cur?.start_price} 回落 <b style={{ color: GREEN }}>{(cur?.win_daily_pct ?? 0).toFixed(1)}%</b>，但区间内最大上行曾达 <b style={{ color: RED }}>+{(cur?.peak_pct ?? 0).toFixed(1)}%</b>（冲高回落明显）。</li>
        </ul>
      </div>

      {/* KPI */}
      <div id="kpi" className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ scrollMarginTop: 92 }}>
        {([["05合约窗口(12~次年5月)", avgChange["05"], "最强窗口"], ["01合约窗口(8~次年1月)", avgChange["01"], "居中"], ["09合约窗口(4~9月)", avgChange["09"], "最弱"], ["当前合约", null, "01窗口进行中"]] as const).map(([lab, val, note], i) => (
          <div key={i} className="card p-3 sm:p-4">
            <div className="text-xs text-[var(--muted)]">{lab}</div>
            <div className="text-xl sm:text-2xl font-bold mt-1" style={{ color: val == null ? undefined : val >= 0 ? RED : GREEN }}>
              {val == null ? (cur?.symbol ?? "P2701") : `${val > 0 ? "+" : ""}${val.toFixed(2)}%`}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">{note}</div>
          </div>
        ))}
      </div>

      {/* 图① */}
      <Card id="chart1"
        title="① 各合约历年窗口走势叠加（逐日）"
        desc={<>切换合约查看主力窗口内历年走势叠加：横轴为<b>逐日颗粒度</b>月-日（各年约110个交易日），按日历月-日对齐，非共同交易日用相邻点直线连接；悬停显示每个合约真实日期。归一化=窗口首月末收盘=100。</>}
        src={`数据源：${data.source} ｜ 抓取 ${data.fetch_date}`}
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden">
            {CT.map((ct) => (
              <button key={ct} onClick={() => setCurCt(ct)} className={`px-3 py-1.5 text-xs cursor-pointer ${curCt === ct ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--card-hover)]"}`}>
                {ct}合约
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button onClick={() => setMode("norm")} className={`px-3 py-1.5 text-xs cursor-pointer ${mode === "norm" ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--card-hover)]"}`}>归一化</button>
            <button onClick={() => setMode("abs")} className={`px-3 py-1.5 text-xs cursor-pointer ${mode === "abs" ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--card-hover)]"}`}>绝对价</button>
          </div>
        </div>
        <ReactECharts option={opt1} style={{ height: 420, width: "100%" }} notMerge={true} opts={{ renderer: "svg" }} />
      </Card>

      {/* 图② */}
      <Card id="chart2" title="② 三合约平均窗口路径对比（逐日）" desc="横轴为「窗口内第 N 个交易日」（等进度插值对齐，各合约窗口交易日数不同故按进度归一），三条线为各合约历年等权平均归一化逐日路径。末点与月末口径一致：05 上升斜率最陡，09 最平。">
        <ReactECharts option={opt2} style={{ height: 340, width: "100%" }} notMerge={true} opts={{ renderer: "svg" }} />
      </Card>

      {/* 图③ + ③-2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card id="chart3" title="③ 各交割年三合约窗口涨跌幅（起始→末）" desc="按交割年分组，同月三合约「窗口起始交易日收盘→最后交易日收盘」涨跌并列对比（红涨绿跌）。悬停看真实起止日期与价格。">
          <ReactECharts option={opt3} style={{ height: 330, width: "100%" }} notMerge={true} opts={{ renderer: "svg" }} onEvents={{ legendselectchanged: onLegendChange }} />
        </Card>
        <Card id="chart32" title="③-2 起始日→最高价日涨幅（逐日）" desc="逐日真实行情：起始交易日收盘 → 窗口内最高价日日内最高价（high）的涨幅，衡量区间最大上行空间。峰值即起始日显示灰柱。悬停看具体日期。">
          <ReactECharts option={opt32} style={{ height: 330, width: "100%" }} notMerge={true} opts={{ renderer: "svg" }} onEvents={{ legendselectchanged: onLegendChange }} />
        </Card>
      </div>

      {/* 明细表 */}
      <Card id="table" title="④ 各合约关键数据一览" desc="按合约分组列出各年度窗口首末价、区间涨跌、逐日最高涨幅、首日到最高点的交易日数、节点数。进行中的 P2701 仅 4/6 节点。">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--background)] text-[var(--muted)]">
                {[
                  ["合约", "text-left"],
                  ["交割年", "text-center"],
                  ["窗口起", "text-center"],
                  ["首→末价", "text-center"],
                  ["窗口涨跌", "text-center"],
                  ["最高涨幅", "text-center"],
                  ["首→高点", "text-center"],
                  ["节点", "text-center"],
                  ["覆盖月份", "text-left"],
                ].map(([h, align]) => (
                  <th key={h} className={`p-2 font-medium whitespace-nowrap ${align}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CT.map((ct) => (
                <React.Fragment key={ct}>
                  <tr><td colSpan={9} className="p-2 text-left font-bold" style={{ color: "var(--primary)", background: "var(--card-hover)" }}>{ct}合约 · 窗口 {types[ct].labels.join(" / ")}</td></tr>
                  {types[ct].series.map((s) => (
                    <tr key={s.symbol} className="border-t border-[var(--border)] hover:bg-[var(--card-hover)]">
                      <td className="p-2 text-left whitespace-nowrap font-bold">{s.symbol}{s.nodes < 6 && <span style={{ color: RED, fontSize: 10 }}> (进行中)</span>}</td>
                      <td className="p-2 text-center whitespace-nowrap">{s.deliver_year}</td>
                      <td className="p-2 text-center whitespace-nowrap">{s.win_start?.slice(0, 7)}</td>
                      <td className="p-2 text-center whitespace-nowrap">{Math.round(s.abs[0] ?? 0)} → {Math.round(s.abs[s.nodes - 1] ?? 0)}</td>
                      <td className="p-2 text-center whitespace-nowrap font-semibold" style={{ color: s.win_pct >= 0 ? RED : GREEN }}>{s.win_pct > 0 ? "+" : ""}{s.win_pct.toFixed(1)}%</td>
                      <td className="p-2 text-center whitespace-nowrap font-semibold" style={{ color: RED }}>+{s.peak_pct.toFixed(1)}%</td>
                      <td className="p-2 text-center whitespace-nowrap">{s.peak_days}日</td>
                      <td className="p-2 text-center whitespace-nowrap">{s.nodes}/6</td>
                      <td className="p-2 text-left whitespace-nowrap text-[var(--muted)]">{types[ct].labels.slice(0, s.nodes).join(" / ")}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 口径说明 */}
      <Card id="method" title="数据口径与方法说明">
        <div className="text-xs text-[var(--muted)] space-y-1.5 leading-relaxed">
          <p>1. <b>标的：</b>棕榈油期货（P）于 2007 年在大商所上市，01/05/09 为主力月份合约。</p>
          <p>2. <b>窗口区间：</b>每合约只取临近交割的核心主力窗口——01=8月~次年1月、05=12月~次年5月、09=4月~9月（各6个月）。</p>
          <p>3. <b>对齐口径：</b>图①颗粒度=天，按日历月-日对齐到统一轴（各年约110个交易日）；图②颗粒度=天，各合约按窗口进度（第1~N交易日）线性插值到统一 121 点轴后等权平均，末点与月末口径一致；图③按逐日真实起止交易日；图④明细表按自然月月末收盘6节点口径。图①②归一化基准为窗口首月末收盘=100。</p>
          <p>4. <b>两种涨跌口径：</b>图③「窗口涨跌」=窗口最后交易日收盘 / 起始交易日收盘 −1（逐日口径）；图③-2「最高涨幅」=窗口内最高价日 high / 起始交易日收盘 −1（逐日口径，分母同为起始交易日收盘）。表④「首→高点」=从窗口起始交易日到最高价日所经历的交易日数（起始日即最高则记 0 日）。</p>
          <p>5. <b>数据边界：</b>新浪源约回溯至 2019 年，各合约样本 7–8 个年度；P2705/P2709 未进窗口未纳入。</p>
          <p>6. <b>更新机制：</b>数据由 GitHub Action 每交易日 16:30（北京时间）自动拉取新浪日线重算并提交，页面“刷新”即读最新；本报告为历史统计，不构成投资建议。</p>
        </div>
      </Card>
    </div>
  );
}
