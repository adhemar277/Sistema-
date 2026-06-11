-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase

-- 1. Tabla de Usuarios (users)
CREATE TABLE IF NOT EXISTS public.users (
  email TEXT PRIMARY KEY,
  initials TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  last_access TEXT,
  status TEXT NOT NULL DEFAULT 'Activo',
  color TEXT,
  password TEXT
);

-- 2. Tabla de Inventario (inventory)
CREATE TABLE IF NOT EXISTS public.inventory (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lot TEXT,
  exp TEXT,
  qty INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  status TEXT NOT NULL,
  category TEXT,
  price NUMERIC NOT NULL DEFAULT 0
);

-- 3. Tabla de Movimientos (movements)
CREATE TABLE IF NOT EXISTS public.movements (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  sku TEXT NOT NULL REFERENCES public.inventory(sku) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  value NUMERIC NOT NULL DEFAULT 0,
  user_name TEXT,
  user_role TEXT
);

-- Desactivar temporalmente RLS (Row Level Security) para pruebas fáciles desde el cliente
-- (En producción deberías activarlo y crear políticas)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements DISABLE ROW LEVEL SECURITY;
