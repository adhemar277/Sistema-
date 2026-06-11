-- =========================================================================
-- MIGRACIÓN NO DESTRUCTIVA: ADAPTACIÓN DEL ESQUEMA A MULTI-SUCURSAL (ALTER TABLE)
-- =========================================================================

-- 1. Crear la tabla de sucursales (branches) si no existe
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT
);

-- Insertar sucursales por defecto para migrar los datos existentes sin perder información
INSERT INTO public.branches (id, name, address) 
VALUES 
  ('sucursal-a', 'Sucursal A - Central', 'Av. Jaime Mendoza #1420'),
  ('sucursal-b', 'Sucursal B - Calvo', 'Calle Calvo #350')
ON CONFLICT (id) DO NOTHING;

-- 2. Modificar la tabla de usuarios (users)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;

-- Asignar la sucursal por defecto a los usuarios existentes que no sean super_admin
UPDATE public.users 
SET branch_id = 'sucursal-a' 
WHERE role != 'super_admin' AND branch_id IS NULL;

-- 3. Modificar la tabla de inventario (inventory)
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS branch_id TEXT;

-- Asignar sucursal por defecto a todos los ítems de inventario existentes antes de aplicar restricciones NOT NULL
UPDATE public.inventory 
SET branch_id = 'sucursal-a' 
WHERE branch_id IS NULL;

-- Eliminar la restricción de clave primaria anterior sobre 'sku'
ALTER TABLE public.inventory 
DROP CONSTRAINT IF EXISTS inventory_pkey;

-- Hacer branch_id NOT NULL, añadir clave foránea y recrear la clave primaria compuesta (sku, branch_id)
ALTER TABLE public.inventory 
ALTER COLUMN branch_id SET NOT NULL;

-- Evitar duplicados de claves foráneas o primarias si ya se ejecutó antes
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS fk_inventory_branch;
ALTER TABLE public.inventory ADD CONSTRAINT fk_inventory_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE public.inventory ADD CONSTRAINT inventory_pkey PRIMARY KEY (sku, branch_id);

-- 4. Modificar movimientos (movements)
ALTER TABLE public.movements 
ADD COLUMN IF NOT EXISTS branch_id TEXT;

UPDATE public.movements 
SET branch_id = 'sucursal-a' 
WHERE branch_id IS NULL;

ALTER TABLE public.movements 
ALTER COLUMN branch_id SET NOT NULL;

ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS fk_movements_branch;
ALTER TABLE public.movements ADD CONSTRAINT fk_movements_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- 5. Modificar ventas (sales)
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS branch_id TEXT;

UPDATE public.sales 
SET branch_id = 'sucursal-a' 
WHERE branch_id IS NULL;

ALTER TABLE public.sales 
ALTER COLUMN branch_id SET NOT NULL;

ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS fk_sales_branch;
ALTER TABLE public.sales ADD CONSTRAINT fk_sales_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- 6. Modificar alertas (alerts)
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS branch_id TEXT;

UPDATE public.alerts 
SET branch_id = 'sucursal-a' 
WHERE branch_id IS NULL;

ALTER TABLE public.alerts 
ALTER COLUMN branch_id SET NOT NULL;

ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS fk_alerts_branch;
ALTER TABLE public.alerts ADD CONSTRAINT fk_alerts_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- 7. Modificar órdenes de compra (orders)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS branch_id TEXT;

UPDATE public.orders 
SET branch_id = 'sucursal-a' 
WHERE branch_id IS NULL;

ALTER TABLE public.orders 
ALTER COLUMN branch_id SET NOT NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS fk_orders_branch;
ALTER TABLE public.orders ADD CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- 8. Desactivar RLS para desarrollo rápido y fluido
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
