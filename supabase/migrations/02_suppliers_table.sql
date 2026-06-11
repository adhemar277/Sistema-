-- Ejecuta este script en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  contact TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Activo'
);

ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
