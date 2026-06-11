import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const executionLog = [];

    // =====================================================================
    // 1. Integración de IA Predictiva (Edge Functions)
    // =====================================================================
    
    // a) Riesgo de Quiebre de Stock (Lógica de Fallas)
    // Calculamos si el ritmo de salida agota el stock en los próximos 3 días.
    const { data: stockRiskData, error: stockRiskError } = await supabaseClient
      .rpc('calculate_stock_risk', { days_threshold: 3 });

    if (stockRiskData && stockRiskData.length > 0) {
      for (const item of stockRiskData) {
        // Validación: si el stock actual es menor a lo que saldría en 3 días (salida_diaria * 3)
        if (item.stock_actual < (item.salida_diaria * 3)) {
          const diasRestantes = Math.floor(item.stock_actual / item.salida_diaria);
          await supabaseClient.from('alerts_log').insert({
            nivel: 'critical',
            mensaje: `Riesgo de Quiebre de Stock: ${item.producto}`,
            sugerencia_ia: `El ritmo de salida (${item.salida_diaria} u/día) agotará el stock en aproximadamente ${diasRestantes} días. Se recomienda reabastecer inmediatamente al menos ${item.salida_diaria * 7} unidades para cubrir la semana.`,
            origen: 'ai_agent'
          });
          executionLog.push(`Alerta de Quiebre generada para: ${item.producto}`);
        }
      }
    }

    // b) Riesgo de Desperdicio (Lógica de Vencimiento)
    // Detectamos lotes con baja rotación que vencen en menos de 15 días.
    const { data: wasteRiskData, error: wasteRiskError } = await supabaseClient
      .rpc('calculate_waste_risk', { days_to_expire: 15 });

    if (wasteRiskData && wasteRiskData.length > 0) {
      for (const item of wasteRiskData) {
        await supabaseClient.from('alerts_log').insert({
          nivel: 'warning',
          mensaje: `Riesgo de Merma: Lote ${item.lote} de ${item.producto}`,
          sugerencia_ia: `Este lote vence en ${item.dias_para_vencer} días y su rotación histórica es baja. Sugerimos aplicar una Acción Promocional del 15% de descuento o despachar prioritariamente a clientes de alta demanda.`,
          origen: 'ai_agent'
        });
        executionLog.push(`Alerta de Desperdicio generada para: Lote ${item.lote}`);
      }
    }

    // =====================================================================
    // 2. Sistema de Alertas Automáticas (Seguridad)
    // =====================================================================
    
    // c) Intentos de acceso no autorizados
    // Simulamos la verificación de logs de autenticación anómalos (ej. múltiples fallos)
    // En producción esto leería de la tabla auth.audit_log_entries o una tabla de logs propia
    const securityCheckActive = true; 
    if (securityCheckActive) {
      // Simulación de detección:
      const suspiciousIpDetected = false; // Cambiar a true para simular
      if (suspiciousIpDetected) {
        await supabaseClient.from('alerts_log').insert({
          nivel: 'security',
          mensaje: 'Alerta de Seguridad: Intentos de acceso fallidos múltiples detectados.',
          sugerencia_ia: 'Se han registrado 5 intentos de acceso fallidos desde una IP no reconocida. Se recomienda forzar el cierre de sesión de cuentas inactivas y requerir 2FA para el personal administrativo.',
          origen: 'security'
        });
        executionLog.push('Alerta de Seguridad generada.');
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Ciclo de Análisis Preventivo completado con éxito.",
      logs: executionLog 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
