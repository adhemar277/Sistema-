import React, { useState, useMemo } from 'react';
import { RefreshCcw, CreditCard, Truck, Download, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAppData } from '../context/AppDataContext';

export const Reports: React.FC = () => {
  const { movements, inventory } = useAppData();
  const [activeTab, setActiveTab] = useState('Mes');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const filteredMovements = useMemo(() => {
    const now = new Date();
    return movements.filter(m => {
      const d = new Date(m.date);
      if (activeTab === 'Hoy') {
        return d.toDateString() === now.toDateString();
      } else if (activeTab === 'Semana') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
      } else if (activeTab === 'Mes') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else if (activeTab === 'Personalizado') {
        if (!dateStart || !dateEnd) return true;
        const s = new Date(dateStart);
        const e = new Date(dateEnd);
        e.setHours(23, 59, 59);
        return d >= s && d <= e;
      }
      return true;
    });
  }, [movements, activeTab, dateStart, dateEnd]);

  const wasteData = useMemo(() => {
    // Collect mermas from filtered movements
    const mermas = filteredMovements
      .filter(m => m.type === 'Merma')
      .map(m => {
        // Encontrar el item original en el inventario para sacar Lote y SKU si es posible
        const invItem = inventory.find(i => i.sku === m.sku);
        return { sku: m.sku, product: m.name, lot: invItem?.lot || 'N/A', qty: m.qty, unit: invItem?.unit || 'u.', value: m.value || (m.qty * 10), cause: m.reason || 'Pérdida registrada' };
      });
    
    // Also include currently expired inventory as potential waste
    const vencidos = inventory
      .filter(i => i.status === 'Vencido')
      .map(i => ({ sku: i.sku, product: i.name, lot: i.lot, qty: i.qty, unit: i.unit, value: i.qty * i.price, cause: 'Vencimiento' }));
      
    return [...mermas, ...vencidos];
  }, [filteredMovements, inventory]);

  const dynamicChartData = useMemo(() => {
    // Group movements by date string
    const map = new Map();
    filteredMovements.forEach(m => {
      const dStr = new Date(m.date).toLocaleDateString('es-BO', { month: 'short', day: 'numeric' });
      if (!map.has(dStr)) map.set(dStr, { name: dStr, Producción: 0, Demanda: 0 });
      const current = map.get(dStr);
      if (m.type === 'Entrada') current.Producción += m.qty;
      else if (m.type === 'Salida') current.Demanda += m.qty;
    });
    return Array.from(map.values()).reverse();
  }, [filteredMovements]);

  const valorTotalInventario = useMemo(() => {
    return inventory.reduce((sum, item) => sum + (item.qty * item.price), 0);
  }, [inventory]);

  const eficienciaDespacho = useMemo(() => {
    const totalSalidas = filteredMovements.filter(m => m.type === 'Salida').reduce((acc, m) => acc + m.qty, 0);
    const totalMermas = filteredMovements.filter(m => m.type === 'Merma').reduce((acc, m) => acc + m.qty, 0);
    if (totalSalidas + totalMermas === 0) return 100;
    return (totalSalidas / (totalSalidas + totalMermas)) * 100;
  }, [filteredMovements]);

  const handleExport = () => {
    const timestamp = new Date().toLocaleString('es-BO');
    const csvContent = "Reporte Generado: " + timestamp + "\n" +
      "SKU,Producto,Lote,Cantidad Perdida,Valor Economico,Causa Principal\n" + 
      wasteData.map(item => `${item.sku},${item.product},${item.lot},${item.qty} ${item.unit},${item.value.toFixed(2)},${item.cause}`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `reporte_perdidas_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const timestamp = new Date().toLocaleString('es-BO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write('<html><head><title>Reporte de Pérdidas PIL</title>');
    printWindow.document.write('<style>body { font-family: Arial, sans-serif; position: relative; min-height: 100vh; } body::before { content: "PIL CHUQUISACA S.A."; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; color: rgba(0, 0, 0, 0.04); z-index: -1; pointer-events: none; white-space: nowrap; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #3776BC; color: white; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div style="text-align: center; margin-bottom: 20px;">');
    const logoUrl = window.location.origin + '/logo.png';
    printWindow.document.write(`<img src="${logoUrl}" style="height: 80px; margin-bottom: 10px;" />`);
    printWindow.document.write('<h1 style="color: #3776BC; margin: 0;">PIL CHUQUISACA SA.</h1>');
    printWindow.document.write('<h2 style="margin: 5px 0;">Reporte de Pérdidas y Vencimientos</h2>');
    printWindow.document.write(`<p style="color: #666; font-size: 14px; margin: 5px 0;">Generado el: ${timestamp}</p>`);
    printWindow.document.write('</div>');
    printWindow.document.write('<div className="overflow-x-auto w-full"><table><thead><tr><th>SKU</th><th>Producto</th><th>Lote</th><th>Cantidad Perdida</th><th>Valor Económico</th><th>Causa Principal</th></tr></thead><tbody>');
    
    wasteData.forEach(item => {
      printWindow.document.write(`<tr><td>${item.sku}</td><td>${item.product}</td><td>${item.lot}</td><td>${item.qty} ${item.unit}</td><td>Bs. ${item.value.toFixed(2)}</td><td>${item.cause}</td></tr>`);
    });
    
    printWindow.document.write('</tbody></table></div></body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reportes y Analítica</h1>
          <p className="text-slate-500 text-sm mt-1">Visualización de métricas de inventario y eficiencia operativa.</p>
        </div>
        <div className="flex flex-wrap bg-white rounded-lg p-1 border border-slate-200 shadow-sm text-sm w-full sm:w-auto">
          {['Hoy', 'Semana', 'Mes'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setShowCustomDate(false); }}
              className={`flex-1 sm:flex-none justify-center px-4 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === tab 
                  ? 'bg-slate-100 text-slate-800' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
          <button 
            onClick={() => { setActiveTab('Personalizado'); setShowCustomDate(!showCustomDate); }}
            className={`flex-1 sm:flex-none justify-center px-4 py-1.5 font-medium flex items-center gap-2 border-l border-slate-200 ml-1 transition-colors ${activeTab === 'Personalizado' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calendar size={14} />
            Personalizado
          </button>
        </div>
      </div>

      {showCustomDate && (
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-semibold text-slate-600 w-16 sm:w-auto">Desde:</span>
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-full sm:w-auto px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#3776BC]" />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-semibold text-slate-600 w-16 sm:w-auto">Hasta:</span>
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-full sm:w-auto px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#3776BC]" />
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            <span>Índice de Rotación</span>
            <RefreshCcw size={16} className="text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-slate-800">4.2x</h2>
            <span className="text-xs font-bold text-[#3776BC]">+0.3 vs mes ant.</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            <span>Valor Total del Inventario</span>
            <CreditCard size={16} className="text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-slate-800">Bs. {(valorTotalInventario / 1000).toFixed(2)}K</h2>
            <span className="text-xs font-bold text-slate-500">Valor Real</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            <span>Eficiencia de Despacho</span>
            <Truck size={16} className="text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-slate-800">{eficienciaDespacho.toFixed(1)}%</h2>
            <span className={`text-xs font-bold ${eficienciaDespacho >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {eficienciaDespacho >= 95 ? 'Óptimo' : 'Requiere Atención'}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Row */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-6">Producción vs Demanda (Últimos 6 Meses)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dynamicChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
              <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Legend iconType="square" align="right" verticalAlign="top" wrapperStyle={{paddingBottom: '20px', fontSize: '12px', fontWeight: 600, color: '#475569'}} />
              <Bar dataKey="Producción" fill="#003366" radius={[2, 2, 0, 0]} barSize={30} />
              <Bar dataKey="Demanda" fill="#93C5FD" radius={[2, 2, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Row */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <h3 className="text-base font-bold text-slate-800">Resumen de Pérdidas por Vencimiento</h3>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button onClick={handleExport} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
              <Download size={14} /> Exportar CSV
            </button>
            <button onClick={handleExportPDF} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 bg-rose-50 border border-rose-200 rounded-lg transition-colors">
              <Download size={14} /> Exportar PDF
            </button>
          </div>
        </div>
        <div className="overflow-auto custom-scrollbar">
          <div className="overflow-x-auto w-full"><table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">Producto</th>
                <th className="px-6 py-3">Cantidad Perdida</th>
                <th className="px-6 py-3">Valor Económico</th>
                <th className="px-6 py-3">Causa Principal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wasteData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium text-sm">
                    <span className="text-3xl block mb-2 opacity-50">✨</span>
                    No hay registros de pérdidas o mermas en este periodo.
                  </td>
                </tr>
              ) : (
                wasteData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <span className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-lg">⚠️</span>
                      {item.product}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {item.qty} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-rose-600">
                      Bs. {item.value.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 rounded-md">
                        {item.cause}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
};
