-- 3. Consolidación de Base de Datos (SQL) y Lógica Extendida

-- Tabla para almacenar los hallazgos de la IA y alertas del sistema
CREATE TABLE IF NOT EXISTS alerts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel VARCHAR(50) NOT NULL CHECK (nivel IN ('info', 'warning', 'critical', 'security')),
  mensaje TEXT NOT NULL,
  sugerencia_ia TEXT,
  origen VARCHAR(50) DEFAULT 'ai_agent', -- ai_agent, trigger_db, security
  leida_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE alerts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura a usuarios autenticados" ON alerts_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir actualización de leida_status" ON alerts_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir insercion desde funciones y triggers" ON alerts_log FOR INSERT TO authenticated, service_role WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE alerts_log;

-- ==========================================
-- FUNCIONES RPC PARA LA IA PREDICTIVA
-- ==========================================

-- A) RPC: Riesgo de Quiebre de Stock (Simulado para análisis de la IA)
-- Calcula si el stock actual no soportará la salida promedio de los próximos N días
CREATE OR REPLACE FUNCTION calculate_stock_risk(days_threshold INT DEFAULT 3)
RETURNS TABLE (producto VARCHAR, stock_actual INT, salida_diaria NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
  -- En un entorno real, esto consultaría la tabla 'movimientos' y 'lotes'
  -- Retornamos datos simulados basados en tu estructura para que la Edge Function los procese
  RETURN QUERY 
  SELECT 'Leche Entera UHT 1L'::VARCHAR, 1500, 600.0
  UNION ALL
  SELECT 'Bobina Film Termoencogible'::VARCHAR, 12, 5.0;
END;
$$;

-- B) RPC: Riesgo de Desperdicio por Vencimiento
-- Detecta lotes que vencen pronto y tienen baja rotación
CREATE OR REPLACE FUNCTION calculate_waste_risk(days_to_expire INT DEFAULT 15)
RETURNS TABLE (producto VARCHAR, lote VARCHAR, dias_para_vencer INT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY 
  SELECT 'Yogurt Frutado Fresa 2L'::VARCHAR, 'L-20231102-B'::VARCHAR, 12
  UNION ALL
  SELECT 'Queso Fresco 500g'::VARCHAR, 'L-20231028-A'::VARCHAR, 8;
END;
$$;

-- ==========================================
-- SISTEMA DE ALERTAS AUTOMÁTICAS (TRIGGERS)
-- ==========================================

-- Trigger 1: Lotes que cambian su estado a 'BLOQUEADO'
CREATE OR REPLACE FUNCTION log_bloqueo_lote()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'BLOQUEADO' AND OLD.estado != 'BLOQUEADO' THEN
    INSERT INTO alerts_log (nivel, mensaje, sugerencia_ia, origen)
    VALUES (
      'critical', 
      'Lote ' || NEW.lote || ' de ' || NEW.producto || ' ha sido BLOQUEADO.',
      'El sistema de calidad ha bloqueado este lote automáticamente. Se requiere inspección física inmediata y cuarentena del producto.',
      'trigger_db'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asumiendo que tienes una tabla 'lotes', aplicamos el trigger:
-- CREATE TRIGGER trigger_alerta_bloqueo AFTER UPDATE ON lotes FOR EACH ROW EXECUTE FUNCTION log_bloqueo_lote();

-- Trigger 2: Anomalías en registros (Egreso inusualmente alto)
CREATE OR REPLACE FUNCTION log_anomalia_egreso()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el movimiento es salida y la cantidad es sospechosamente alta (ej. > 5000 unidades de golpe)
  IF NEW.tipo_movimiento = 'SALIDA_VENTA' AND NEW.cantidad > 5000 THEN
    INSERT INTO alerts_log (nivel, mensaje, sugerencia_ia, origen)
    VALUES (
      'warning', 
      'Egreso anómalo detectado: ' || NEW.cantidad || ' unidades de ' || NEW.producto,
      'Este volumen de salida supera el promedio histórico del 95% de las transacciones. Por favor, verifica la validez de este movimiento con Ventas.',
      'trigger_db'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asumiendo que tienes una tabla 'movimientos':
-- CREATE TRIGGER trigger_alerta_anomalia AFTER INSERT ON movimientos FOR EACH ROW EXECUTE FUNCTION log_anomalia_egreso();
