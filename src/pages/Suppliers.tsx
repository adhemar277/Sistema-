import React, { useState, useEffect } from "react";
import { ShoppingBag, Search, X, Plus, Trash2, FileText, TrendingDown, Package, CheckCircle2, Truck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAppData } from "../context/AppDataContext";

interface Supplier { id: string; name: string; category: string; contact: string; phone: string; status: string; }
interface Order { id: string; branch_id?: string; date: string; supplier: string; amount: number; status: "Pendiente"|"Recibido"|"Cancelado"; item?: string; qty?: number; price?: number; required_date?: string; }

const defaultOrders: Order[] = [
  { id: "OC-100201", date: "15/05/2026", supplier: "Empaques Bolivia S.A.", item: "Bobina Film Termoencogible", qty: 25, price: 120.0, amount: 3000.0, status: "Pendiente", required_date: "20/05/2026" },
  { id: "OC-100202", date: "12/05/2026", supplier: "Lácteos del Sur", item: "Leche Fresca (Materia Prima)", qty: 5000, price: 4.5, amount: 22500.0, status: "Recibido", required_date: "15/05/2026" },
];

const defaultSuppliers: Supplier[] = [
  { id:"PRV-001", name:"Empaques Bolivia S.A.", category:"Envases", contact:"Juan Pérez", phone:"+591 71234567", status:"Activo" },
  { id:"PRV-002", name:"Químicos Industriales SRL", category:"Químicos", contact:"María López", phone:"+591 79876543", status:"Activo" },
  { id:"PRV-003", name:"Lácteos del Sur", category:"Lácteos (Materia Prima)", contact:"Carlos Mamani", phone:"+591 75551234", status:"Activo" },
];

const catIcon = (cat: string) => {
  if (cat.includes("Envas")) return "📦";
  if (cat.includes("Quím") || cat.includes("Adit")) return "🧪";
  return "🥛";
};

