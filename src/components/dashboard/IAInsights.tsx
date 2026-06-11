import React, { useEffect, useState, useRef } from 'react';
import { useAppData } from '../../context/AppDataContext'; 
import { Send } from 'lucide-react';

interface AlertLog {
  id: string;
  nivel: 'info' | 'warning' | 'critical' | 'security' | 'user';
  mensaje: string;
  sugerencia_ia: string;
  origen: string;
  leida_status: boolean;
  created_at: string;
}

export const IAInsights: React.FC = () => {
  const { inventory, sales, payrolls, movements, cashRegisters, users, purchases, suppliers } = useAppData();
  const [insights, setInsights] = useState<AlertLog[]>([]);
  const [isLive] = useState(true);
  const [question, setQuestion] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newInsights: AlertLog[] = [];
    
    inventory.forEach((item, index) => {
      if (item.status === 'Próximo a Vencer') {
        newInsights.push({
          id: `vencer-${index}`,
          nivel: 'critical',
          mensaje: `Riesgo de Vencimiento: ${item.name}`,
          sugerencia_ia: `El lote ${item.lot} está próximo a vencer (${item.exp}). Se sugiere aplicar política de descuentos o preparar merma inmediata.`,
          origen: 'ai_agent',
          leida_status: false,
          created_at: new Date().toISOString()
        });
      } else if (item.status === 'Bajo Stock') {
        newInsights.push({
          id: `stock-${index}`,
          nivel: 'warning',
          mensaje: `Stock Crítico: ${item.name}`,
          sugerencia_ia: `Solo quedan ${item.qty} ${item.unit} del producto. Se recomienda emitir orden de compra al proveedor inmediatamente.`,
          origen: 'trigger_db',
          leida_status: false,
          created_at: new Date().toISOString()
        });
      }
    });

    if (newInsights.length === 0) {
      newInsights.push({
        id: 'info-ok',
        nivel: 'info',
        mensaje: 'Inventario Saludable',
        sugerencia_ia: 'No se detectaron anomalías en el inventario. Los ritmos de producción son normales.',
        origen: 'ai_agent',
        leida_status: false,
        created_at: new Date().toISOString()
      });
    }

    setInsights(newInsights);
  }, [inventory]);

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if(!question.trim()) return;

    const userMessage: AlertLog = {
      id: Date.now().toString(),
      nivel: 'user',
      mensaje: question,
      sugerencia_ia: '',
      origen: 'Usuario',
      leida_status: true,
      created_at: new Date().toISOString()
    };

    setInsights(prev => [...prev, userMessage]);
    const q = question.toLowerCase();
    setQuestion("");

    setTimeout(() => {
      let responseMsg = "No tengo una respuesta específica para eso, pero puedo analizar ventas, inventario, planillas, movimientos, compras, cajas y usuarios.";
      
      if (q.includes("resumen") || q.includes("finanzas") || q.includes("general") || q.includes("gano")) {
        const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
        const totalCompras = purchases.reduce((acc, p) => acc + p.total_cost, 0);
        const valorInventario = inventory.reduce((acc, i) => acc + (i.qty * i.price), 0);
        
        const now = new Date();
        const currentMonth = now.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });
        const planillasMes = payrolls.filter(p => `${p.period_month} ${p.period_year}`.toLowerCase() === currentMonth.toLowerCase() || p.period_month.toLowerCase() === now.toLocaleDateString('es-BO', { month: 'long' }).toLowerCase());
        const totalPlanillas = planillasMes.reduce((acc, p) => acc + p.net_pay, 0);

        const gananciaBruta = totalSales - totalCompras - totalPlanillas;

        responseMsg = `📊 RESUMEN FINANCIERO:\n\n• Ventas realizadas: ${sales.length}\n• Ingreso Total (Ventas): Bs. ${totalSales.toFixed(2)}\n• Gasto en Compras: Bs. ${totalCompras.toFixed(2)}\n• Gasto Planillas (${currentMonth}): Bs. ${totalPlanillas.toFixed(2)}\n• Ganancia Bruta Estimada: Bs. ${gananciaBruta.toFixed(2)}\n• Valor Actual del Inventario: Bs. ${valorInventario.toFixed(2)}`;

      } else if (q.includes("ventas") || q.includes("vendido") || q.includes("ingresos")) {
        const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
        const ultimas = sales.slice(-3).map(s => s.product_name).join(", ");
        responseMsg = `Se han registrado ${sales.length} ventas con un ingreso total de Bs. ${totalSales.toFixed(2)}. Las últimas ventas fueron: ${ultimas || 'Ninguna'}.`;
      } else if (q.includes("inventario") || q.includes("productos") || q.includes("stock")) {
        const inventarioDetallado = inventory.map(i => `• ${i.name} (Stock: ${i.qty} ${i.unit})`).join("\n");
        const bajoStock = inventory.filter(i => i.status === 'Bajo Stock');
        responseMsg = `Tenemos ${inventory.length} productos registrados (El stock se actualiza en vivo con cada venta o compra):\n\n${inventarioDetallado}\n\nActualmente hay ${bajoStock.length} con stock crítico.`;
      } else if (q.includes("vencer") || q.includes("vencidos")) {
        const vencidos = inventory.filter(i => i.status === 'Próximo a Vencer' || i.status === 'Vencido');
        const listaVencidos = vencidos.map(i => `• ${i.name} (Vence: ${i.exp} - Lote: ${i.lot})`).join("\n");
        responseMsg = vencidos.length > 0 ? `Atención, hay ${vencidos.length} productos vencidos o por vencer:\n\n${listaVencidos}` : "Todo el inventario está dentro de las fechas óptimas.";
      } else if (q.includes("planillas") || q.includes("sueldos") || q.includes("asistencias")) {
        const now = new Date();
        const mesActual = now.toLocaleDateString('es-BO', { month: 'long' });
        const planillasMes = payrolls.filter(p => p.period_month.toLowerCase() === mesActual.toLowerCase() || p.period_month.toLowerCase() === mesActual.substring(0, 3).toLowerCase() || p.period_month === (now.getMonth() + 1).toString().padStart(2, '0'));
        
        const sumPlanillas = planillasMes.reduce((acc, p) => acc + p.net_pay, 0);
        const listaPlanillas = planillasMes.map(p => `• ${p.employee_name}: Bs. ${p.net_pay.toFixed(2)} (${p.status})`).join("\n");
        
        responseMsg = `PLANILLAS DEL MES ACTUAL (${mesActual.toUpperCase()}):\n\n${listaPlanillas || 'No hay planillas generadas para este mes.'}\n\nPago total de planillas del mes: Bs. ${sumPlanillas.toFixed(2)}`;
      } else if (q.includes("usuarios") || q.includes("operarios") || q.includes("trabajadores") || q.includes("personal")) {
        const activos = users.filter(u => u.status === 'Activo');
        const nombres = activos.map(u => `• ${u.name} (Rol: ${u.role})`).join("\n");
        responseMsg = `Tenemos ${users.length} usuarios en total. Los ${activos.length} usuarios activos son:\n\n${nombres}`;
      } else if (q.includes("cajas") || q.includes("apertura") || q.includes("cierre")) {
        const cajasAbiertas = cashRegisters.filter(c => c.status === 'Abierta');
        const listaCajas = cajasAbiertas.map(c => `• Abierta por: ${c.opened_by} (Monto inicial: Bs. ${c.opening_balance})`).join("\n");
        responseMsg = `Actualmente hay ${cajasAbiertas.length} cajas abiertas${cajasAbiertas.length > 0 ? `:\n\n${listaCajas}` : '.'}`;
      } else if (q.includes("compras") || q.includes("proveedores") && !q.includes("proveedor principal")) {
        const sumCompras = purchases.reduce((acc, p) => acc + p.total_cost, 0);
        const listaUltimas = purchases.slice(-5).map(p => `• SKU: ${p.product_sku} a Proveedor: ${p.supplier_id} (Monto: Bs. ${p.total_cost})`).join("\n");
        responseMsg = `Se registraron ${purchases.length} compras por Bs. ${sumCompras.toFixed(2)}.\n\nÚltimas 5 compras realizadas:\n${listaUltimas || 'Ninguna'}`;
      } else if (q.includes("top") || q.includes("más vendidos") || q.includes("mas vendidos")) {
        // Top 3 productos vendidos
        const ventasPorProducto = sales.reduce((acc, s) => {
          acc[s.product_name] = (acc[s.product_name] || 0) + s.qty;
          return acc;
        }, {} as Record<string, number>);
        const topProductos = Object.entries(ventasPorProducto).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const listaTop = topProductos.map(([nombre, cant], idx) => `${idx + 1}. ${nombre} (${cant} vendidos)`).join("\n");
        responseMsg = topProductos.length > 0 ? `🏆 TOP 3 PRODUCTOS MÁS VENDIDOS:\n\n${listaTop}` : "Aún no hay ventas registradas para calcular un Top.";
        
      } else if (q.includes("sucursal") || q.includes("sucursales")) {
        const ventasPorSucursal = sales.reduce((acc, s) => {
          const branchId = s.branch_id || 'Principal';
          acc[branchId] = (acc[branchId] || 0) + s.total;
          return acc;
        }, {} as Record<string, number>);
        const listaSucursales = Object.entries(ventasPorSucursal).map(([id, total]) => `• Sucursal ${id}: Bs. ${total.toFixed(2)}`).join("\n");
        responseMsg = listaSucursales ? `🏢 VENTAS POR SUCURSAL:\n\n${listaSucursales}` : "No hay ventas por sucursal registradas.";

      } else if (q.includes("merma") || q.includes("mermas") || q.includes("movimiento") || q.includes("hoy") || q.includes("dia") || q.includes("día")) {
        const hoy = new Date().toDateString();
        const movsHoy = movements.filter(m => new Date(m.date).toDateString() === hoy);
        
        if (movsHoy.length > 0) {
          const listaMovs = movsHoy.map(m => {
            const signo = (m.type === 'Salida' || m.type === 'Merma') ? '-' : '+';
            return `• ${m.name} (${signo}${m.qty}) [${m.type}]`;
          }).join("\n");
          responseMsg = `📉 MOVIMIENTOS DE HOY (${movsHoy.length}):\n\n${listaMovs}`;
        } else {
          responseMsg = "No se ha registrado ningún movimiento de inventario el día de hoy.";
        }

      } else if (q.includes("inactivo") || q.includes("bloqueado")) {
        const inactivos = users.filter(u => u.status !== 'Activo' || u.lastAccess === 'Nunca');
        const listaInactivos = inactivos.map(u => `• ${u.name} (${u.status} - Último acceso: ${u.lastAccess})`).join("\n");
        responseMsg = inactivos.length > 0 ? `⏰ USUARIOS INACTIVOS O NUNCA CONECTADOS (${inactivos.length}):\n\n${listaInactivos}` : "Todos los usuarios están activos y tienen accesos recientes.";

      } else if (q.includes("proveedor principal") || q.includes("proveedores")) {
        // Agrupar compras por proveedor y calcular quién tiene el mayor total
        const comprasPorProveedor = purchases.reduce((acc, p) => {
          acc[p.supplier_id] = (acc[p.supplier_id] || 0) + p.total_cost;
          return acc;
        }, {} as Record<string, number>);
        const sortedProveedores = Object.entries(comprasPorProveedor).sort((a, b) => b[1] - a[1]);
        if (sortedProveedores.length > 0) {
          const listaProveedores = sortedProveedores.map(([supId, total]) => {
            const proveedorInfo = suppliers.find(s => s.id === supId);
            return `• ${proveedorInfo ? proveedorInfo.name : supId}: Bs. ${total.toFixed(2)}`;
          }).join("\n");
          responseMsg = `📊 COMPRAS POR PROVEEDOR:\nHas comprado a ${sortedProveedores.length} proveedores distintos:\n\n${listaProveedores}\n\nTu mayor proveedor es el ID: ${sortedProveedores[0][0]} con un total de Bs. ${sortedProveedores[0][1].toFixed(2)}.`;
        } else {
          responseMsg = "No hay compras registradas a proveedores aún.";
        }

      } else if (q.includes("reportes") || q.includes("informe")) {
        responseMsg = "Para reportes detallados puedes visitar el Centro de Análisis Avanzado desde el menú izquierdo. Puedo darte resúmenes aquí.";
      } else if (q.includes("hola") || q.includes("qué haces") || q.includes("que puedes")) {
        responseMsg = "¡Hola! Soy el Asistente IA. Puedo darte resúmenes financieros (ganancias, gastos, valor de inventario), y detalles de ventas, planillas del mes, y cajas.";
      }

      const aiResponse: AlertLog = {
        id: (Date.now() + 1).toString(),
        nivel: 'info',
        mensaje: "Análisis IA en tiempo real:",
        sugerencia_ia: responseMsg,
        origen: 'ai_agent',
        leida_status: false,
        created_at: new Date().toISOString()
      };
      setInsights(prev => [...prev, aiResponse]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, 800);
    
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const getStyleTokens = (nivel: string) => {
    switch (nivel) {
      case 'critical':
        return {
          bg: 'bg-rose-50/80', border: 'border-rose-200', text: 'text-rose-800', 
          icon: '⚠️ CRÍTICO', iconColor: 'text-rose-600', aiBg: 'bg-rose-100/50',
          pulse: 'animate-pulse'
        };
      case 'user':
        return {
          bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', 
          icon: '👤 TÚ', iconColor: 'text-indigo-600', aiBg: 'bg-transparent',
          pulse: ''
        };
      case 'warning':
        return {
          bg: 'bg-amber-50/80', border: 'border-amber-200', text: 'text-amber-800', 
          icon: '⚡ ATENCIÓN', iconColor: 'text-amber-600', aiBg: 'bg-amber-100/50',
          pulse: ''
        };
      default:
        return {
          bg: 'bg-sky-50/80', border: 'border-sky-200', text: 'text-sky-800', 
          icon: '🤖 IA', iconColor: 'text-sky-600', aiBg: 'bg-sky-100/50',
          pulse: ''
        };
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-100 flex flex-col h-full w-full max-w-2xl transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-inner">
            <span className="text-white font-black text-lg tracking-tighter">AI</span>
            {isLive && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Asistente IA</h2>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
              Monitoreo Activo + Chat
            </p>
          </div>
        </div>
      </div>

      {/* Insights Feed */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">✨</div>
            <p className="text-xs font-medium">Pregúntame cualquier cosa.</p>
          </div>
        ) : (
          insights.map((insight) => {
            const styles = getStyleTokens(insight.nivel);
            const isUser = insight.nivel === 'user';
            
            return (
              <div 
                key={insight.id} 
                className={`p-3 rounded-xl border ${styles.bg} ${styles.border} transition-all duration-300 relative ${isUser ? 'ml-auto max-w-[85%]' : 'mr-auto max-w-[90%]'}`}
              >
                {!isUser && <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${insight.nivel === 'critical' ? 'bg-rose-500' : insight.nivel === 'warning' ? 'bg-amber-400' : 'bg-sky-400'}`}></div>}

                <div className={`flex flex-col gap-1 ${!isUser && 'ml-2'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black tracking-wider ${styles.iconColor} ${insight.nivel === 'critical' ? styles.pulse : ''}`}>
                      {styles.icon}
                    </span>
                  </div>
                  
                  <h3 className={`text-xs font-bold ${styles.text} leading-tight`}>
                    {insight.mensaje}
                  </h3>
                  
                  {!isUser && insight.sugerencia_ia && (
                    <div className={`p-2.5 mt-2 rounded-lg border border-white/60 ${styles.aiBg} backdrop-blur-sm relative`}>
                      <p className={`text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap`}>
                        {insight.sugerencia_ia}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      
      {/* Chat Input Footer */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <form onSubmit={handleAskQuestion} className="flex gap-2">
          <input 
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pregunta sobre ventas o stock..."
            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button type="submit" disabled={!question.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2 rounded-lg flex items-center justify-center transition-colors">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
