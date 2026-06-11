-- MIGRACIÓN NO DESTRUCTIVA: AÑADIR DATOS DE FACTURACIÓN A LA TABLA DE VENTAS (sales)
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase para habilitar columnas nativas de facturación interna.

-- 1. Añadir columna nit_ci si no existe
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS nit_ci TEXT;

-- 2. Añadir columna razon_social si no existe
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS razon_social TEXT;

-- 3. Comentario descriptivo en las columnas
COMMENT ON COLUMN public.sales.nit_ci IS 'Número de NIT o CI del cliente para facturación interna/recibo';
COMMENT ON COLUMN public.sales.razon_social IS 'Razón social del cliente para facturación interna/recibo';
