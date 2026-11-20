"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";

/** 报告目录项：id=章节锚点，label=显示名，group=分组主题 */
export interface TocItem {
  id: string;
  label: string;
  group: string;
}

/** 分组主题色（500 级，明暗主题下均清晰可读），按分组首次出现顺序分配 */
const PALETTE = ["#3B82F6", "#8B5CF6", "#F59E0B", "#06B6D4", "#10B981", "#EC4899", "#84CC16", "#F43F5E"];

/**
 * 报告快速导航：桌面左侧 sticky 目录（自身可独立滚动），移动端顶部下拉。
 * 点击平滑定位，滚动自动高亮当前章节；页面到底强制高亮末项。
 */
export function ReportToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const groupColors = useMemo(() => {
    const m: Record<string, string> = {};
    let i = 0;
    for (const it of items) {
      if (!(it.group in m)) m[it.group] = PALETTE[i++ % PALETTE.length];
    }
    return m;
  }, [items]);

  useEffect(() => {
    const onScroll = () => {
      let cur = items[0]?.id ?? "";
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= 120) cur = item.id;
      }
      // 页面已到底时强制高亮末项（末项可能永远越不过判定线）
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60) {
        cur = items[items.length - 1]?.id ?? cur;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  // 目录自身可滚动时，保持当前高亮项在可见区内
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const btn = nav.querySelector<HTMLElement>(`[data-toc-id="${active}"]`);
    if (!btn) return;
    const nr = nav.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    if (br.top < nr.top) nav.scrollTop -= nr.top - br.top + 8;
    else if (br.bottom > nr.bottom) nav.scrollTop += br.bottom - nr.bottom + 8;
  }, [active]);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: "smooth" });
    setActive(id);
    setOpen(false);
  };

  const groups = useMemo(() => {
    return items.reduce<Record<string, TocItem[]>>((acc, item) => {
      (acc[item.group] ||= []).push(item);
      return acc;
    }, {});
  }, [items]);

  return (
    <>
      {/* 桌面：左侧竖排目录（目录自身可独立滚动） */}
      <aside className="hidden lg:block w-52 shrink-0">
        <div ref={navRef} className="sticky" style={{ top: 92, maxHeight: "calc(100vh - 108px)", overflowY: "auto", overflowX: "hidden", paddingRight: 4, scrollbarWidth: "thin" }}>
          <div className="text-[11px] font-semibold tracking-widest uppercase text-[var(--muted)] mb-2 px-2">快速导航</div>
          <nav className="space-y-3">
            {Object.entries(groups).map(([group, groupItems]) => (
              <div key={group}>
                <div className="flex items-center gap-1.5 px-2 mb-1.5">
                  <span className="inline-block rounded-sm shrink-0" style={{ width: 3, height: 13, background: groupColors[group] }} />
                  <span className="text-[13px] font-bold tracking-wide" style={{ color: groupColors[group] }}>{group}</span>
                </div>
                <div className="space-y-0.5">
                  {groupItems.map((item) => (
                    <button key={item.id} data-toc-id={item.id} onClick={() => go(item.id)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded transition-colors cursor-pointer"
                      style={{
                        color: active === item.id ? groupColors[item.group] : "var(--muted)",
                        background: active === item.id ? "var(--card-hover)" : "transparent",
                        fontWeight: active === item.id ? 600 : 400,
                        borderLeft: active === item.id ? `2px solid ${groupColors[item.group]}` : "2px solid transparent",
                      }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* 移动端：顶部下拉 */}
      <div className="lg:hidden mb-4">
        <button onClick={() => setOpen((v) => !v)}
          className="btn btn-secondary w-full flex items-center justify-between px-3 py-2 text-xs cursor-pointer">
          <span>快速导航 · <b style={{ color: "var(--primary)" }}>{items.find((x) => x.id === active)?.label}</b></span>
          <span>{open ? "收起 ▲" : "展开 ▼"}</span>
        </button>
        {open && (
          <div className="card mt-2 p-2 space-y-2">
            {Object.entries(groups).map(([group, groupItems]) => (
              <div key={group}>
                <div className="flex items-center gap-1.5 px-1 mb-1">
                  <span className="inline-block rounded-sm shrink-0" style={{ width: 3, height: 13, background: groupColors[group] }} />
                  <span className="text-[13px] font-bold" style={{ color: groupColors[group] }}>{group}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {groupItems.map((item) => (
                    <button key={item.id} onClick={() => go(item.id)}
                      className="text-left text-xs px-2 py-1.5 rounded cursor-pointer"
                      style={{
                        color: active === item.id ? groupColors[item.group] : "var(--muted)",
                        background: active === item.id ? "var(--card-hover)" : "transparent",
                        fontWeight: active === item.id ? 600 : 400,
                      }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
