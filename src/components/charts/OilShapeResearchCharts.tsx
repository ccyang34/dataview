"use client";

import React, { useMemo, useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import {
  OilShapeResearchData, RED, GREEN,
} from "@/lib/oil-shape-research";

/** 读取 CSS 变量作为图表颜色（适配深浅主题） */
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
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { window.removeEventListener("resize", read); obs.disconnect(); };
  }, []);
  return t;
}

function Card({ title, children, desc, tag }: { title: string; children: React.ReactNode; desc?: React.ReactNode; tag?: string }) {
  return (
    <div className="card p-4 sm:p-5 mb-4">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
        {tag && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card-hover)] text-[var(--muted)] font-medium">{tag}</span>}
      </div>
      {desc && <div className="text-xs text-[var(--muted)] mb-3 leading-relaxed">{desc}</div>}
      {children}
    </div>
  );
}

const pct = (v: number, digits = 1) => `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;
const colorOf = (v: number) => v >= 0 ? RED : GREEN;

export function OilShapeResearchCharts({ data }: { data: OilShapeResearchData }) {
  const t = useThemeColors();
  const { shapeValidation: sv, shapeGroups: sg, earlyFeatures: ef, quantileSignal: qs, monthJump: mj, forecast: fc, paths, allRows, oiAnalysis: oi, oiDeepDive: dd } = data;

  const common = {
    backgroundColor: "transparent",
    textStyle: { color: t.fg, fontFamily: "inherit" },
  };

  // 图1：两种真实形态路径（归一化）
  const pathOption = useMemo(() => {
    const series = Object.entries(paths).map(([sym, o]) => {
      const color = sym === "Y2001" ? "#BA7517" : sym === "Y2005" ? "#378ADD" : "#7F77DD";
      return {
        name: `${sym} (${o.oil})`,
        type: "line",
        data: o.norm,
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2.2, color },
        itemStyle: { color },
      };
    });
    return {
      ...common,
      tooltip: { trigger: "axis", backgroundColor: t.card, borderColor: t.border, textStyle: { color: t.fg },
        valueFormatter: (v: number) => Number(v).toFixed(1) },
      legend: { data: series.map((s) => s.name), top: 0, textStyle: { color: t.muted, fontSize: 11 },
        formatter: (n: string) => n },
      grid: { left: 48, right: 18, top: 34, bottom: 28 },
      xAxis: { type: "category", name: "窗口进度", nameTextStyle: { color: t.muted, fontSize: 10 },
        data: Array.from({ length: Math.max(...Object.values(paths).map((p) => p.norm.length)) }, (_, i) => `${i}`),
        axisLabel: { color: t.muted, fontSize: 10, interval: Math.floor(Object.values(paths)[0].norm.length / 8) },
        axisLine: { lineStyle: { color: t.border } } },
      yAxis: { type: "value", name: "归一化", min: 80, max: (v: { max: number }) => Math.ceil(v.max / 10) * 10 + 5,
        nameTextStyle: { color: t.muted, fontSize: 10 }, axisLabel: { color: t.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: t.split } } },
      series,
    };
  }, [paths, t]);

  // 图2：早/晚/中间 形态分组三项均值
  const groupOption = useMemo(() => ({
    ...common,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: t.card, borderColor: t.border, textStyle: { color: t.fg } },
    legend: { data: ["峰值涨幅", "末涨幅", "峰→末回落"], top: 0, textStyle: { color: t.muted, fontSize: 11 } },
    grid: { left: 44, right: 18, top: 34, bottom: 26 },
    xAxis: { type: "category", data: ["早顶型", "中间型", "晚顶型"], axisLabel: { color: t.muted }, axisLine: { lineStyle: { color: t.border } } },
    yAxis: { type: "value", name: "%", nameTextStyle: { color: t.muted, fontSize: 10 }, axisLabel: { color: t.muted, fontSize: 10 }, splitLine: { lineStyle: { color: t.split } } },
    series: [
      { name: "峰值涨幅", type: "bar", data: [sg.early.avgPeak, sg.mid.avgPeak, sg.late.avgPeak], itemStyle: { color: "#85B7EB", borderRadius: [3, 3, 0, 0] }, label: { show: true, position: "top", color: t.muted, fontSize: 10, formatter: (p: { value: number }) => p.value.toFixed(1) } },
      { name: "末涨幅", type: "bar", data: [sg.early.avgEnd, sg.mid.avgEnd, sg.late.avgEnd], itemStyle: { color: (p: { dataIndex: number }) => [sg.early.avgEnd, sg.mid.avgEnd, sg.late.avgEnd][p.dataIndex] >= 0 ? RED : GREEN, borderRadius: [3, 3, 0, 0] }, label: { show: true, position: "top", color: t.muted, fontSize: 10, formatter: (p: { value: number }) => p.value.toFixed(1) } },
      { name: "峰→末回落", type: "bar", data: [sg.early.avgFall, sg.mid.avgFall, sg.late.avgFall], itemStyle: { color: "#BA7517", borderRadius: [3, 3, 0, 0] }, label: { show: true, position: "top", color: t.muted, fontSize: 10, formatter: (p: { value: number }) => p.value.toFixed(1) } },
    ],
  }), [sg, t]);

  // 图3：早期特征 AUC 偏离 0.5（越接近0越无效）
  const featLabel: Record<string, string> = { r3: "前3日涨幅", r5: "前5日涨幅", r7: "前7日涨幅", r10: "前10日涨幅", r20: "前20日涨幅", hi10: "前10日最高", lo10: "前10日最低", broke10: "跌破开盘", up10: "上涨天数占比", amp20: "前20日振幅", vol20: "前20日波动率", startPct: "期初价分位 ★" };
  const featKeys = Object.keys(ef.auc);
  const aucOption = useMemo(() => ({
    ...common,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: t.card, borderColor: t.border, textStyle: { color: t.fg },
      formatter: (ps: { name: string; value: number }[]) => `${ps[0].name}<br/>AUC ${ps[0].value}（0.5=抛硬币）` },
    grid: { left: 92, right: 28, top: 16, bottom: 30 },
    xAxis: { type: "value", min: 0, max: 1, axisLabel: { color: t.muted, fontSize: 10 }, splitLine: { lineStyle: { color: t.split } } },
    yAxis: { type: "category", data: featKeys.map((k) => featLabel[k] || k), axisLabel: { color: t.muted, fontSize: 10 }, axisLine: { lineStyle: { color: t.border } } },
    series: [{
      type: "bar",
      data: featKeys.map((k) => ({ value: ef.auc[k], itemStyle: { color: k === "startPct" ? "#1D9E75" : "#B4B2A9", borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: "right", color: t.fg, fontSize: 10, formatter: (p: { value: number }) => p.value.toFixed(2) },
      markLine: { silent: true, symbol: "none", data: [{ xAxis: 0.5 }], lineStyle: { color: RED, type: "dashed", width: 1 }, label: { formatter: "0.5", color: RED, fontSize: 10 } },
    }],
  }), [ef, t]);

  // 图4：期初分位分档 → 晚顶率 + 平均末涨
  const bandOption = useMemo(() => ({
    ...common,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: t.card, borderColor: t.border, textStyle: { color: t.fg } },
    legend: { data: ["晚顶率", "平均末涨"], top: 0, textStyle: { color: t.muted, fontSize: 11 } },
    grid: { left: 44, right: 44, top: 34, bottom: 26 },
    xAxis: { type: "category", data: qs.bands.map((b) => b.label), axisLabel: { color: t.muted, fontSize: 11 }, axisLine: { lineStyle: { color: t.border } } },
    yAxis: [
      { type: "value", name: "晚顶率%", max: 100, nameTextStyle: { color: t.muted, fontSize: 10 }, axisLabel: { color: t.muted, fontSize: 10 }, splitLine: { lineStyle: { color: t.split } } },
      { type: "value", name: "末涨%", nameTextStyle: { color: t.muted, fontSize: 10 }, axisLabel: { color: t.muted, fontSize: 10 }, splitLine: { show: false } },
    ],
    series: [
      { name: "晚顶率", type: "bar", data: qs.bands.map((b) => b.lateRate), itemStyle: { color: "#378ADD", borderRadius: [3, 3, 0, 0] }, barWidth: "38%", label: { show: true, position: "top", color: t.fg, fontSize: 11, formatter: (p: { value: number }) => p.value + "%" } },
      { name: "平均末涨", type: "line", yAxisIndex: 1, data: qs.bands.map((b) => b.avgEnd), symbol: "circle", symbolSize: 8, lineStyle: { color: GREEN, width: 2 }, itemStyle: { color: GREEN }, label: { show: true, color: t.fg, fontSize: 11, formatter: (p: { value: number }) => pct(p.value) } },
    ],
  }), [qs, t]);

  // 图5：7→8 月跳涨逐年
  const jumpOption = useMemo(() => ({
    ...common,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: t.card, borderColor: t.border, textStyle: { color: t.fg }, valueFormatter: (v: number) => Number(v).toFixed(1) + "%" },
    legend: { data: ["豆油09", "棕榈油09"], top: 0, textStyle: { color: t.muted, fontSize: 11 } },
    grid: { left: 44, right: 18, top: 34, bottom: 26 },
    xAxis: { type: "category", data: mj.years.map((y) => String(y)), axisLabel: { color: t.muted }, axisLine: { lineStyle: { color: t.border } } },
    yAxis: { type: "value", name: "%", nameTextStyle: { color: t.muted, fontSize: 10 }, axisLabel: { color: t.muted, fontSize: 10 }, splitLine: { lineStyle: { color: t.split } } },
    series: [
      { name: "豆油09", type: "bar", data: mj.soy, itemStyle: { color: "#BA7517", borderRadius: [3, 3, 0, 0] } },
      { name: "棕榈油09", type: "bar", data: mj.palm, itemStyle: { color: "#7F77DD", borderRadius: [3, 3, 0, 0] } },
    ],
  }), [mj, t]);

  // ---- 持仓量二次分析图表 ----
  // 图6：持仓生命周期曲线（起点=100，按窗口进度）
  const oiCurveOption = useMemo(() => {
    const mk = (name: string, arr: number[], color: string, width: number) => ({
      name, type: "line", data: arr, showSymbol: false, smooth: true,
      lineStyle: { width, color, type: name === "全样本" ? "dashed" : "solid" },
      itemStyle: { color },
    });
    return {
      ...common,
      tooltip: { trigger: "axis", backgroundColor: t.card, borderColor: t.border, textStyle: { color: t.fg },
        valueFormatter: (v: number) => Number(v).toFixed(0) },
      legend: { data: ["全样本", "早顶型", "晚顶型"], top: 0, textStyle: { color: t.muted, fontSize: 11 } },
      grid: { left: 50, right: 18, top: 34, bottom: 30 },
      xAxis: { type: "category", name: "窗口进度 %", data: oi.lifecycle.axis.map(String), nameTextStyle: { color: t.muted, fontSize: 10 },
        axisLabel: { color: t.muted, fontSize: 10, interval: 3 }, axisLine: { lineStyle: { color: t.border } } },
      yAxis: { type: "value", name: "持仓 / 起点", nameTextStyle: { color: t.muted, fontSize: 10 }, axisLabel: { color: t.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: t.split } } },
      series: [
        mk("全样本", oi.lifecycle.all, "#B4B2A9", 2),
        mk("早顶型", oi.lifecycle.early, "#E24B4A", 2.4),
        mk("晚顶型", oi.lifecycle.late, "#378ADD", 2.4),
      ],
    };
  }, [oi, t]);

  // 图7：各信号判别力 |AUC-0.5|×2（0=抛硬币，1=完美）
  const oiSignalOption = useMemo(() => {
    const items = [
      { name: "前10日涨幅", auc: ef.auc.r10, kind: "走势" },
      { name: "前20日持仓变化", auc: oi.lifecycle.earlyAuc.oiEarly20, kind: "持仓" },
      { name: "期初持仓分位", auc: oi.lifecycle.earlyAuc.oiStartPct, kind: "持仓" },
      { name: "期初持仓同比 ★", auc: oi.lifecycle.earlyAuc.oiYoy, kind: "持仓" },
      { name: "期初价分位 ★", auc: ef.auc.startPct, kind: "价格" },
    ].map((x) => ({ ...x, power: Math.abs(x.auc - 0.5) * 2 }));
    return {
      ...common,
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: t.card, borderColor: t.border, textStyle: { color: t.fg },
        formatter: (ps: { dataIndex: number }[]) => {
          const x = items[ps[0].dataIndex];
          return `${x.name}<br/>判别力 ${x.power.toFixed(2)}（原始 AUC ${x.auc}）<br/>${x.auc < 0.5 ? "低值指向晚顶" : "高值指向晚顶"}`;
        } },
      grid: { left: 110, right: 44, top: 12, bottom: 26 },
      xAxis: { type: "value", min: 0, max: 1, axisLabel: { color: t.muted, fontSize: 10 }, splitLine: { lineStyle: { color: t.split } } },
      yAxis: { type: "category", data: items.map((x) => x.name), axisLabel: { color: t.muted, fontSize: 10 }, axisLine: { lineStyle: { color: t.border } } },
      series: [{
        type: "bar", barWidth: "55%",
        data: items.map((x) => ({ value: Math.round(x.power * 100) / 100, itemStyle: { color: x.kind === "持仓" ? (x.auc === oi.lifecycle.earlyAuc.oiYoy ? "#7F77DD" : "#B4A7E8") : x.kind === "价格" ? GREEN : "#C9C5BB", borderRadius: [0, 3, 3, 0] } })),
        label: { show: true, position: "right", color: t.fg, fontSize: 10, formatter: (p: { value: number }) => p.value.toFixed(2) },
      }],
    };
  }, [oi, ef, t]);

  // 图8：持仓峰进度 vs 价格峰进度（早/晚顶对比）
  const peakPosOption = useMemo(() => {
    const pp = dd.peakPos;
    return {
      ...common,
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: t.card, borderColor: t.border, textStyle: { color: t.fg },
        valueFormatter: (v: number) => Number(v).toFixed(1) + "%" },
      legend: { data: ["持仓峰进度", "价格峰进度"], top: 0, textStyle: { color: t.muted, fontSize: 11 } },
      grid: { left: 50, right: 18, top: 34, bottom: 26 },
      xAxis: { type: "category", data: ["早顶型", "晚顶型"], axisLabel: { color: t.muted, fontSize: 11 }, axisLine: { lineStyle: { color: t.border } } },
      yAxis: { type: "value", name: "窗口进度 %", min: 0, max: 108, nameTextStyle: { color: t.muted, fontSize: 10 }, axisLabel: { color: t.muted, fontSize: 10 }, splitLine: { lineStyle: { color: t.split } } },
      series: [
        { name: "持仓峰进度", type: "bar", barWidth: "24%",
          data: [pp.early.oiProgAvg, pp.late.oiProgAvg],
          itemStyle: { color: "#7F77DD", borderRadius: [3, 3, 0, 0] },
          label: { show: true, position: "top", color: t.fg, fontSize: 10, formatter: (p: { value: number }) => p.value + "%" } },
        { name: "价格峰进度", type: "bar", barWidth: "24%",
          data: [pp.early.priceProgAvg, pp.late.priceProgAvg],
          itemStyle: { color: RED, borderRadius: [3, 3, 0, 0] },
          label: { show: true, position: "top", color: t.fg, fontSize: 10, formatter: (p: { value: number }) => p.value + "%" } },
      ],
    };
  }, [dd, t]);

  // ---- 复刻用户称赞的 2705 分位预判图（纯 CSS） ----
  const QuantileBar = ({ label, price, q, note }: { label: string; price: number; q: number; note: string }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
        <span style={{ fontWeight: 500 }}>{label} · 现价 {price.toLocaleString()}</span>
        <span style={{ color: "var(--muted)" }}>{note}</span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ width: "35%", background: "#B5D4F4" }} />
          <div style={{ width: "30%", background: "#D3D1C7" }} />
          <div style={{ width: "35%", background: "#FAC775" }} />
        </div>
        <div style={{ position: "absolute", left: `${q}%`, top: -2, transform: "translateX(-50%)" }}>
          <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "9px solid #993C1D" }} />
        </div>
      </div>
      <div style={{ position: "relative", height: 18, marginTop: 2 }}>
        <span style={{ position: "absolute", left: `${q}%`, transform: "translateX(-50%)", fontSize: 12, fontWeight: 500, color: "#993C1D", whiteSpace: "nowrap" }}>{q}% 高位</span>
      </div>
      <div style={{ position: "relative", height: 14, fontSize: 11, color: "var(--muted)" }}>
        <span style={{ position: "absolute", left: 0 }}>0% 最低</span>
        <span style={{ position: "absolute", left: "35%", transform: "translateX(-50%)" }}>35%</span>
        <span style={{ position: "absolute", left: "65%", transform: "translateX(-50%)" }}>65%</span>
        <span style={{ position: "absolute", right: 0 }}>100% 最高</span>
      </div>
    </div>
  );

  const tagColor: Record<string, string> = { 晚顶: "#B5D4F4", 早顶: "#FAC775", 中间: "#D3D1C7" };

  return (
    <div>
      {/* ============ TL;DR ============ */}
      <div className="card p-4 sm:p-5 mb-5" style={{ borderLeft: "3px solid var(--primary)" }}>
        <h2 className="text-lg sm:text-xl font-bold mb-3">核心结论（先看这里）</h2>
        <div className="space-y-2 text-sm leading-relaxed">
          <p><b>1. 你的观察完全成立，而且是 100%：</b>44 个合约年中，<b style={{ color: RED }}>{sv.aboveStart}/{sv.total}</b> 都曾高于期初、<b style={{ color: RED }}>{sv.pullback}/{sv.total}</b> 都有回落——「先走高再走低」没有例外。</p>
          <p><b>2. 但「先高后低」藏着两种相反的结局：</b>早顶型（占 {sg.early.share}%）冲高后一路阴跌、末值 <b style={{ color: colorOf(sg.early.avgEnd) }}>{pct(sg.early.avgEnd)}</b>；晚顶型（占 {sg.late.share}%）涨了几乎全程、末值 <b style={{ color: colorOf(sg.late.avgEnd) }}>{pct(sg.late.avgEnd)}</b>。</p>
          <p><b>3. 早期走势无法预判</b>（AUC 全在 0.4–0.56 = 抛硬币），<b style={{ color: GREEN }}>但期初价的历史分位可以</b>：低位启动 80% 是晚顶，高位启动 82% 是早顶（置换检验 p={qs.permutation.pValue}）。</p>
          <p><b>4. 2705 预判：</b>Y2705（分位 {fc.contracts.Y2705.quantile}%）与 P2705（分位 {fc.contracts.P2705.quantile}%）均处高位 → <b style={{ color: RED }}>{fc.verdict}型</b>；叠加 05 合约自 {fc.structural.noLateSince} 年起连续无晚顶，倾向冲高回落、不宜持有到末段。</p>
          <p><b>5. 持仓量二次分析：</b>持仓曲线本身无预判力（早期 AUC≈0.5），<b style={{ color: GREEN }}>但期初持仓同比是独立的事前信号</b>（AUC {oi.lifecycle.earlyAuc.oiYoy}，置换检验 p={oi.lifecycle.permutation.pValue}）：同比缩量偏晚顶、增量偏早顶。与期初价分位叠加后，<b>低价+缩量 8/8 晚顶、高价+增量 7/9 早顶</b>；2705 上棕榈油两信号一致（持仓同比 {pct(oi.forecast.P2705.yoy ?? 0)}），豆油略冲突但信号弱（{pct(oi.forecast.Y2705.yoy ?? 0)}）。</p>
          <p><b>6. 持仓口径辨析：</b>早顶「高于历史同期」只在<b>同比</b>口径成立（AUC {dd.caliber.rows[0].auc}）；<b>历史分位</b>口径判别力仅 {dd.caliber.rows[1].auc}、分档不单调。把「同期」对齐到顶部同日会因交割前持仓枯竭产生伪信号（AUC {dd.sameTime.sameTimeYoy.auc}）；持仓峰进度早/晚顶几乎相同（{dd.peakPos.early.oiProgAvg}% / {dd.peakPos.late.oiProgAvg}%），<b style={{ color: t.fg }}>早顶的持仓峰并未更早到来</b>。</p>
        </div>
      </div>

      {/* ============ 序章 ============ */}
      <Card tag="探索起点" title="从一句话观察开始" desc="这份报告记录了一次完整的验证过程：从直觉观察，到用数据逐层证伪/证实，最后落到一个可执行的预判。">
        <p className="text-sm leading-relaxed">
          起点是一个朴素的盘面观察：<b>每个合约从期初建仓，会缓慢上升（多寡不论），到高点后回落——回落可能低于期初，也可能仍高于期初；大部分走势都是先走高再走低，个别极端合约除外。</b>
        </p>
        <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">要回答的问题因此变成两层：① 这个「形态」到底有多普遍？② 能不能提前知道某一年会落在哪种结局？下面按探索顺序展开。</p>
      </Card>

      {/* ============ 第一步 ============ */}
      <Card tag="第一步" title="形态验证：先高后低，44/44 成立" desc={`把豆油+棕榈油全部 ${sv.total} 个合约年逐一检查：窗口内是否曾高于期初、是否在终点前见顶、是否出现回落。`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { lab: "样本合约年", val: sv.total, note: "豆油22 + 棕榈油22" },
            { lab: "曾高于期初", val: `${sv.aboveStart}/${sv.total}`, note: "100% 成立" },
            { lab: "终点前见顶", val: `${sv.peakBeforeEnd}/${sv.total}`, note: "极少数终点即峰值" },
            { lab: "出现回落", val: `${sv.pullback}/${sv.total}`, note: "100% 成立" },
          ].map((k, i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: "var(--card-hover)" }}>
              <div className="text-[11px] text-[var(--muted)]">{k.lab}</div>
              <div className="text-xl font-bold mt-1" style={{ color: i === 0 ? undefined : RED }}>{k.val}</div>
              <div className="text-[10px] text-[var(--muted)] mt-0.5">{k.note}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-[var(--muted)] mb-2">结论：观察成立，且几乎没有例外。真正的差异不在「会不会先高后低」，而在「高点出现在窗口哪个位置」。</div>
      </Card>

      <Card tag="第一步 · 续" title="形态分叉：早顶型 vs 晚顶型" desc="按峰值出现在窗口的进度位置分组（<50% 早顶、≥80% 晚顶、其余中间）。同样先高后低，收益结果天差地别。">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <ReactECharts option={groupOption} style={{ height: 280, width: "100%" }} notMerge opts={{ renderer: "svg" }} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-[var(--muted)] border-b border-[var(--border)]">
                {["形态", "占比", "峰位", "峰涨幅", "末涨幅", "回落", "末>初"].map((h) => <th key={h} className="p-2 font-medium text-center whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {([["早顶型", sg.early], ["中间型", sg.mid], ["晚顶型", sg.late]] as [string, typeof sg.early][]).map(([name, g]) => (
                  <tr key={name} className="border-b border-[var(--border)]">
                    <td className="p-2 text-center font-semibold">{name}</td>
                    <td className="p-2 text-center">{g.share}%</td>
                    <td className="p-2 text-center">{g.avgPos}%</td>
                    <td className="p-2 text-center" style={{ color: RED }}>+{g.avgPeak}</td>
                    <td className="p-2 text-center font-semibold" style={{ color: colorOf(g.avgEnd) }}>{pct(g.avgEnd)}</td>
                    <td className="p-2 text-center">{g.avgFall}pp</td>
                    <td className="p-2 text-center">{g.endAbove}/{g.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-[var(--muted)] mt-3 leading-relaxed">
              早顶型：平均在窗口 21% 处见顶，冲高后回落 15pp，19 例里 15 例末值跌破期初。晚顶型：平均在 94% 处见顶，只回吐 6.7pp，20 例里 19 例末值仍高于期初。<b>肉眼都是「先起后落」，一个亏一个赚。</b>
            </p>
          </div>
        </div>
      </Card>

      <Card tag="第一步 · 实证" title="两条真实路径：同为「先高后低」，结局相反" desc="Y2001（晚顶，末+16%）与 Y2005（早顶，末-13%）的实际归一化逐日路径，横轴为窗口交易日进度。">
        <ReactECharts option={pathOption} style={{ height: 300, width: "100%" }} notMerge opts={{ renderer: "svg" }} />
      </Card>

      {/* ============ 第二步 ============ */}
      <Card tag="第二步" title="早期走势能预判吗？——不能（AUC ≈ 抛硬币）" desc="尝试用窗口前 3/5/7/10/20 日涨幅、振幅、波动率、是否跌破开盘等 11 个特征预判早/晚顶。AUC=0.5 表示毫无信息。">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div><ReactECharts option={aucOption} style={{ height: 300, width: "100%" }} notMerge opts={{ renderer: "svg" }} /></div>
          <div>
            <div className="rounded-lg p-3 mb-3" style={{ background: "var(--card-hover)" }}>
              <div className="text-xs text-[var(--muted)]">除期初价分位外，最强的早期走势特征</div>
              <div className="text-lg font-bold mt-1">{featLabel[ef.bestInvalidFeature] || ef.bestInvalidFeature} · AUC {ef.auc[ef.bestInvalidFeature]}</div>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                留一交叉验证命中率 {ef.loo.hits}/{ef.loo.total}（{Math.round(ef.loo.hits / ef.loo.total * 100)}%）≈ 多数类基线 {ef.baseline.hits}/{ef.baseline.total}。
              </div>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed mb-2"><b style={{ color: t.fg }}>反直觉的「诱多」：</b>早顶型开局反而涨得更多——前 10 日大涨后全年收跌的典型：</p>
            <div className="flex flex-wrap gap-2">
              {ef.lure.slice(0, 6).map((r) => (
                <span key={r.sym} className="text-[11px] px-2 py-1 rounded" style={{ background: "var(--card-hover)" }}>
                  {r.sym} 前10日 <b style={{ color: RED }}>+{r.r10}%</b> → 末 <b style={{ color: GREEN }}>{pct(r.end)}</b>
                </span>
              ))}
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-3 leading-relaxed">结论：开局冲得猛不是好事，反而是诱多。走势本身不含可预判信息，必须换维度。</p>
          </div>
        </div>
      </Card>

      {/* ============ 第三步 ============ */}
      <Card tag="第三步 · 关键发现" title="找到信号：期初价在历史中的位置" desc="不用看走势，只看合约期初的绝对价在该合约历史样本中的分位（0%=历史最低，100%=历史最高）。">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div><ReactECharts option={bandOption} style={{ height: 300, width: "100%" }} notMerge opts={{ renderer: "svg" }} /></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-[var(--muted)] border-b border-[var(--border)]">
                {["期初价分位", "样本", "晚顶", "早顶", "晚顶率", "平均末涨"].map((h) => <th key={h} className="p-2 font-medium text-center whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {qs.bands.map((b) => (
                  <tr key={b.label} className="border-b border-[var(--border)]">
                    <td className="p-2 text-center font-semibold whitespace-nowrap">{b.label}</td>
                    <td className="p-2 text-center">{b.n}</td>
                    <td className="p-2 text-center">{b.late}</td>
                    <td className="p-2 text-center">{b.early}</td>
                    <td className="p-2 text-center font-semibold" style={{ color: colorOf(b.lateRate - 50) }}>{b.lateRate}%</td>
                    <td className="p-2 text-center font-semibold" style={{ color: colorOf(b.avgEnd) }}>{pct(b.avgEnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 rounded-lg p-3 text-xs leading-relaxed" style={{ background: "var(--card-hover)" }}>
              早顶组期初分位均值 <b>{qs.earlyAvgQ}%</b>，晚顶组 <b>{qs.lateAvgQ}%</b>，差 {qs.permutation.diffPp}pp。
              置换检验（{qs.permutation.permutations.toLocaleString()} 次）<b style={{ color: GREEN }}>p={qs.permutation.pValue}</b> —— 真信号，不是噪声。
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {Object.entries(qs.byOil).map(([oil, b]) => (
            <div key={oil} className="rounded-lg p-3 text-xs" style={{ background: "var(--card-hover)" }}>
              <b>{oil}</b>：低分位晚顶率 <b style={{ color: GREEN }}>{b.lowLateRate}%</b>（{b.lowLate}/{b.lowN}） · 高分位晚顶率 <b style={{ color: RED }}>{b.highLateRate}%</b>（{b.highLate}/{b.highN}）
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-3 leading-relaxed">
          经济含义：从历史低位启动的合约上涨空间大、后劲足；从高位启动的天花板已近、冲高即出货。反例（高位仍晚顶 / 低位仍早顶）：{qs.exceptions.length ? qs.exceptions.map((e) => `${e.sym}(${e.q}%→${e.tag})`).join("、") : "无"}。规则非确定性——留一命中率仅约 59%。
        </p>
      </Card>

      {/* ============ 补充发现 ============ */}
      <Card tag="补充发现" title="7→8 月的跳涨：最干净的季节性信号" desc="09 合约窗口（4~9月）中，7 月末→8 月末这一段，豆油与棕榈油各自 7 个样本年全部为正。">
        <ReactECharts option={jumpOption} style={{ height: 280, width: "100%" }} notMerge opts={{ renderer: "svg" }} />
        <p className="text-[11px] text-[var(--muted)] mt-2">
          豆油均值 <b style={{ color: RED }}>+{mj.avgSoy}%</b>、棕榈油 <b style={{ color: RED }}>+{mj.avgPalm}%</b>；{mj.allPositive ? "14/14 年全部为正" : "多数年份为正"}。农产品季节性里这种一致性罕见——但注意这是平均路径，仍需结合上面的形态判断。
        </p>
      </Card>

      {/* ============ 二次分析：持仓量 ============ */}
      <Card tag="二次分析" title="加入持仓量：有效的是「期初持仓同比」，不是持仓曲线" desc={`新浪日线的每日持仓量并入全部 ${oi.coverage.withOi} 个合约年。先证伪直觉（持仓曲线无预判力），再给出真正有效的事前信号，并与期初价分位交叉。`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <ReactECharts option={oiCurveOption} style={{ height: 300, width: "100%" }} notMerge opts={{ renderer: "svg" }} />
            <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed">
              持仓生命周期与形态几乎无关：起点 100 → 20% 进度约 185 → 终点不足 10（临近交割移仓换月）。早顶、晚顶两条曲线基本重合；前 20 日持仓变化 AUC <b>{oi.lifecycle.earlyAuc.oiEarly20}</b>，与抛硬币无异。<b>看持仓曲线本身，预判不了形态。</b>
            </p>
          </div>
          <div>
            <ReactECharts option={oiSignalOption} style={{ height: 300, width: "100%" }} notMerge opts={{ renderer: "svg" }} />
            <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed">
              判别力 = |AUC−0.5|×2（0=抛硬币）。持仓同比低（新合约较上年同期缩量）指向晚顶：早顶组均值 <b style={{ color: RED }}>{pct(oi.lifecycle.earlyAvg)}</b>、晚顶组 <b style={{ color: GREEN }}>{pct(oi.lifecycle.lateAvg)}</b>，AUC <b>{oi.lifecycle.earlyAuc.oiYoy}</b>（反向 0.77），置换检验 <b style={{ color: GREEN }}>p={oi.lifecycle.permutation.pValue}</b>。但留一命中 {oi.lifecycle.loo.hits}/{oi.lifecycle.loo.total} vs 基线 {oi.lifecycle.baseline.hits}/{oi.lifecycle.baseline.total}，且与年份秩相关 ρ={oi.lifecycle.yearRho}——<b style={{ color: t.fg }}>概率倾向，不是确定性规则</b>。
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-sm font-semibold mb-2">双信号矩阵：期初价分位 × 期初持仓同比</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-[var(--muted)] border-b border-[var(--border)]">
                {["期初价分位", "持仓同比", "样本", "晚顶 / 早顶", "晚顶率", "平均末涨"].map((h, i) => <th key={h} className={`p-2 font-medium whitespace-nowrap ${i < 2 ? "text-left" : "text-center"}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {oi.matrix.map((c, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    <td className="p-2 text-left font-semibold whitespace-nowrap">{c.q}</td>
                    <td className="p-2 text-left whitespace-nowrap">{c.oi}</td>
                    <td className="p-2 text-center">{c.n}</td>
                    <td className="p-2 text-center">{c.late} / {c.early}</td>
                    <td className="p-2 text-center font-semibold" style={{ color: c.lateRate == null ? t.muted : colorOf(c.lateRate - 50) }}>{c.lateRate == null ? "—" : c.lateRate + "%"}</td>
                    <td className="p-2 text-center font-semibold" style={{ color: c.avgEnd == null ? t.muted : colorOf(c.avgEnd) }}>{c.avgEnd == null ? "—" : pct(c.avgEnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed">
            两个维度相互独立：<b style={{ color: GREEN }}>低价 + 缩量 8/8 全部晚顶、平均末涨 +28.5%</b>；<b style={{ color: RED }}>高价 + 增量 7/9 早顶、平均末涨 −2.2%</b>。单看一个信号是概率，叠加后极端组明显更干净。小样本（每格 7–9 例），只作倾向。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {[
            { lab: "早顶型 · 高点持仓", val: pct(oi.atPeak.earlyAvg), note: "高点时仍有大量持仓" },
            { lab: "晚顶型 · 高点持仓", val: pct(oi.atPeak.lateAvg), note: "高点时持仓已基本撤出" },
            { lab: "持仓峰进度 早 / 晚", val: `${oi.atPeak.oiPeakProgEarly}% / ${oi.atPeak.oiPeakProgLate}%`, note: "两组几乎相同 → 事后代理" },
          ].map((k, i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: "var(--card-hover)" }}>
              <div className="text-[11px] text-[var(--muted)]">{k.lab}</div>
              <div className="text-lg font-bold mt-1" style={{ color: i === 0 ? RED : i === 1 ? GREEN : undefined }}>{k.val}</div>
              <div className="text-[10px] text-[var(--muted)] mt-0.5">{k.note}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed">
          高点持仓水位区分力极强（{oi.atPeak.inc.n} 个「高点仍增仓」合约中晚顶 {oi.atPeak.inc.late} 个；{oi.atPeak.dec.n} 个「高点已减仓」中晚顶 {oi.atPeak.dec.late} 个），但持仓峰进度在两组几乎相同——<b style={{ color: t.fg }}>这是「价格高点什么时候出现」的事后代理</b>，不能事前用。盘中可这样用：价格创新高而持仓仍高企 → 警惕冲高回落；价格创新高但持仓已大幅萎缩 → 趋势已走到末段。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {Object.entries(oi.lifecycle.byOil).map(([oil, b]) => (
            <div key={oil} className="rounded-lg p-3 text-xs" style={{ background: "var(--card-hover)" }}>
              <b>{oil}</b>（n={b.n}）：持仓同比 AUC <b>{b.auc}</b>，早顶组均值 <b style={{ color: RED }}>{pct(b.earlyAvg)}</b> / 晚顶组 <b style={{ color: GREEN }}>{pct(b.lateAvg)}</b>
            </div>
          ))}
        </div>

        <div className="rounded-lg p-3 mt-4" style={{ background: "var(--card-hover)", borderLeft: "3px solid var(--primary)" }}>
          <div className="text-sm font-bold mb-2">2705 持仓交叉验证</div>
          <div className="text-xs space-y-1.5 leading-relaxed">
            <p>
              <b>豆油 Y2705：</b>当前持仓 {oi.forecast.Y2705.oi?.toLocaleString()}（{oi.forecast.Y2705.asof}），较 Y2605 同期 {oi.forecast.Y2705.prevOi?.toLocaleString()} <b style={{ color: colorOf(oi.forecast.Y2705.yoy ?? 0) }}>{pct(oi.forecast.Y2705.yoy ?? 0)}</b> → 持仓信号 <b>{oi.forecast.combined.Y2705.oiSignal}</b>；价格分位信号 <b>{oi.forecast.combined.Y2705.priceSignal}</b>。两信号冲突，但 −2.7% 接近零轴、属弱信号，<b style={{ color: t.fg }}>不足以推翻高分位的早顶倾向</b>。
            </p>
            <p>
              <b>棕榈油 P2705：</b>当前持仓 {oi.forecast.P2705.oi?.toLocaleString()}，较 P2605 同期 {oi.forecast.P2705.prevOi?.toLocaleString()} <b style={{ color: RED }}>{pct(oi.forecast.P2705.yoy ?? 0)}</b> → 持仓信号 <b style={{ color: RED }}>{oi.forecast.combined.P2705.oiSignal}</b>，与价格分位信号 <b>{oi.forecast.combined.P2705.priceSignal}</b> 一致——<b style={{ color: RED }}>棕榈油早顶判断被独立信号强化</b>。
            </p>
            <p className="text-[11px] text-[var(--muted)]">持仓代理同样用 11 月中旬口径，12 月窗口开启后需用真实起点持仓复核。{oi.forecast.combined.note}</p>
          </div>
        </div>
      </Card>

      {/* ============ 持仓深度辨析①：两个「历史同期」 ============ */}
      <Card tag="深度辨析 ①" title="早顶持仓真的高于历史同期吗？——两种口径，答案相反"
        desc="「历史同期」有两种合理定义：相对上一交割年同合约（同比），或在同品种同合约 7–8 年样本中排位。两者结论不同，必须说清口径。">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[var(--muted)] border-b border-[var(--border)]">
              {["口径", "早顶组", "晚顶组", "AUC（早>晚）", "结论"].map((h, i) => <th key={h} className={`p-2 font-medium whitespace-nowrap ${i === 0 || i === 4 ? "text-left" : "text-center"}`}>{h}</th>)}
            </tr></thead>
            <tbody>
              {dd.caliber.rows.map((row, i) => {
                const fmt = (g: { n: number; avg: number; pos: number }) => i === 0
                  ? `${pct(g.avg)} · 正增长 ${g.pos}/${g.n}`
                  : `Q${Math.round(g.avg)}% · Q≥65% ${g.pos}/${g.n}`;
                return (
                  <tr key={row.label} className="border-b border-[var(--border)]">
                    <td className="p-2 text-left font-semibold whitespace-nowrap">{row.label}</td>
                    <td className="p-2 text-center whitespace-nowrap" style={{ color: RED }}>{fmt(row.early)}</td>
                    <td className="p-2 text-center whitespace-nowrap" style={{ color: GREEN }}>{fmt(row.late)}</td>
                    <td className="p-2 text-center font-bold whitespace-nowrap" style={{ color: row.auc >= 0.65 ? RED : row.auc <= 0.55 ? t.muted : t.fg }}>
                      {row.auc}{row.auc >= 0.65 ? " ★" : ""}
                    </td>
                    <td className="p-2 text-left">{row.verdict}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <div className="text-sm font-semibold mb-2">按持仓历史分位分档 → 早顶率（分档不单调）</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {dd.caliber.buckets.map((b) => (
              <div key={b.label} className="rounded-lg p-2.5 text-center" style={{ background: "var(--card-hover)" }}>
                <div className="text-[11px] text-[var(--muted)]">{b.label}</div>
                <div className="text-base font-bold mt-1" style={{ color: b.earlyRate != null && b.earlyRate >= 60 ? RED : b.earlyRate != null && b.earlyRate <= 35 ? GREEN : undefined }}>
                  {b.earlyRate == null ? "—" : b.earlyRate + "%"}
                </div>
                <div className="text-[10px] text-[var(--muted)]">早顶 {b.early}/{b.n}</div>
              </div>
            ))}
          </div>
        </div>
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-[var(--muted)]">展开 {dd.caliber.earlyDetail.length} 个早顶合约的持仓分位 / 同比明细</summary>
          <div className="mt-2 leading-relaxed" style={{ color: t.fg }}>{dd.caliber.earlyDetail.join("　|　")}</div>
        </details>
        <p className="text-[11px] text-[var(--muted)] mt-3 leading-relaxed">
          {dd.caliber.note} 典型增仓案例 Y2401 +93%、Y2409 +102%、P2505 +44%、P2701 +43%；但也有反例 Y2301 −15%、P2601 −25%——<b style={{ color: t.fg }}>是概率倾向，不是铁律</b>。
        </p>
      </Card>

      {/* ============ 持仓深度辨析②：同刻证伪 + 峰位节奏 ============ */}
      <Card tag="深度辨析 ②" title="顶部当天与去年同一天比？——伪信号；持仓峰也没更早"
        desc="把「同期」理解成顶部所在的日历日（如 09 合约顶部 8–9 日），今年顶那天 vs 去年顶那天；再检验早顶合约的持仓峰是否提前到来。">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[var(--muted)] border-b border-[var(--border)]">
              {["同比对齐方式", "早顶组", "晚顶组", "AUC（早>晚）"].map((h, i) => <th key={h} className={`p-2 font-medium whitespace-nowrap ${i === 0 ? "text-left" : "text-center"}`}>{h}</th>)}
            </tr></thead>
            <tbody>
              {[
                { label: "顶部同日 vs 去年同日（伪）", s: dd.sameTime.sameTimeYoy },
                { label: "窗口起点 vs 去年起点（现用）", s: dd.sameTime.startYoy },
              ].map((r, i) => (
                <tr key={r.label} className="border-b border-[var(--border)]">
                  <td className="p-2 text-left font-semibold whitespace-nowrap">{r.label}</td>
                  <td className="p-2 text-center whitespace-nowrap" style={{ color: RED }}>{pct(r.s.early.avg)} · 正 {r.s.early.pos}/{r.s.early.n}</td>
                  <td className="p-2 text-center whitespace-nowrap" style={{ color: GREEN }}>{pct(r.s.late.avg)} · 正 {r.s.late.pos}/{r.s.late.n}</td>
                  <td className="p-2 text-center font-bold" style={{ color: i === 0 ? t.muted : RED }}>{r.s.auc}{i === 1 ? " ★" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-2 leading-relaxed">
          同为 {dd.sameTime.n} 例样本：顶部同日口径下晚顶组竟均值 <b style={{ color: GREEN }}>+322.4%</b>、AUC <b>0.500</b>（抛硬币）；换回窗口起点口径，晚顶组 −16.4%、AUC <b style={{ color: RED }}>0.714</b>。原因是临近交割持仓枯竭，分母接近零导致比值爆炸。
        </p>
        <div className="mt-3">
          <div className="text-sm font-semibold mb-2">晚顶组「同刻同比 &gt;100%」的异常样本（共 {dd.sameTime.outlierCount} 例）</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-[var(--muted)] border-b border-[var(--border)]">
                {["合约", "顶部日", "今年持仓", "去年同日", "同刻同比", "顶部占自身起点"].map((h, i) => <th key={h} className={`p-2 font-medium whitespace-nowrap ${i < 2 ? "text-left" : "text-center"}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {dd.sameTime.anomalies.map((a) => (
                  <tr key={a.sym} className="border-b border-[var(--border)]">
                    <td className="p-2 text-left font-semibold">{a.sym}</td>
                    <td className="p-2 text-left">{a.peakDate}</td>
                    <td className="p-2 text-center">{a.oiNow.toLocaleString()}</td>
                    <td className="p-2 text-center">{a.oiPrev.toLocaleString()}</td>
                    <td className="p-2 text-center font-bold" style={{ color: RED }}>{pct(a.yoy)}</td>
                    <td className="p-2 text-center" style={{ color: GREEN }}>{a.selfPeak}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          <div>
            <ReactECharts option={peakPosOption} style={{ height: 260, width: "100%" }} notMerge opts={{ renderer: "svg" }} />
          </div>
          <div className="rounded-lg p-3" style={{ background: "var(--card-hover)", borderLeft: "3px solid var(--primary)" }}>
            <div className="text-sm font-bold mb-2">持仓峰 vs 价格峰：谁先到？</div>
            <div className="text-xs space-y-1.5 leading-relaxed">
              <p>持仓峰进度：早顶 <b>{dd.peakPos.early.oiProgAvg}%</b>（中位 {dd.peakPos.early.oiProgMed}%）/ 晚顶 <b>{dd.peakPos.late.oiProgAvg}%</b>（中位 {dd.peakPos.late.oiProgMed}%），AUC <b>{dd.peakPos.aucOiProg}</b>——<b style={{ color: t.fg }}>两组几乎同一时点见持仓峰</b>。</p>
              <p>持仓峰 − 价格峰：早顶 <b style={{ color: RED }}>+{dd.peakPos.early.lagAvg} 个交易日</b>（{dd.peakPos.early.lagLater}/{dd.peakPos.early.n} 例持仓峰更晚）/ 晚顶 <b style={{ color: GREEN }}>{dd.peakPos.late.lagAvg} 个交易日</b>（{dd.peakPos.late.lagLater}/{dd.peakPos.late.n} 例更晚），AUC <b>{dd.peakPos.aucLag}</b>。</p>
              <p className="text-[11px] text-[var(--muted)]">{dd.peakPos.note}</p>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-3 leading-relaxed">
          结论：<b style={{ color: t.fg }}>持仓对比必须在流动性可比的窗口起点做；持仓峰的节奏两组一样，差异来自价格峰位置</b>。高点持仓水位之所以判别力强，本质是价格峰出现时点的代理，只能事后确认、不能事前预判。
        </p>
      </Card>

      {/* ============ 第四步：预测 2705 ============ */}
      <Card tag="最终预测" title="2705 合约形态预判" desc={`05 合约窗口 12 月才开始，当前用 11 月中旬价作起点代理。历史校准 Spearman ρ：豆油 ${fc.calibration.soyRho}、棕榈油 ${fc.calibration.palmRho}——代理价分位排序几乎无损。`}>
        <QuantileBar
          label="豆油 Y2705" price={fc.contracts.Y2705.price} q={fc.contracts.Y2705.quantile}
          note={`距挂牌高点 ${fc.contracts.Y2705.offHigh}%；低位启动偏晚顶，高位偏早顶`}
        />
        <QuantileBar
          label="棕榈油 P2705" price={fc.contracts.P2705.price} q={fc.contracts.P2705.quantile}
          note={`距挂牌高点 ${fc.contracts.P2705.offHigh}%；已处挂牌最低，但历史分位仍高`}
        />

        <div className="rounded-lg p-3 mb-4" style={{ background: "var(--card-hover)" }}>
          <div className="text-xs text-[var(--muted)] mb-2">05 合约形态演变（豆油 / 棕榈油，蓝=晚顶 黄=早顶 灰=中间）</div>
          <div style={{ display: "flex", gap: 6 }}>
            {fc.structural.years.map((y, i) => {
              const st = fc.structural.soy[i]?.tag;
              const pt = fc.structural.palm[i]?.tag;
              return (
                <div key={y} style={{ flex: 1, textAlign: "center", borderLeft: y === fc.structural.noLateSince ? "2px solid var(--border)" : undefined, paddingLeft: y === fc.structural.noLateSince ? 3 : 0 }}>
                  <div style={{ display: "flex", gap: 2, height: 26 }}>
                    <div style={{ flex: 1, background: tagColor[st] || "#D3D1C7", borderRadius: 4 }} title={`${y} 豆油 ${st}`} />
                    <div style={{ flex: 1, background: tagColor[pt] || "#D3D1C7", borderRadius: 4 }} title={`${y} 棕榈油 ${pt}`} />
                  </div>
                  <div style={{ fontSize: 10, marginTop: 4, color: "var(--muted)" }}>{String(y).slice(2)}</div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] text-[var(--muted)] mt-2 flex-wrap gap-2">
            <span>左列豆油 / 右列棕榈油</span>
            <span>晚顶年份：{fc.structural.lateYears.join("、")} → 自 {fc.structural.noLateSince} 年起连续无晚顶</span>
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ background: "var(--card-hover)", borderLeft: "3px solid var(--primary)" }}>
          <div className="text-sm font-bold mb-1">预判结论：<span style={{ color: RED }}>{fc.verdict}型</span></div>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Y2705 分位 {fc.contracts.Y2705.quantile}%、P2705 分位 {fc.contracts.P2705.quantile}% 均在高位区（&gt;65%），按「高位启动 82% 早顶」规则倾向早顶；
            叠加 05 合约自 {fc.structural.noLateSince} 年起的牛熊体制切换（连续四年无晚顶），判断两个 2705 大概率冲高后回落、结尾跌破或仅略高于期初。<b style={{ color: t.fg }}>采购上不宜持有到末段，冲高即分批锁价。</b>
            持仓二次验证：棕榈油持仓同比 {pct(oi.forecast.P2705.yoy ?? 0)}（增量）与价格分位同向、早顶判断加强；豆油持仓同比 {pct(oi.forecast.Y2705.yoy ?? 0)} 接近零轴、与高分位信号轻微冲突，<b style={{ color: t.fg }}>豆油留待 12 月真实起点复核，棕榈油先按早顶执行</b>。
          </p>
        </div>
      </Card>

      {/* ============ 局限与方法 ============ */}
      <Card tag="方法说明" title="口径、局限与更新" desc="让结论可被质疑，也要说清边界。">
        <div className="text-xs text-[var(--muted)] space-y-2 leading-relaxed">
          <p><b style={{ color: t.fg }}>形态定义：</b>早顶=峰值出现在窗口前 50%，晚顶=后 20%，中间=其余；峰值=窗口内最高价 high，末值=窗口最后交易日收盘。归一化基准为窗口起始交易日收盘=100。</p>
          <p><b style={{ color: t.fg }}>期初价分位：</b>合约期初绝对价在同品种、同月份合约 7–8 年样本中的百分位。这是相对小样本，历史窗口变化会改变数值。</p>
          <p><b style={{ color: t.fg }}>预判局限：</b>期初分位规则留一交叉验证命中率仅约 59%（多数类基线 51%），是概率倾向而非确定性规则；有反例，见上表。2705 用 11 月价代理，<b style={{ color: t.fg }}>{fc.caveat}</b></p>
          <p><b style={{ color: t.fg }}>持仓口径：</b>持仓量取新浪日线 p 字段（未平仓合约手数），窗口逐日与价格对齐。持仓同比 = 本交割年合约窗口首日持仓 ÷ 上一交割年同月份合约窗口首日持仓 − 1；2705 用 11 月中旬作代理。历史分位 = 同一品种同一合约 7–8 年样本中的排位；顶部同日同比（{dd.sameTime.n} 例）仅作证伪演示，因临近交割分母坍缩不可用。持仓峰进度取持仓序列最大值所在交易日 ÷ 窗口长度；峰差 = 持仓峰索引 − 价格峰索引（价格峰按 peak_date 在对齐序列中定位）。高点持仓水位为事后指标（依赖峰值日期），不可事前预判；持仓同比虽有置换检验支撑，但留一命中仅略高于多数类基线，且与年份秩相关 ρ={oi.lifecycle.yearRho}，存在体制混淆。</p>
          <p><b style={{ color: t.fg }}>数据边界：</b>期货主力合约价格，非现货采购价；未叠加基差、升贴水、运费、汇率。样本仅 7–8 年，其中约 3 年为极端牛市（2020–2022）。适合判断时间节奏与相对强弱，不宜单独决定采购量或锁价点位。</p>
          <p><b style={{ color: t.fg }}>自动更新：</b>历史规律由豆油/棕榈油分析数据复算；2705 实时价来自新浪财经。每个交易日自动重算，数据时间：{data.fetch_date}。</p>
        </div>
      </Card>

      {/* ============ 附录：全样本 ============ */}
      <Card tag="附录" title={`全部 ${allRows.length} 个合约年样本`} desc="可核对的逐条明细：按品种/合约/交割年列出峰位、形态、峰涨幅、末涨幅、回落、期初价分位、高点持仓与持仓同比。">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0" style={{ background: "var(--card)" }}>
              <tr className="text-[var(--muted)] border-b border-[var(--border)]">
                {["品种", "合约", "交割年", "峰位", "形态", "峰涨幅", "末涨幅", "回落", "期初分位", "高点持仓", "持仓同比"].map((h, i) => <th key={h} className={`p-2 font-medium whitespace-nowrap ${i < 3 ? "text-left" : "text-center"}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {allRows.map((r, i) => (
                <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)]">
                  <td className="p-2 text-left whitespace-nowrap">{r.oil}</td>
                  <td className="p-2 text-left whitespace-nowrap font-medium">{r.sym}</td>
                  <td className="p-2 text-left">{r.year}</td>
                  <td className="p-2 text-center">{r.pos}%</td>
                  <td className="p-2 text-center"><span className="px-1.5 py-0.5 rounded" style={{ background: tagColor[r.tag] || "#D3D1C7", color: "#2C2C2A" }}>{r.tag}</span></td>
                  <td className="p-2 text-center" style={{ color: RED }}>+{r.peak}</td>
                  <td className="p-2 text-center font-semibold" style={{ color: colorOf(r.end) }}>{pct(r.end)}</td>
                  <td className="p-2 text-center">{r.fall}</td>
                  <td className="p-2 text-center">{r.startPct == null ? "—" : r.startPct + "%"}</td>
                  <td className="p-2 text-center" style={{ color: r.oiAtPeak == null ? undefined : colorOf(r.oiAtPeak) }}>{r.oiAtPeak == null ? "—" : pct(r.oiAtPeak)}</td>
                  <td className="p-2 text-center" style={{ color: r.oiYoy == null ? undefined : colorOf(-r.oiYoy) }}>{r.oiYoy == null ? "—" : pct(r.oiYoy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
