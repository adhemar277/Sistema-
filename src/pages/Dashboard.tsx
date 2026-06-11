import React, { useState } from 'react';
import { Package, AlertTriangle, ArrowRightLeft, TrendingUp, X, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { IAInsights } from '../components/dashboard/IAInsights';
import { useAppData } from '../context/AppDataContext';

export const Dashboard: React.FC = () => {
  const { inventory, movements, payrolls, sales, purchases, activeBranchId, branches, seedDatabase, loading } = useAppData();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const stockTotal = inventory.reduce((sum, item) => sum + item.qty, 0);
  const lotesPorVencer = inventory.filter(item => item.status === 'Próximo a Vencer').length;
  const articulosBajoStock = inventory.filter(item => item.status === 'Bajo Stock').length;

  const d = new Date();
  const m = d.toLocaleString('es-BO', { month: 'long' });
  const currentMonthFilter = `${m.charAt(0).toUpperCase() + m.slice(1)} ${d.getFullYear()}`;
  const totalPayrolls = payrolls
    .filter(p => `${p.period_month} ${p.period_year}` === currentMonthFilter)
    .reduce((sum, p) => sum + p.net_pay, 0);

  // Calculate chart data for last 7 days
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const chartData = last7Days.map(date => {
    const dayMovs = movements.filter(m => new Date(m.date).toDateString() === date.toDateString());
    const entradas = dayMovs.filter(m => m.type === 'Entrada').reduce((acc, m) => acc + m.qty, 0);
    const salidas = dayMovs.filter(m => m.type === 'Salida' || m.type === 'Merma').reduce((acc, m) => acc + m.qty, 0);
    return {
      name: date.toLocaleDateString('es-BO', { weekday: 'short' }).charAt(0).toUpperCase() + date.toLocaleDateString('es-BO', { weekday: 'short' }).slice(1),
      Entradas: entradas,
      Salidas: salidas
    };
  });

  const movsDiarios = movements.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length;

  const generatePLReport = () => {
    const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
    const totalPurchases = (purchases || []).reduce((acc, p) => acc + Number(p.total_cost), 0);
    const totalSueldos = payrolls.reduce((acc, p) => acc + Number(p.net_pay), 0);
    const netProfit = totalSales - totalPurchases - totalSueldos;
    
    const activeBranchName = branches.find(b => b.id === activeBranchId)?.name || 'Central';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Estado de Resultados - ${activeBranchName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: #1e293b; border-bottom: 2px solid #3776BC; padding-bottom: 10px; }
            .section { margin-bottom: 30px; }
            .row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 10px 0; }
            .row.bold { font-weight: bold; font-size: 1.1em; }
            .row.profit { font-weight: 900; font-size: 1.3em; background: ${netProfit >= 0 ? '#f0fdf4' : '#fef2f2'}; padding: 15px; border: 1px solid ${netProfit >= 0 ? '#bbf7d0' : '#fecaca'}; border-radius: 8px; }
            .text-green { color: #16a34a; }
            .text-red { color: #dc2626; }
          </style>
        </head>
        <body onload="window.print()">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${window.location.origin}/logo.png" style="height: 60px; object-fit: contain;" />
            <h1>Estado de Resultados (P&L)</h1>
            <p><strong>Sucursal:</strong> ${activeBranchName}</p>
            <p><strong>Fecha de Generación:</strong> ${new Date().toLocaleString('es-BO')}</p>
          </div>

          <div class="section">
            <div class="row bold">
              <span>INGRESOS OPERATIVOS</span>
              <span>Bs. ${totalSales.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Total Ventas Realizadas</span>
              <span>Bs. ${totalSales.toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <div class="row bold">
              <span>COSTOS Y GASTOS (EGRESOS)</span>
              <span class="text-red">- Bs. ${(totalPurchases + totalSueldos).toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Costo de Compras a Proveedores</span>
              <span>Bs. ${totalPurchases.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Gasto en Planillas de Sueldos</span>
              <span>Bs. ${totalSueldos.toFixed(2)}</span>
            </div>
          </div>

          <div class="section">
            <div class="row profit">
              <span>RENTABILIDAD NETA</span>
              <span class="${netProfit >= 0 ? 'text-green' : 'text-red'}">Bs. ${netProfit.toFixed(2)}</span>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 50px; font-size: 0.8em; color: #64748b;">
            Documento generado automáticamente por Sistema de Gestión Inteligente PIL.<br/>
            Este es un reporte de gestión interna.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Resumen</h1>
          <p className="text-sm text-slate-500 mt-1">Métricas de la planta en tiempo real</p>
        </div>
        <button 
          onClick={generatePLReport} 
          className="flex items-center gap-2 bg-[#1e293b] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-slate-900 transition-colors"
        >
          <DollarSign size={16} /> Ver Estado de Resultados (P&L)
        </button>
      </div>

      {/* Seed button - always visible */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-amber-800 font-bold text-sm">⚙️ Administración de Datos (Supabase)</h3>
          <p className="text-amber-600 text-xs mt-1">Restablece los datos de prueba en la base de datos. Esto borrará y recargará todo.</p>
        </div>
        <button 
          onClick={seedDatabase} 
          disabled={loading} 
          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm w-full sm:w-auto text-center"
        >
          {loading ? 'Cargando...' : '🔄 Restablecer Datos'}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Stock */}
        <div className="bg-white p-5 rounded-xl border-t-4 border-[#3776BC] shadow-sm border-l border-r border-b border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 tracking-wider">STOCK TOTAL</span>
            <Package className="text-[#3776BC]" size={20} />
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-slate-800">{stockTotal.toLocaleString()}</h2>
            <p className="text-xs font-semibold text-emerald-500 mt-1 flex items-center gap-1">
              <TrendingUp size={12} /> Calculado en tiempo real
            </p>
          </div>
        </div>

        {/* Expiring Lots */}
        <div 
          onClick={() => setActiveModal('vencidos')}
          className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-rose-400 hover:shadow-md transition-all"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
          <div className="flex justify-between items-start ml-2">
            <span className="text-xs font-bold text-rose-600 tracking-wider">LOTES POR VENCER</span>
            <AlertTriangle className="text-rose-500" size={20} />
          </div>
          <div className="mt-4 ml-2">
            <h2 className="text-3xl font-black text-slate-800">{lotesPorVencer}</h2>
            <p className="text-xs font-semibold text-rose-500 mt-1 bg-rose-50 inline-block px-2 py-0.5 rounded group-hover:bg-rose-100 transition-colors">
              Click para ver detalles
            </p>
          </div>
        </div>

        {/* Low Stock Items */}
        <div 
          onClick={() => setActiveModal('bajostock')}
          className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between relative overflow-hidden cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
          <div className="flex justify-between items-start ml-2">
            <span className="text-xs font-bold text-amber-600 tracking-wider">ARTÍCULOS CON BAJO STOCK</span>
            <Package className="text-amber-500" size={20} />
          </div>
          <div className="mt-4 ml-2">
            <h2 className="text-3xl font-black text-slate-800">{articulosBajoStock}</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1 group-hover:text-amber-700 transition-colors">
              Click para ver detalles
            </p>
          </div>
        </div>

        {/* Daily Movements */}
        <div 
          onClick={() => setActiveModal('movimientos')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-slate-400 hover:shadow-md transition-all group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 tracking-wider">MOVIMIENTOS DIARIOS</span>
            <ArrowRightLeft className="text-slate-400" size={20} />
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-slate-800">{movsDiarios}</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1 group-hover:text-slate-700 transition-colors">
              <TrendingUp size={12} className="text-slate-400" /> Click para ver detalles
            </p>
          </div>
        </div>

        {/* Total Payrolls */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex justify-between items-start ml-2">
            <span className="text-xs font-bold text-emerald-700 tracking-wider">PLANILLAS ({currentMonthFilter.split(' ')[0].toUpperCase()})</span>
            <DollarSign className="text-emerald-600" size={20} />
          </div>
          <div className="mt-4 ml-2">
            <h2 className="text-2xl font-black text-slate-800">Bs. {totalPayrolls.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
              Gasto en sueldos proyectado
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Main Chart */}
        <div className="col-span-1 lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 flex flex-col h-[350px] md:h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Entradas vs Salidas (Últimos 7 Días)</h3>
            <button className="text-slate-400 hover:text-slate-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#F1F5F9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="square" wrapperStyle={{paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: '#475569'}} />
                <Bar dataKey="Entradas" fill="#1E3A8A" radius={[2, 2, 0, 0]} barSize={40} />
                <Bar dataKey="Salidas" fill="#CBD5E1" radius={[2, 2, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights & Recent Alerts Sidebar */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="flex-1 min-h-0">
            <IAInsights />
          </div>
        </div>
      </div>

      {/* Modals for Metrics */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[600px] overflow-hidden flex flex-col max-h-[80vh]">
            <div className={`px-6 py-4 border-b flex justify-between items-center ${activeModal === 'vencidos' ? 'bg-rose-50 border-rose-100' : activeModal === 'bajostock' ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-200'}`}>
              <h2 className="text-lg font-bold flex items-center gap-2">
                {activeModal === 'vencidos' && <><AlertTriangle size={20} className="text-rose-500"/> Lotes Próximos a Vencer / Vencidos</>}
                {activeModal === 'bajostock' && <><Package size={20} className="text-amber-500"/> Artículos con Bajo Stock</>}
                {activeModal === 'movimientos' && <><ArrowRightLeft size={20} className="text-slate-500"/> Movimientos Diarios</>}
              </h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-0 overflow-auto">
              <div className="overflow-x-auto w-full"><table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                  <tr>
                    {activeModal === 'movimientos' ? (
                      <>
                        <th className="px-4 py-3 font-semibold text-slate-600">Hora</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Producto</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Tipo</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Cant.</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 font-semibold text-slate-600">SKU</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Producto</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Cant.</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Estado</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeModal === 'movimientos' ? (
                    movements.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length > 0 ? (
                      movements.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).map(m => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500">{new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${m.type === 'Entrada' ? 'bg-emerald-100 text-emerald-700' : m.type === 'Salida' ? 'bg-indigo-100 text-[#3776BC]' : 'bg-rose-100 text-rose-700'}`}>{m.type}</span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-700">{m.qty}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No hay movimientos hoy</td></tr>
                    )
                  ) : activeModal === 'vencidos' ? (
                    inventory.filter(i => i.status === 'Próximo a Vencer' || i.status === 'Vencido').map(item => (
                      <tr key={item.sku} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{item.sku}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{item.qty} {item.unit}</td>
                        <td className="px-4 py-3 text-rose-600 font-semibold text-xs">{item.status}</td>
                      </tr>
                    ))
                  ) : (
                    inventory.filter(i => i.status === 'Bajo Stock').map(item => (
                      <tr key={item.sku} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{item.sku}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{item.qty} {item.unit}</td>
                        <td className="px-4 py-3 text-amber-600 font-semibold text-xs">{item.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table></div>
            </div>
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-right">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
