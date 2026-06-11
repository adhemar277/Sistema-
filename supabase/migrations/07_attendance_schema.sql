-- 1. Borrar la tabla anterior si existe para evitar conflictos de schema
DROP TABLE IF EXISTS attendance CASCADE;

-- 2. Crear la nueva tabla de Asistencia y Vacaciones (Soporta Internos y Externos)
CREATE TABLE attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id VARCHAR(255) NOT NULL, -- Será el Email para internos o CI para externos
    employee_name VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    total_vacation_days INTEGER DEFAULT 48, -- 4 días al mes * 12 meses
    used_vacation_days INTEGER DEFAULT 0,
    unjustified_absences INTEGER DEFAULT 0,
    branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, year)
);

-- 3. Habilitar Seguridad RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 4. Crear Políticas de Acceso
CREATE POLICY "Lectura asistencia pública" 
ON attendance FOR SELECT 
USING (true);

CREATE POLICY "Inserción asistencia pública" 
ON attendance FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Actualización asistencia pública" 
ON attendance FOR UPDATE 
USING (true);

CREATE POLICY "Borrado asistencia pública" 
ON attendance FOR DELETE 
USING (true);
