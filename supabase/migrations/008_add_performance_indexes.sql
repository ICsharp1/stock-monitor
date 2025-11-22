-- Performance indexes for faster queries at scale
-- These indexes significantly speed up permission and role lookups

-- Speed up permission lookups by user (most common query)
-- Used every time user loads dashboard
CREATE INDEX IF NOT EXISTS idx_stock_permissions_user_id
  ON stock_permissions(user_id);

-- Speed up permission lookups by symbol
-- Used when checking if user can view specific stock
CREATE INDEX IF NOT EXISTS idx_stock_permissions_symbol
  ON stock_permissions(symbol);

-- Speed up combined lookups (user + symbol)
-- Used for permission checks like: "Can user123 view BTCUSDT?"
CREATE INDEX IF NOT EXISTS idx_stock_permissions_user_symbol
  ON stock_permissions(user_id, symbol);

-- Speed up user role lookups (used on every page load)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON user_roles(user_id);

-- Speed up stock lookups by symbol
-- Used when displaying stocks on dashboard
CREATE INDEX IF NOT EXISTS idx_stocks_symbol
  ON stocks(symbol);
