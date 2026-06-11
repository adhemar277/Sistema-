-- Tabla de Órdenes de Compra (orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  supplier TEXT NOT NULL,
  item TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendiente',
  required_date TEXT
);

-- Desactivar RLS para pruebas
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
