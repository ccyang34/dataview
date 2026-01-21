-- Supabase 数据表创建脚本
-- 请在 Supabase SQL Editor 中执行

-- 期货价格历史（豆油Y0、豆粕M0、豆二B0、棕榈油P0、菜油OI0）
CREATE TABLE IF NOT EXISTS futures_price (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,      -- Y0, M0, B0, P0, OI0
    trade_date DATE NOT NULL,
    close_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, trade_date)
);

-- 基差数据历史（豆油、豆粕）
CREATE TABLE IF NOT EXISTS basis_data (
    id SERIAL PRIMARY KEY,
    variety VARCHAR(10) NOT NULL,     -- Y, M
    trade_date DATE NOT NULL,
    basis DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(variety, trade_date)
);

-- 持仓数据（COFCO豆油空头持仓）
CREATE TABLE IF NOT EXISTS position_data (
    id SERIAL PRIMARY KEY,
    contract VARCHAR(10) NOT NULL,    -- Y2505, Y2509 等
    trade_date DATE NOT NULL,
    net_position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract, trade_date)
);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_futures_price_symbol_date ON futures_price(symbol, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_basis_data_variety_date ON basis_data(variety, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_position_data_contract_date ON position_data(contract, trade_date DESC);

-- 启用行级安全（RLS）
ALTER TABLE futures_price ENABLE ROW LEVEL SECURITY;
ALTER TABLE basis_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_data ENABLE ROW LEVEL SECURITY;

-- 创建公共读取策略（所有人可读）
CREATE POLICY "Public read access" ON futures_price FOR SELECT USING (true);
CREATE POLICY "Public read access" ON basis_data FOR SELECT USING (true);
CREATE POLICY "Public read access" ON position_data FOR SELECT USING (true);

-- 创建服务角色写入策略（只有服务角色可写）
CREATE POLICY "Service write access" ON futures_price FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write access" ON basis_data FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write access" ON position_data FOR ALL USING (auth.role() = 'service_role');
