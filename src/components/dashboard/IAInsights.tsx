import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext'; 

interface AlertLog {
  id: string;
  nivel: 'info' | 'warning' | 'critical' | 'security';
  mensaje: string;
  sugerencia_ia: string;
  origen: string;
  leida_status: boolean;
  created_at: string;
}

export const IAInsights: React.FC = () => {
  const { inventory } = useAppData();
  const [insights, setInsights] = useState<AlertLog[]>([]);
  const [isLive] = useState(true);
  const navigate = useNavigate();

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

  const getStyleTokens = (nivel: string) => {
    switch (nivel) {
      case 'critical':
        return {
          bg: 'bg-rose-50/80', border: 'border-rose-200', text: 'text-rose-800', 
          icon: '⚠️ CRÍTICO', iconColor: 'text-rose-600', aiBg: 'bg-rose-100/50',
          pulse: 'animate-pulse'
        };
      case 'security':
        return {
          bg: 'bg-purple-50/80', border: 'border-purple-200', text: 'text-purple-800', 
          icon: '🛡️ SEGURIDAD', iconColor: 'text-purple-600', aiBg: 'bg-purple-100/50',
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
          icon: '💡 INFO', iconColor: 'text-sky-600', aiBg: 'bg-sky-100/50',
          pulse: ''
        };
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-100 p-6 flex flex-col h-full w-full max-w-2xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-inner">
            <span className="text-white font-black text-xl tracking-tighter">AI</span>
            {isLive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Motor de Decisiones IA</h2>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">
              {isLive ? 'Monitoreo Preventivo Activo' : 'Sistema Pausado'}
            </p>
          </div>
        </div>
      </div>

      {/* Insights Feed */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">✨</div>
            <p className="text-sm font-medium">El sistema opera en parámetros óptimos.</p>
          </div>
        ) : (
          insights.map((insight) => {
            const styles = getStyleTokens(insight.nivel);
            return (
              <div 
                key={insight.id} 
                className={`p-5 rounded-xl border ${styles.bg} ${styles.border} transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group`}
              >
                {/* Decoración lateral */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${insight.nivel === 'critical' ? 'bg-rose-500' : insight.nivel === 'security' ? 'bg-purple-500' : insight.nivel === 'warning' ? 'bg-amber-400' : 'bg-sky-400'}`}></div>

                <div className="flex items-start gap-4 ml-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-black tracking-wider ${styles.iconColor} ${insight.nivel === 'critical' ? styles.pulse : ''}`}>
                        {styles.icon}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-white/50 px-2 py-1 rounded-full">
                        {insight.origen}
                      </span>
                    </div>
                    
                    <h3 className={`text-base font-bold ${styles.text} mb-3 leading-tight`}>
                      {insight.mensaje}
                    </h3>
                    
                    <div className={`p-4 rounded-lg border border-white/60 ${styles.aiBg} backdrop-blur-sm relative`}>
                      <div className="absolute -left-2 -top-2 bg-[#3776BC] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                        SUGERENCIA IA
                      </div>
                      <p className={`text-sm font-medium text-slate-700 leading-relaxed mt-1`}>
                        {insight.sugerencia_ia}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
        <button onClick={() => setInsights([])} className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl transition-all border border-slate-200">
          Marcar todas como leídas
        </button>
        <button onClick={() => navigate('/reports')} className="flex-1 py-2.5 bg-[#3776BC] hover:bg-blue-800 text-white font-semibold text-sm rounded-xl transition-all shadow-sm shadow-indigo-200">
          Centro de Análisis Avanzado →
        </button>
      </div>
    </div>
  );
};
