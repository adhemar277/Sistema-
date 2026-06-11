-- Tabla de Planillas de Sueldos
CREATE TABLE IF NOT EXISTS payrolls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id VARCHAR(100),
    employee_name VARCHAR(255),
    employee_ci VARCHAR(100),
    employee_role VARCHAR(100),
    period_month VARCHAR(50),
    period_year VARCHAR(4),
    worked_days INTEGER DEFAULT 30,
    base_salary DECIMAL(12, 2) DEFAULT 0,
    bonus_antiquity DECIMAL(12, 2) DEFAULT 0,
    bonus_production DECIMAL(12, 2) DEFAULT 0,
    total_income DECIMAL(12, 2) DEFAULT 0,
    afp DECIMAL(12, 2) DEFAULT 0,
    health_insurance DECIMAL(12, 2) DEFAULT 0,
    syndicate DECIMAL(12, 2) DEFAULT 0,
    rc_iva DECIMAL(12, 2) DEFAULT 0,
    total_discounts DECIMAL(12, 2) DEFAULT 0,
    net_pay DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pendiente',
    branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de RLS
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública para usuarios autenticados" 
ON payrolls FOR SELECT 
USING (auth.role() = 'authenticated' OR true);

CREATE POLICY "Inserción para usuarios con permisos" 
ON payrolls FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Actualización para usuarios con permisos" 
ON payrolls FOR UPDATE 
USING (true);

CREATE POLICY "Borrado para usuarios con permisos" 
ON payrolls FOR DELETE 
USING (true);
