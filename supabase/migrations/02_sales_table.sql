-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase

-- Tabla de Ventas (sales)
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  client TEXT NOT NULL,
  product_sku TEXT,
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Entregado',
  user_name TEXT
);

-- Desactivar RLS para pruebas (activar en producción con políticas)
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;

-- Agregar tabla de proveedores si no existe (con campos extendidos)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  contact TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Activo'
);

ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;

-- Agregar tabla de alertas si no existe
CREATE TABLE IF NOT EXISTS public.alerts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.alerts DISABLE ROW LEVEL SECURITY;
