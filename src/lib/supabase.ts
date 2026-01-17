import { createClient } from "@supabase/supabase-js";

// 创建 Supabase 客户端
// 在生产环境中，请在 .env.local 中配置这些环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 类型定义
export interface User {
    id: string;
    email: string;
    role: "admin" | "user";
    created_at: string;
}

export interface DataSource {
    id: string;
    name: string;
    url: string;
    type: "api" | "web";
    schedule: string;
    last_run: string | null;
    status: "active" | "paused" | "error";
    created_by: string;
}

export interface ChartData {
    id: string;
    name: string;
    type: "line" | "area" | "bar" | "pie" | "kline";
    data: Record<string, unknown>;
    source_id: string;
    created_at: string;
    updated_at: string;
}
