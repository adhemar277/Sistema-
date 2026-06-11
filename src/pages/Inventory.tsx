import React, { useState, useEffect } from 'react';
import { Search, Download, Plus, X, Trash2, Camera, Scan, Activity, ArrowRightCircle, ArrowLeftCircle, AlertTriangle } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { supabase } from '../lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';

export const Inventory: React.FC = () => {
  const { inventory, setInventory, updateStock, deleteProduct, addMovement, movements, loggedInUser, activeBranchId } = useAppData();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ product: '', lot: '', exp: '', type: '', qty: '', category: 'Lácteos', price: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');
  const [movementDateFilter, setMovementDateFilter] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [traceLot, setTraceLot] = useState<{sku: string, lot: string, name: string} | null>(null);
  const [editData, setEditData] = useState({ sku: '', name: '', qty: '', type: 'Entrada' as 'Entrada' | 'Salida' | 'Merma', reason: '' });

  useEffect(() => {
    let html5QrCode: any = null;
    if (showScanner) {
      setTimeout(() => {
        html5QrCode = new Html5Qrcode("reader");
        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            setSearchTerm(decodedText);
            if(html5QrCode && html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                html5QrCode.clear();
                setShowScanner(false);
              }).catch((e:any) => console.log(e));
            } else {
              setShowScanner(false);
            }
          },
          (_error: any) => {
            // ignore
          }
        ).catch((err: any) => {
          console.error("Error starting scanner", err);
          alert("Error al iniciar cámara: Asegúrate de tener cámara web y permisos otorgados.");
        });
      }, 100);

      return () => {
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().then(() => html5QrCode.clear()).catch((e:any) => console.log(e));
        }
      };
    }
  }, [showScanner]);

  const handleSimulatedScan = () => {
    setFormData({ ...formData, product: 'Leche Deslactosada UHT 1L', category: 'Lácteos' });
    setShowScanner(false);
  };

  const handleExport = () => {
    const dataToExport = inventory.map(item => ({
      'SKU': item.sku,
      'Producto': item.name,
      'Lote': item.lot,
      'Fecha Vencimiento': item.exp,
      'Cantidad': item.qty,
      'Precio Uni/Kg (Bs.)': item.price,
      'Valor Lote (Bs.)': Number((item.qty * item.price).toFixed(2)),
      'Estado': item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, `inventario_pil_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = () => {
    const timestamp = new Date().toLocaleString('es-BO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write('<html><head><title>Reporte de Inventario PIL</title>');
    printWindow.document.write('<style>body { font-family: Arial, sans-serif; position: relative; min-height: 100vh; } body::before { content: "PIL CHUQUISACA S.A."; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; color: rgba(0, 0, 0, 0.04); z-index: -1; pointer-events: none; white-space: nowrap; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #3776BC; color: white; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div style="text-align: center; margin-bottom: 20px;">');
    const logoUrl = window.location.origin + '/logo.png';
    printWindow.document.write(`<img src="${logoUrl}" style="height: 80px; margin-bottom: 10px;" />`);
    printWindow.document.write('<h1 style="color: #3776BC; margin: 0;">PIL CHUQUISACA SA.</h1>');
    printWindow.document.write('<h2 style="margin: 5px 0;">Reporte de Inventario</h2>');
    printWindow.document.write(`<p style="color: #666; font-size: 14px; margin: 5px 0;">Generado el: ${timestamp}</p>`);
    printWindow.document.write('</div>');
    printWindow.document.write('<div className="overflow-x-auto w-full"><table><thead><tr><th>SKU</th><th>Producto</th><th>Lote</th><th>Fecha Venc.</th><th>Cantidad</th><th>Valor Lote</th><th>Estado</th></tr></thead><tbody>');
    
    const filteredInventory = inventory.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lot.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredInventory.forEach(item => {
      printWindow.document.write(`<tr><td>${item.sku}</td><td>${item.name}</td><td>${item.lot}</td><td>${item.exp}</td><td>${item.qty} ${item.unit}</td><td>Bs. ${(item.qty * item.price).toLocaleString('es-BO', {minimumFractionDigits: 2})}</td><td>${item.status}</td></tr>`);
    });
    
    const granTotal = filteredInventory.reduce((sum, item) => sum + (item.qty * item.price), 0);
    printWindow.document.write(`<tr><td colspan="5" style="text-align: right; font-weight: bold;">GRAN TOTAL:</td><td colspan="2" style="font-weight: bold;">Bs. ${granTotal.toLocaleString('es-BO', {minimumFractionDigits: 2})}</td></tr>`);
    
    printWindow.document.write('</tbody></table></div></body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleAdd = async () => {
    if (!formData.product) return;
    
    let status = 'Stock Saludable';
    let formattedExp = 'N/A';
    if (formData.exp && formData.exp !== 'N/A') {
      // Input date is YYYY-MM-DD
      const parts = formData.exp.split('-');
      if (parts.length === 3) {
        formattedExp = `${parts[2]}/${parts[1]}/${parts[0]}`;
        const expDate = new Date(`${formData.exp}T00:00:00`);
        const now = new Date();
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) status = 'Vencido';
        else if (diffDays <= 7) status = 'Próximo a Vencer';
      }
    }

    const price = parseFloat(formData.price) || 0;
    const qty = parseInt(formData.qty) || (Math.floor(Math.random() * 100) + 10);

    const newItem = {
      sku: 'PIL-NVO-' + Math.floor(Math.random() * 1000),
      branch_id: activeBranchId || '',
      name: formData.product,
      lot: formData.lot || 'L-PENDIENTE',
      exp: formattedExp,
      qty: qty,
      unit: formData.category === 'Lácteos' || formData.category === 'Envases' ? 'u.' : 'kg',
      status: qty <= 20 ? 'Bajo Stock' : status,
      category: formData.category,
      price: price
    };
    
    // Guardar en Supabase primero
    const { error } = await supabase.from('inventory').insert([newItem]);
    if (error) {
      alert('Error al guardar el producto: ' + error.message);
      return;
    }
    
    setInventory([newItem, ...inventory]);

    // Registrar movimiento si es ingreso
    addMovement({
      sku: newItem.sku,
      name: newItem.name,
      qty: qty,
      type: 'Entrada',
      reason: 'Ingreso Inicial',
      value: qty * price
    });

    setShowModal(false);
    setFormData({ product: '', lot: '', exp: '', type: '', qty: '', category: 'Lácteos', price: '' });
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.lot.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleEditSubmit = () => {
    if (!editData.qty || isNaN(Number(editData.qty))) return;
    updateStock(editData.sku, Number(editData.qty), editData.type, editData.reason || 'Ajuste manual');
    setShowEditModal(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de existencias y control de lotes</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={handleExport} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Download size={16} /> CSV
          </button>
          <button onClick={handleExportPDF} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-semibold hover:bg-rose-100 transition-colors">
            <Download size={16} /> PDF
          </button>
          {loggedInUser?.role !== 'Operario' && (
            <button 
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-indigo-800 transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={16} /> Nuevo Ingreso
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-[#3776BC] text-[#3776BC]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Existencias (Stock)
        </button>
        <button 
          onClick={() => setActiveTab('movements')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'movements' ? 'border-[#3776BC] text-[#3776BC]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Movimientos (Kardex)
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Controls Area */}
          <div className="bg-white p-4 rounded-t-xl border border-b-0 border-slate-200 flex flex-col md:flex-row gap-4 items-stretch md:items-center md:justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por SKU, Producto o Lote..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#3776BC] transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['Lácteos', 'Envases', 'Químicos'].map(cat => (
                <button 
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? 'Todos' : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${categoryFilter === cat ? 'bg-indigo-50 text-[#3776BC] border border-indigo-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {cat} {categoryFilter === cat && <X size={12} className="ml-1" />}
                </button>
              ))}
              <button onClick={() => setCategoryFilter('Todos')} className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-full text-xs font-semibold flex items-center gap-1 ml-auto md:ml-2 hover:bg-slate-50">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                Todos
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-b-xl flex-1 overflow-auto custom-scrollbar">
        <div className="overflow-x-auto w-full"><table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Producto</th>
              <th className="px-6 py-4">Lote</th>
              <th className="px-6 py-4">Fecha Vencimiento</th>
              <th className="px-6 py-4 text-right">Cantidad</th>
              <th className="px-6 py-4 text-right">Valor Lote (Bs.)</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInventory.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">{item.sku}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.category}</p>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-slate-500">
                  <button 
                    onClick={() => setTraceLot({sku: item.sku, lot: item.lot, name: item.name})}
                    className="flex items-center gap-1.5 text-[#3776BC] hover:text-indigo-800 hover:underline font-bold transition-colors bg-indigo-50 px-2 py-1 rounded"
                    title="Ver Trazabilidad"
                  >
                    <Activity size={14} /> {item.lot}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600">{item.exp}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-black text-slate-800">{item.qty} {item.unit}</span>
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-slate-700">
                  {(item.qty * item.price).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    item.status === 'Stock Saludable' ? 'bg-emerald-100 text-emerald-700' :
                    item.status === 'Próximo a Vencer' ? 'bg-amber-100 text-amber-700' :
                    item.status === 'Bajo Stock' ? 'bg-rose-100 text-rose-700' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditData({ sku: item.sku, name: item.name, qty: '', type: 'Entrada', reason: '' });
                          setShowEditModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#3776BC] hover:bg-indigo-50 rounded transition-colors"
                        title="Editar Stock"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      {(item.status === 'Bajo Stock' || item.status === 'Próximo a Vencer' || item.status === 'Vencido') && (
                        <button 
                          onClick={() => {
                            const encPhone = prompt("Ingrese el número de celular del encargado de Bodega (Ej: 71234567):");
                            if(encPhone) {
                              const msg = `*ALERTA DE INVENTARIO - PIL*%0A%0AProducto: ${item.name}%0ASKU: ${item.sku}%0ACantidad actual: ${item.qty} ${item.unit}%0AEstado: ${item.status}%0A%0APor favor gestionar inmediatamente.`;
                              window.open(`https://wa.me/591${encPhone.replace(/\s+/g,'')}?text=${msg}`, '_blank');
                            }
                          }}
                          className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                          title="Notificar por WhatsApp a Bodega"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </button>
                      )}
                      {loggedInUser?.role !== 'Operario' && (
                        <button 
                          onClick={() => {
                            if(window.confirm(`¿Seguro que desea eliminar el producto ${item.name}?`)) {
                              deleteProduct(item.sku);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Eliminar Producto"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="p-4 border-t border-slate-100 text-xs font-medium text-slate-500 flex justify-between items-center">
          <span>Mostrando {filteredInventory.length} registros</span>
          <div className="flex gap-1">
            <button className="p-1 border border-slate-200 rounded hover:bg-slate-50">&lt;</button>
            <button className="p-1 border border-slate-200 rounded hover:bg-slate-50">&gt;</button>
          </div>
        </div>
      </div>
      </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-b-xl flex-1 overflow-auto custom-scrollbar">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Historial de Movimientos</h3>
            <input 
              type="date" 
              value={movementDateFilter}
              onChange={(e) => setMovementDateFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]"
            />
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 text-right">Cantidad</th>
                  <th className="px-6 py-4">Motivo</th>
                  <th className="px-6 py-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements
                  .filter(m => !movementDateFilter || m.date.startsWith(movementDateFilter))
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((m, idx) => (
                    <tr key={m.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                        {new Date(m.date).toLocaleString('es-BO')}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">
                        {m.name}
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">{m.sku}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          m.type === 'Entrada' ? 'bg-emerald-100 text-emerald-700' :
                          m.type === 'Salida' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-right">
                        <span className={m.type === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'}>
                          {m.type === 'Entrada' ? '+' : '-'}{m.qty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{m.reason}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {m.userName || 'Sistema'}
                        <div className="text-[10px] text-slate-400">{m.userRole || ''}</div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 text-xs font-medium text-slate-500 text-center">
            Mostrando los últimos 10 movimientos
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[400px] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Actualizar Stock</h2>
                <p className="text-xs text-slate-500">{editData.name} ({editData.sku})</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tipo de Movimiento</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditData({...editData, type: 'Entrada'})}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${editData.type === 'Entrada' ? 'bg-[#3776BC] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >Entrada</button>
                  <button 
                    onClick={() => setEditData({...editData, type: 'Salida'})}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${editData.type === 'Salida' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >Salida</button>
                  <button 
                    onClick={() => setEditData({...editData, type: 'Merma'})}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${editData.type === 'Merma' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >Merma</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Cantidad</label>
                <input 
                  type="number" 
                  value={editData.qty}
                  onChange={(e) => setEditData({...editData, qty: e.target.value})}
                  placeholder="Ej. 50" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] focus:ring-1 focus:ring-indigo-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Razón (Opcional)</label>
                <input 
                  type="text" 
                  value={editData.reason}
                  onChange={(e) => setEditData({...editData, reason: e.target.value})}
                  placeholder={editData.type === 'Merma' ? 'Ej. Producto dañado' : 'Ej. Ajuste manual'} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] focus:ring-1 focus:ring-indigo-500" 
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleEditSubmit} className="px-4 py-2 text-sm font-bold text-white bg-[#3776BC] hover:bg-blue-800 rounded-lg shadow-sm transition-colors">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Scan size={20} className="text-[#3776BC]"/> Escáner de Código</h2>
              <button onClick={() => setShowScanner(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center">
              <div id="reader" className="w-full bg-black rounded-lg overflow-hidden border-2 border-slate-300"></div>
              <p className="text-center text-xs text-slate-500 mt-4 font-semibold">
                Apunta la cámara al código de barras del producto.
              </p>
              
              <button 
                onClick={handleSimulatedScan}
                className="w-full mt-6 py-3 bg-[#3776BC] text-white rounded-lg font-bold shadow-md hover:bg-blue-800 transition-colors"
              >
                Simular Detección Exitosa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Registrar Movimiento</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Producto</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      value={formData.product}
                      onChange={(e) => setFormData({...formData, product: e.target.value})}
                      placeholder="Buscar por nombre o SKU..." 
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] focus:ring-1 focus:ring-indigo-500" 
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowScanner(true); }}
                    className="p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 hover:text-[#3776BC] hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                    title="Escanear Código"
                  >
                    <Camera size={20} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Número de Lote</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.lot}
                      onChange={(e) => setFormData({...formData, lot: e.target.value})}
                      placeholder="EJ. L-2023-1045" 
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] focus:ring-1 focus:ring-indigo-500" 
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3776BC]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Fecha de Vencimiento</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={formData.exp}
                      onChange={(e) => setFormData({...formData, exp: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] focus:ring-1 focus:ring-indigo-500" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Cantidad y Tipo de Movimiento</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.qty}
                      onChange={(e) => setFormData({...formData, qty: e.target.value})}
                      placeholder="Ej. 1500" 
                      className="w-full pl-3 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] focus:ring-1 focus:ring-indigo-500" 
                    />
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="Precio Uni/Kg (Bs)" 
                      className="w-full pl-3 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] focus:ring-1 focus:ring-indigo-500" 
                    />
                  </div>
                  <div className="relative flex flex-col gap-2">
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 appearance-none focus:outline-none focus:border-[#3776BC] focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Lácteos">Lácteos</option>
                      <option value="Envases">Envases</option>
                      <option value="Químicos">Químicos</option>
                    </select>

                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 appearance-none focus:outline-none focus:border-[#3776BC] focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">Seleccione un código...</option>
                      <option value="in">Entrada por Producción</option>
                      <option value="out">Salida por Despacho</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAdd}
                className="flex items-center gap-2 px-6 py-2 bg-[#3776BC] text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                Confirmar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Traceability Modal */}
      {traceLot && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Activity size={20}/> Trazabilidad de Lote</h2>
                <p className="text-sm text-[#3776BC] mt-0.5">{traceLot.name} | <span className="font-mono font-bold bg-white px-2 py-0.5 rounded text-xs ml-1">{traceLot.lot}</span></p>
              </div>
              <button onClick={() => setTraceLot(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/50 relative">
              {/* Timeline Line */}
              <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-slate-200"></div>

              <div className="space-y-6 relative">
                {movements.filter(m => m.sku === traceLot.sku).length === 0 ? (
                  <p className="text-center text-slate-500 py-8 bg-white rounded-xl border border-slate-200">No hay movimientos registrados para este lote.</p>
                ) : (
                  movements.filter(m => m.sku === traceLot.sku).map((mov) => (
                    <div key={mov.id} className="flex gap-4 relative">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm border-2 z-10 shrink-0
                        {mov.type === 'Entrada' ? 'border-emerald-500 text-emerald-600' : mov.type === 'Salida' ? 'border-[#3776BC] text-[#3776BC]' : 'border-rose-500 text-rose-600'}"
                        style={{ borderColor: mov.type === 'Entrada' ? '#10b981' : mov.type === 'Salida' ? '#6366f1' : '#f43f5e', color: mov.type === 'Entrada' ? '#10b981' : mov.type === 'Salida' ? '#6366f1' : '#f43f5e' }}
                      >
                        {mov.type === 'Entrada' ? <ArrowRightCircle size={16} /> : mov.type === 'Salida' ? <ArrowLeftCircle size={16} /> : <AlertTriangle size={16} />}
                      </div>
                      <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800">{mov.type} de {mov.qty} unidades</h4>
                          <span className="text-xs font-semibold text-slate-500">
                            {new Date(mov.date).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{mov.reason}</p>
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {mov.userName?.substring(0, 2).toUpperCase() || 'SI'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 leading-none">{mov.userName || 'Sistema'}</p>
                            <p className="text-[10px] text-slate-500">{mov.userRole || 'Auto'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