export const Suppliers: React.FC = () => {
  const { activeBranchId, purchases, inventory, addPurchase } = useAppData();
  const [activeTab, setActiveTab] = useState<"proveedores" | "compras">("proveedores");
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingS, setLoadingS] = useState(true);
  const [search, setSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("Todos");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllSuppliers, setShowAllSuppliers] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [poModal, setPoModal] = useState<Order | null>(null);
  const [poData, setPoData] = useState({ item:"", qty:"500", price:"0", date: new Date(Date.now()+86400000*3).toISOString().split("T")[0] });
  const [newS, setNewS] = useState({ name:"", category:"", contact:"", phone:"" });
  const [newOrder, setNewOrder] = useState({ supplier:"", item:"", qty:"100", price:"", status:"Pendiente" as Order["status"], required_date:"" });
  const [saving, setSaving] = useState(false);

  // Compras reales (Ingreso de Mercadería)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseData, setPurchaseData] = useState({ supplierId: "", productSku: "", qty: "", totalCost: "" });
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState("");

  useEffect(() => {
    fetchSuppliers();
    fetchOrders();
  }, [activeBranchId]);

  useEffect(() => {
    if (poModal) {
      setPoData({
        item: poModal.item || "",
        qty: String(poModal.qty || 1),
        price: String(poModal.price || 0),
        date: poModal.required_date || new Date(Date.now()+86400000*3).toISOString().split("T")[0]
      });
    }
  }, [poModal]);

  const fetchOrders = async () => {
    if (!activeBranchId) return;
    const { data, error } = await supabase.from("orders").select("*").eq("branch_id", activeBranchId).order("date", { ascending: false });
    if (error) {
      console.warn("Error leyendo de Supabase orders, usando local:", error.message);
      const local = localStorage.getItem("orders_fallback");
      if (local) {
        setOrders(JSON.parse(local));
      } else {
        setOrders(defaultOrders);
        localStorage.setItem("orders_fallback", JSON.stringify(defaultOrders));
      }
    } else {
      // Supabase es la fuente de verdad. Si está vacío, respetamos que haya 0 órdenes
      setOrders(data || []);
      localStorage.setItem("orders_fallback", JSON.stringify(data || []));
    }
  };

  const fetchSuppliers = async () => {
    setLoadingS(true);
    const { data, error } = await supabase.from("suppliers").select("*").order("id");
    if (error || !data || data.length === 0) { setSuppliers(defaultSuppliers); }
    else { setSuppliers(data); }
    setLoadingS(false);
  };

  const handleAdd = async () => {
    if (!newS.name || !newS.category || !newS.contact || !newS.phone) return;
    setSaving(true);
    const id = `PRV-${String(Date.now()).slice(-6)}`;
    const s: Supplier = { id, ...newS, status:"Activo" };
    const { error } = await supabase.from("suppliers").insert([s]);
    if (error) { alert("Error: " + error.message); }
    else { setSuppliers(p => [...p, s]); setShowAddModal(false); setNewS({ name:"", category:"", contact:"", phone:"" }); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) { alert("Error: " + error.message); }
    else { setSuppliers(p => p.filter(s => s.id !== id)); }
  };

  const handleAddOrder = async () => {
    if (!newOrder.supplier || !newOrder.qty || !newOrder.price || !newOrder.item) {
      alert("Por favor complete todos los campos de la orden de compra.");
      return;
    }
    const qtyVal = parseFloat(newOrder.qty) || 0;
    const priceVal = parseFloat(newOrder.price) || 0;
    const amountVal = qtyVal * priceVal;

    const o: Order = {
      id: `OC-${String(Date.now()).slice(-6)}`,
      branch_id: activeBranchId || '',
      date: new Date().toLocaleDateString("es-BO"),
      supplier: newOrder.supplier,
      item: newOrder.item,
      qty: qtyVal,
      price: priceVal,
      amount: amountVal,
      status: newOrder.status,
      required_date: newOrder.required_date || new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0]
    };

    const { error } = await supabase.from("orders").insert([o]);
    if (error) {
      console.warn("Error guardando orden en Supabase, guardando local:", error.message);
      const updated = [o, ...orders];
      setOrders(updated);
      localStorage.setItem("orders_fallback", JSON.stringify(updated));
    } else {
      setOrders(p => [o, ...p]);
      const localSaved = localStorage.getItem("orders_fallback");
      const current = localSaved ? JSON.parse(localSaved) : [];
      localStorage.setItem("orders_fallback", JSON.stringify([o, ...current]));
    }

    setShowOrderModal(false);
    setNewOrder({ supplier:"", item:"", qty:"100", price:"", status:"Pendiente", required_date:"" });
  };

  const handleDeleteOrder = async (id: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      console.warn("Error eliminando orden de Supabase, procediendo localmente:", error.message);
    }
    const updated = orders.filter(o => o.id !== id);
    setOrders(updated);
    localStorage.setItem("orders_fallback", JSON.stringify(updated));
  };

  const handlePO = () => {
    if (!poModal) return;
    const ts = new Date().toLocaleString("es-BO", { weekday:"long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" });
    const w = window.open("","","width=800,height=600");
    if (!w) return;

    const qtyVal = parseFloat(poData.qty) || 1;
    const priceVal = parseFloat(poData.price) || 0;
    const totalVal = qtyVal * priceVal;

    w.document.write(`<html><head><title>Orden de Compra - PIL</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;position:relative}
    body::before{content:"PIL CHUQUISACA S.A.";position:fixed;top:50%;left:50%;
    transform:translate(-50%,-50%) rotate(-45deg);font-size:80px;
    color:rgba(0,0,0,0.04);z-index:-1;pointer-events:none;white-space:nowrap}
    table{width:100%;border-collapse:collapse;margin-top:20px}
    th,td{border:1px solid #ddd;padding:12px;text-align:left}
    th{background:#3776BC;color:white}
    .text-right{text-align:right}</style></head><body>
    <div style="text-align:center;margin-bottom:40px">
    <h1 style="color:#3776BC;margin:0">PIL CHUQUISACA SA.</h1>
    <h2>ORDEN DE COMPRA OFICIAL</h2>
    <p style="color:#666;font-size:14px">Generado: ${ts}</p></div>
    <h3>Proveedor: ${poModal.supplier}</h3>
    <p>Por medio de la presente, solicitamos el reabastecimiento de los siguientes ítems:</p>
    <div className="overflow-x-auto w-full"><table><thead><tr><th>Ítem / Material</th><th class="text-right">Cantidad</th><th class="text-right">Precio Unitario</th><th class="text-right">Monto Total</th><th>Fecha Requerida</th></tr></thead>
    <tbody><tr><td>${poData.item||"Material / Ítem general"}</td><td class="text-right">${qtyVal}</td><td class="text-right">Bs. ${priceVal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</td><td class="text-right">Bs. ${totalVal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</td><td>${poData.date}</td></tr></tbody></table></div>
    <div style="margin-top:20px;text-align:right;font-size:16px;font-weight:bold">
      Total a Facturar: Bs. ${totalVal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
    </div>
    <div style="margin-top:50px;text-align:center"><p>_________________________</p><p>Firma y Sello de Autorización</p></div>
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 250);
    setPoModal(null);
  };

  const filteredOrders = orders.filter(o => {
    const ms = o.supplier.toLowerCase().includes(orderSearch.toLowerCase()) || o.id.toLowerCase().includes(orderSearch.toLowerCase());
    const mf = orderFilter === "Todos" || o.status === orderFilter;
    return ms && mf;
  });

  const filteredS = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const keySuppliers = suppliers.slice(0, 3);
  const totalCompras = orders.reduce((a, o) => a + o.amount, 0);
  const pendientes = orders.filter(o => o.status === "Pendiente").length;

  const statusColor = (s: string) => {
    if (s === "Recibido") return "bg-emerald-100 text-emerald-700";
    if (s === "Pendiente") return "bg-amber-100 text-amber-800";
    return "bg-rose-100 text-rose-700";
  };

  const filteredPurchases = (purchases || []).filter(p => {
    const sName = suppliers?.find(s => s.id === p.supplier_id)?.name || '';
    const pName = inventory?.find(i => i.sku === p.product_sku)?.name || '';
    return sName.toLowerCase().includes(purchaseSearchTerm.toLowerCase()) || 
           pName.toLowerCase().includes(purchaseSearchTerm.toLowerCase());
  });

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseData.supplierId || !purchaseData.productSku || !purchaseData.qty || !purchaseData.totalCost) return;
    
    await addPurchase({
      supplier_id: purchaseData.supplierId,
      product_sku: purchaseData.productSku,
      qty: parseInt(purchaseData.qty),
      total_cost: parseFloat(purchaseData.totalCost),
      branch_id: activeBranchId || ''
    });
    
    setShowPurchaseModal(false);
    setPurchaseData({ supplierId: "", productSku: "", qty: "", totalCost: "" });
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header and Tabs */}
      <div className="flex flex-col gap-4 justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Proveedores y Compras</h1>
          <p className="text-slate-500 text-sm mt-1">Gestione órdenes, proveedores e ingrese mercadería al almacén.</p>
        </div>
        
        <div className="flex gap-4 border-b border-slate-200 w-full">
          <button 
            onClick={() => setActiveTab("proveedores")}
            className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'proveedores' ? 'border-[#3776BC] text-[#3776BC]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Órdenes y Proveedores
          </button>
          <button 
            onClick={() => setActiveTab("compras")}
            className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'compras' ? 'border-[#3776BC] text-[#3776BC]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Ingreso de Mercadería
          </button>
        </div>
      </div>

      {activeTab === "proveedores" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Órdenes (Proyectado)</p>
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center"><TrendingDown size={18} className="text-[#3776BC]" /></div>
            </div>
            <p className="text-2xl font-black text-slate-800">Bs. {totalCompras > 0 ? totalCompras.toLocaleString("es-BO", { minimumFractionDigits: 2 }) : "0.00"}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Acumulado histórico</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Órdenes Pendientes</p>
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center"><Package size={18} className="text-amber-600" /></div>
            </div>
            <p className="text-2xl font-black text-slate-800">{pendientes}</p>
            <p className="text-xs text-slate-500 mt-1">Requieren atención logística</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Proveedores Activos</p>
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center"><CheckCircle2 size={18} className="text-emerald-600" /></div>
            </div>
            <p className="text-2xl font-black text-slate-800">{suppliers.filter(s => s.status === "Activo").length}</p>
            <p className="text-xs text-slate-500 mt-1">En evaluación de calidad</p>
          </div>
        </div>
      )}

      {activeTab === "proveedores" && (
        <div className="flex flex-col-reverse lg:flex-row gap-6 flex-1 min-h-0">
          {/* Orders Table */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-wrap gap-3">
              <h2 className="font-bold text-slate-800">Historial de Órdenes de Compra (PDF)</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Buscar órdenes, proveedores..." className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                </div>
                <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#3776BC]">
                  <option value="Todos">Filtrar</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Recibido">Recibido</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
                <button onClick={() => setShowOrderModal(true)} className="ml-2 px-3 py-1.5 bg-[#3776BC] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-800 transition-colors">
                  <Plus size={14} /> Crear PDF OC
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="overflow-x-auto w-full"><table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-5 py-3">ID Orden</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Proveedor</th>
                  <th className="px-5 py-3">Ítem / Producto</th>
                  <th className="px-5 py-3 text-right">Cant.</th>
                  <th className="px-5 py-3 text-right">P. Unit. (Bs.)</th>
                  <th className="px-5 py-3 text-right">Monto Total (Bs.)</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-16 text-slate-400 text-sm">
                    No hay órdenes registradas. Use "+ Nueva Orden de Compra" para comenzar.
                  </td></tr>
                ) : filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3"><span className="text-xs font-bold font-mono text-[#3776BC] bg-blue-50 px-2 py-1 rounded">#{o.id}</span></td>
                    <td className="px-5 py-3 text-sm text-slate-600">{o.date}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">{o.supplier}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{o.item || "Ítem General"}</td>
                    <td className="px-5 py-3 text-right text-sm text-slate-600">{o.qty || 1}</td>
                    <td className="px-5 py-3 text-right text-sm text-slate-600">{(o.price || o.amount).toLocaleString("es-BO", { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-slate-800">{o.amount.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3"><span className={`px-2.5 py-1 rounded text-xs font-bold ${statusColor(o.status)}`}>{o.status}</span></td>
                    <td className="px-5 py-3 flex items-center gap-3">
                      <button onClick={() => { setPoModal(o); }} className="text-xs font-bold text-[#3776BC] hover:underline flex items-center gap-1"><FileText size={13} /> PDF</button>
                      <button onClick={() => { if (confirm("¿Está seguro de eliminar esta orden de compra?")) handleDeleteOrder(o.id); }} className="text-slate-400 hover:text-rose-500 transition-colors" title="Eliminar Orden"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>

        {/* Key Suppliers Panel */}
        <div className="w-full lg:w-72 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingBag size={16} className="text-[#3776BC]" /> Proveedores Clave</h3>
              <button onClick={() => setShowAddModal(true)} className="text-xs font-bold text-[#3776BC] hover:underline flex items-center gap-1"><Plus size={12} /> Agregar</button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor..." className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#3776BC]" />
            </div>
            {loadingS ? (
              <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-4 border-blue-200 border-t-[#3776BC] rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-2 flex-1 overflow-auto">
                {(showAllSuppliers ? filteredS : (search ? filteredS : keySuppliers)).map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-[#3776BC]/30 hover:bg-blue-50/30 transition-all">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-lg">{catIcon(s.category)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                      <p className="text-xs text-slate-500 truncate">Categoría: {s.category}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {s.status === "Activo" ? <CheckCircle2 size={14} className="text-emerald-500" /> : <X size={14} className="text-rose-400" />}
                      <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setShowAllSuppliers(v => !v); setSearch(""); }} className="mt-3 w-full py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              {showAllSuppliers ? "Ver Proveedores Clave" : `Ver Todos los Proveedores (${suppliers.length})`}
            </button>
          </div>
        </div>
        </div>
      )}

      {activeTab === "compras" && (
        <div className="flex flex-col flex-1 min-h-0 gap-6">
          <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <div>
              <h2 className="font-bold text-[#3776BC] flex items-center gap-2"><Truck size={18} /> Ingreso de Mercadería y Registro Contable</h2>
              <p className="text-sm text-slate-600 mt-1">Registra los productos que llegaron para aumentar el stock automáticamente y generar el gasto en el P&L.</p>
            </div>
            <button onClick={() => setShowPurchaseModal(true)} className="px-4 py-2 bg-[#3776BC] text-white font-bold text-sm rounded-lg flex items-center gap-2 hover:bg-blue-800 transition-colors shadow-sm whitespace-nowrap">
              <Plus size={16} /> Nuevo Ingreso
            </button>
          </div>
          
          <div className="relative mb-2 w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar compra registrada..." 
              value={purchaseSearchTerm}
              onChange={(e) => setPurchaseSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]"
            />
          </div>

          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500 font-black border-b border-slate-100">
                    <th className="p-4 pl-6">Fecha</th>
                    <th className="p-4">Proveedor</th>
                    <th className="p-4">Producto (SKU)</th>
                    <th className="p-4 text-center">Cant. Ingresada</th>
                    <th className="p-4 text-right pr-6">Costo Total Pagado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map(p => {
                    const sName = suppliers?.find(s => s.id === p.supplier_id)?.name || 'Desconocido';
                    const pName = inventory?.find(i => i.sku === p.product_sku)?.name || p.product_sku;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 pl-6 text-xs text-slate-600">
                          {new Date(p.date || '').toLocaleDateString('es-BO')}
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-bold text-slate-800">{sName}</span>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {pName}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={12} /> +{p.qty}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6 text-sm font-bold text-rose-600">
                          Bs. {Number(p.total_cost).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                        No se han registrado compras. Presiona "Nuevo Ingreso" para registrar la llegada de stock.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[440px] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
              <h2 className="text-lg font-bold text-[#3776BC] flex items-center gap-2"><ShoppingBag size={18} /> Nueva Orden de Compra</h2>
              <button onClick={() => setShowOrderModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Proveedor</label>
                <select value={newOrder.supplier} onChange={e => setNewOrder({...newOrder, supplier: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white">
                  <option value="">Seleccionar proveedor...</option>
                  {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ítem / Producto</label>
                <input type="text" value={newOrder.item} onChange={e => setNewOrder({...newOrder, item: e.target.value})} placeholder="Ej. Bobina Film Termoencogible" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cantidad</label>
                  <input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: e.target.value})} placeholder="Ej. 100" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Precio Unitario (Bs.)</label>
                  <input type="number" step="0.01" value={newOrder.price} onChange={e => setNewOrder({...newOrder, price: e.target.value})} placeholder="Ej. 15.5" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Fecha Requerida</label>
                  <input type="date" value={newOrder.required_date} onChange={e => setNewOrder({...newOrder, required_date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Estado</label>
                  <select value={newOrder.status} onChange={e => setNewOrder({...newOrder, status: e.target.value as Order["status"]})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white">
                    <option value="Pendiente">Pendiente</option>
                    <option value="Recibido">Recibido</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto Total Calculado</p>
                <p className="text-xl font-black text-[#3776BC]">Bs. {((parseFloat(newOrder.qty) || 0) * (parseFloat(newOrder.price) || 0)).toLocaleString("es-BO", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowOrderModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
              <button onClick={handleAddOrder} className="px-5 py-2 text-sm font-bold text-white bg-[#3776BC] hover:bg-blue-800 rounded-lg shadow-sm">Crear Orden</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[440px] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
              <h2 className="text-lg font-bold text-[#3776BC]">Nuevo Proveedor</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nombre</label>
                <input value={newS.name} onChange={e => setNewS({...newS, name: e.target.value})} placeholder="Ej. Empaques Bolivia S.A." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Categoría</label>
                <select value={newS.category} onChange={e => setNewS({...newS, category: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white">
                  <option value="">Seleccione...</option>
                  <option value="Lácteos (Materia Prima)">Lácteos (Materia Prima)</option>
                  <option value="Envases">Envases</option>
                  <option value="Químicos">Químicos</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Aditivos">Aditivos</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Contacto</label>
                  <input value={newS.contact} onChange={e => setNewS({...newS, contact: e.target.value})} placeholder="Ej. Juan Pérez" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Teléfono</label>
                  <input value={newS.phone} onChange={e => setNewS({...newS, phone: e.target.value})} placeholder="+591 71234567" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
              <button onClick={handleAdd} disabled={saving} className="px-5 py-2 text-sm font-bold text-white bg-[#3776BC] hover:bg-blue-800 rounded-lg shadow-sm disabled:opacity-60">
                {saving ? "Guardando..." : "Guardar Proveedor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {poModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[440px] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
              <h2 className="text-lg font-bold text-[#3776BC] flex items-center gap-2"><FileText size={18} /> Datos Orden de Compra</h2>
              <button onClick={() => setPoModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">Para: <strong>{poModal.supplier}</strong></p>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ítem / Producto</label>
                <input type="text" value={poData.item} onChange={e => setPoData({...poData, item: e.target.value})} placeholder="Ej. Bobina Film, Químicos..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cantidad</label>
                  <input type="number" value={poData.qty} onChange={e => setPoData({...poData, qty: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Precio Unitario (Bs.)</label>
                  <input type="number" step="0.01" value={poData.price} onChange={e => setPoData({...poData, price: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Fecha Requerida</label>
                <input type="date" value={poData.date} onChange={e => setPoData({...poData, date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto Total PDF</p>
                <p className="text-xl font-black text-[#3776BC]">Bs. {((parseFloat(poData.qty) || 0) * (parseFloat(poData.price) || 0)).toLocaleString("es-BO", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setPoModal(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
              <button onClick={handlePO} className="px-5 py-2 text-sm font-bold text-white bg-[#3776BC] hover:bg-blue-800 rounded-lg shadow-sm">Generar PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Compra Real */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
              <h2 className="text-lg font-bold text-[#3776BC] flex items-center gap-2">
                <Truck size={18} />
                Registrar Ingreso de Mercadería
              </h2>
            </div>
            
            <form onSubmit={handleSavePurchase} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Proveedor / Fabricante</label>
                  <select 
                    required 
                    value={purchaseData.supplierId} 
                    onChange={e => setPurchaseData({...purchaseData, supplierId: e.target.value})}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Seleccionar proveedor de la lista...</option>
                    {(suppliers || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Producto al que sumar stock</label>
                  <select 
                    required 
                    value={purchaseData.productSku} 
                    onChange={e => setPurchaseData({...purchaseData, productSku: e.target.value})}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Seleccionar producto del inventario...</option>
                    {inventory.map(i => (
                      <option key={i.sku} value={i.sku}>{i.name} (Stock actual: {i.qty})</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Cantidad Recibida</label>
                    <input 
                      type="number" required min="1"
                      value={purchaseData.qty} onChange={e => setPurchaseData({...purchaseData, qty: e.target.value})}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Ej. 100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Costo Total (Bs.)</label>
                    <input 
                      type="number" required min="0" step="0.01"
                      value={purchaseData.totalCost} onChange={e => setPurchaseData({...purchaseData, totalCost: e.target.value})}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Ej. 450.50"
                    />
                  </div>
                </div>
                
                <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 flex items-start gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  Al guardar, el stock del producto seleccionado aumentará automáticamente y el costo se restará de tus ganancias en el Estado de Resultados.
                </p>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPurchaseModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#3776BC] text-white rounded-lg text-sm font-bold hover:bg-blue-800 shadow-sm">Ingresar al Inventario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
