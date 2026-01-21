import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 服务端 Supabase 客户端（使用 service_role key，具有写入权限）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// 服务端客户端（用于写入数据）- 懒加载
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.warn("Supabase admin client not configured: missing SUPABASE_SERVICE_ROLE_KEY");
        return null;
    }

    if (!_supabaseAdmin) {
        _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }
    return _supabaseAdmin;
}

// 类型定义
export interface FuturesPrice {
    id?: number;
    symbol: string;
    trade_date: string;
    close_price: number;
    created_at?: string;
}

export interface BasisData {
    id?: number;
    variety: string;
    trade_date: string;
    basis: number;
    created_at?: string;
}

export interface PositionData {
    id?: number;
    contract: string;
    trade_date: string;
    net_position: number;
    created_at?: string;
}

