import React, { useState, useEffect } from "react";
import { ShoppingCart, Download, Plus, X, TrendingUp, FileText, Clock, Truck, Search, CheckCircle } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { useAppData } from "../context/AppDataContext";
import { PaymentGateway } from '../services/paymentGatewayMock';
import { Html5Qrcode } from 'html5-qrcode';

export const Sales: React.FC = () => {
  const { inventory, sales, addSale, loggedInUser, branches, activeBranchId, cashRegisters, addAuditLog, fetchData } = useAppData();
  const [client, setClient] = useState("");
  const [selectedSku, setSelectedSku] = useState("");
  const [qty, setQty] = useState("1");
  const [cart, setCart] = useState<{sku: string; name: string; qty: number; price: number; status: string}[]>([]);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [pdfStartDate, setPdfStartDate] = useState("");
  const [pdfEndDate, setPdfEndDate] = useState("");
  const [tableStartDate, setTableStartDate] = useState("");
  const [tableEndDate, setTableEndDate] = useState("");

  // Nuevos estados para facturación rápida y ticket 80mm
  const [showBilling, setShowBilling] = useState(false);
  const [billingType, setBillingType] = useState<"Con Recibo" | "Con Factura" | "Sin Comprobante">("Con Recibo");
  const [nitCi, setNitCi] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  
  // CAJA
  const [showCashRegisterModal, setShowCashRegisterModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");

  const activeCashRegister = cashRegisters?.find(c => c.branch_id === activeBranchId && c.status === 'Abierta');

  useEffect(() => {
    if (!activeCashRegister && loggedInUser?.role !== 'super_admin') {
      setShowCashRegisterModal(true);
    } else {
      setShowCashRegisterModal(false);
    }
  }, [activeCashRegister, activeBranchId, loggedInUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input o textarea explícito, a menos que sea muy rápido
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter' && barcodeBuffer.length > 2) {
        // Ejecutar búsqueda por código de barras
        const found = inventory.find(i => i.sku === barcodeBuffer);
        if (found) {
          setSelectedSku(found.sku);
          // Opcional: Agregar directo al carrito con qty 1
          setCart(prev => {
            const existing = prev.find(item => item.sku === found.sku);
            if (existing) {
              return prev.map(item => item.sku === found.sku ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { sku: found.sku, name: found.name, qty: 1, price: found.price, status: 'Preparando' }];
          });
        }
        setBarcodeBuffer("");
      } else if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);
      }
    };
    
    // Reset buffer si tarda mucho (escribiendo a mano vs lector de barras)
    const timeout = setTimeout(() => setBarcodeBuffer(""), 100);

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [barcodeBuffer, inventory]);

  useEffect(() => {
    let html5QrCode: any = null;
    if (showScanner) {
      setTimeout(() => {
        html5QrCode = new Html5Qrcode("reader");
        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            const found = inventory.find(i => i.sku === decodedText);
            if (found) {
              setSelectedSku(found.sku);
              setCart(prev => {
                const existing = prev.find(item => item.sku === found.sku);
                if (existing) {
                  return prev.map(item => item.sku === found.sku ? { ...item, qty: item.qty + 1 } : item);
                }
                return [...prev, { sku: found.sku, name: found.name, qty: 1, price: found.price, status: 'Preparando' }];
              });
              setToast({ show: true, message: `¡Escaneado: ${found.name}!`, type: 'success' });
              setTimeout(() => setToast(null), 3000);
            } else {
              setToast({ show: true, message: `No encontrado: ${decodedText}`, type: 'error' });
              setTimeout(() => setToast(null), 3000);
            }
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
  }, [showScanner, inventory]);

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSale, setTicketSale] = useState<any | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [scheduledDate, setScheduledDate] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState("");
  const [qrTxn, setQrTxn] = useState("");

  const selectedProduct = inventory.find(i => i.sku === selectedSku);
  
  const filteredInventory = inventory.filter(i => 
    i.qty > 0 && 
    (i.name.toLowerCase().includes(productSearch.toLowerCase()) || 
     i.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
     (i.category && i.category.toLowerCase().includes(productSearch.toLowerCase())))
  );
  
  const addToCart = () => {
    if (!selectedSku || !qty || !selectedProduct) return;
    
    const parsedQty = Number(qty);
    if (parsedQty <= 0) return;
    
    const existing = cart.find(item => item.sku === selectedSku);
    const currentCartQty = existing ? existing.qty : 0;
    
    if (currentCartQty + parsedQty > selectedProduct.qty) {
      alert(`Stock insuficiente. Solo hay ${selectedProduct.qty} unidades disponibles de este producto.`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => item.sku === selectedSku ? { ...item, qty: item.qty + parsedQty } : item));
    } else {
      setCart([...cart, { sku: selectedSku, name: selectedProduct.name, qty: parsedQty, price: selectedProduct.price, status: selectedProduct.status }]);
    }
    setSelectedSku("");
    setQty("1");
  };

  const removeFromCart = (sku: string) => {
    setCart(cart.filter(item => item.sku !== sku));
  };

  // Lógica de descuentos
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  
  let globalDiscountPercent = 0;
  if (cartSubtotal > 250) {
    globalDiscountPercent = 20;
  } else if (cartSubtotal > 100) {
    globalDiscountPercent = 10;
  }

  const finalCart = cart.map(item => {
    let appliedDiscount = 0;
    if (item.status === 'Próximo a Vencer') {
      appliedDiscount = 50;
    } else if (globalDiscountPercent > 0) {
      appliedDiscount = globalDiscountPercent;
    }
    
    const finalPrice = item.price * (1 - appliedDiscount/100);
    return { ...item, appliedDiscount, finalPrice, totalItemPrice: finalPrice * item.qty };
  });

  const total = finalCart.reduce((acc, item) => acc + item.totalItemPrice, 0);

  const topProducts = React.useMemo(() => {
    const counts: Record<string, { name: string; qty: number }> = {};
    sales.forEach(s => {
      if (!counts[s.product_sku]) counts[s.product_sku] = { name: s.product_name, qty: 0 };
      counts[s.product_sku].qty += s.qty;
    });
    return Object.entries(counts).sort((a, b) => b[1].qty - a[1].qty).slice(0, 3);
  }, [sales]);

  const filtered = sales.filter(s => {
    const matchSearch = s.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "Todos" || s.status === statusFilter;
    
    let matchDate = true;
    const sDate = s.date.split("T")[0];
    if (tableStartDate) matchDate = matchDate && sDate >= tableStartDate;
    if (tableEndDate) matchDate = matchDate && sDate <= tableEndDate;
    
    return matchSearch && matchStatus && matchDate;
  });

  const isDateFiltered = tableStartDate || tableEndDate;
  
  const groupedDisplayedSales = React.useMemo(() => {
    const arr = isDateFiltered ? filtered : filtered.slice(0, 50); // limit pre-group
    const groups = arr.reduce((acc, curr) => {
      const timeKey = curr.date.substring(0, 16); // up to minute
      const key = `${curr.client}-${timeKey}`;
      if (!acc[key]) {
        acc[key] = { 
            ...curr, 
            combinedName: curr.product_name,
            items: [{
                name: curr.product_name,
                qty: curr.qty,
                price: curr.unit_price,
                totalItemPrice: curr.total,
                appliedDiscount: 0
            }]
        };
      } else {
        acc[key].total += curr.total;
        acc[key].combinedName += `, ${curr.product_name}`;
        acc[key].items.push({
            name: curr.product_name,
            qty: curr.qty,
            price: curr.unit_price,
            totalItemPrice: curr.total,
            appliedDiscount: 0
        });
      }
      return acc;
    }, {} as any);
    const result = Object.values(groups) as any[];
    return isDateFiltered ? result : result.slice(0, 10);
  }, [filtered, isDateFiltered]);

  const showToast = (message: string) => {
    setToast({ show: true, message, type: "success" });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleGenerateQR = async () => {
    setShowQRModal(true);
    setQrLoading(true);
    setQrData("");
    setQrTxn("");
    
    // Llamar a nuestra API simulada (en el futuro: fetch() real a la pasarela)
    const response = await PaymentGateway.requestQR(total);
    
    if (response.success) {
      setQrData(response.qrData);
      setQrTxn(response.transactionId);
    } else {
      alert("Error al conectar con la pasarela de pagos.");
      setShowQRModal(false);
    }
    setQrLoading(false);
  };

  const handleWebhookSimulate = () => {
    if (!qrTxn) return;
    PaymentGateway.simulateWebhookPayment(qrTxn, () => {
      // Se llama a esta función cuando el banco avisa que el pago fue exitoso
      alert("¡Pago exitoso vía Webhook Bancario! Registrando la venta...");
      setShowQRModal(false);
      handleRegister();
    });
  };

  const handleRegister = async () => {
    if (!client || finalCart.length === 0) return;
    setLoading(true);
    
    let allOk = true;

    // Crear múltiples registros de venta para mantener la base de datos igual
    for (const item of finalCart) {
      const salePayload: any = {
        client,
        product_sku: item.sku,
        product_name: item.name,
        qty: item.qty,
        unit_price: item.finalPrice, // Guardar precio con descuento para que sume correcto
        total: item.totalItemPrice,
        status: scheduledDate ? "Programado" : "Despachado",
      };

      if (showBilling && billingType === "Con Recibo") {
        salePayload.nit_ci = nitCi || null;
        salePayload.razon_social = razonSocial || null;
      }

      const ok = await addSale(salePayload);
      if (!ok) allOk = false;
    }
    
    if (allOk) {
      const transactionId = `sale-${Date.now()}`;
      const transactionSale = {
        id: transactionId,
        branch_id: activeBranchId || "sucursal-a",
        date: new Date().toISOString(),
        client,
        items: finalCart,
        subtotal: cartSubtotal,
        total,
        status: "En Tránsito",
        user_name: loggedInUser?.name || "Sistema",
        nit_ci: showBilling && billingType === "Con Recibo" ? (nitCi || undefined) : undefined,
        razon_social: showBilling && billingType === "Con Recibo" ? (razonSocial || undefined) : undefined,
        payment_method: paymentMethod,
        scheduled_date: scheduledDate || undefined
      };

      // Limpiar formulario y carrito
      setClient("");
      setCart([]);
      setNitCi("");
      setRazonSocial("");
      setShowBilling(false);
      setBillingType("Con Recibo");
      setShowModal(false);

      if (showBilling && billingType === "Con Recibo") {
        setTicketSale(transactionSale);
        setShowTicketModal(true);
      } else {
        showToast("¡Venta registrada exitosamente! Stock actualizado.");
      }
    } else {
      alert("Error al registrar algunos o todos los productos de la venta.");
    }
    setLoading(false);
    setShowQRModal(false);
  };

  const printTicket = (sale: any) => {
    // Buscar la sucursal de la venta, o usar la del usuario activo
    const branchInfo = branches.find(b => b.id === (sale.branch_id || loggedInUser?.branch_id));
    const activeBranchName = branchInfo ? branchInfo.name : 'Sucursal Central';
    
    // Buscar o crear el iframe oculto en el documento para impresión directa silenciosa
    let iframe = document.getElementById("print-iframe") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-iframe";
      iframe.style.position = "absolute";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.border = "none";
      iframe.style.top = "-9999px";
      document.body.appendChild(iframe);
    }

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <title>Imprimir Ticket #${sale.id.slice(-8).toUpperCase()}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 72mm;
              margin: 4mm auto;
              padding: 0;
              font-size: 11px;
              line-height: 1.3;
              color: #000;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .font-black { font-weight: 900; }
            .my-2 { margin-top: 8px; margin-bottom: 8px; }
            .my-4 { margin-top: 16px; margin-bottom: 16px; }
            .dashed-line { border-top: 1px dashed #000; margin: 6px 0; }
            .space-y-1 > * { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 2px 0; text-align: left; }
            .text-right { text-align: right; }
            .total-row { font-size: 13px; font-weight: 900; }
            .logo-text { font-size: 15px; font-weight: 900; letter-spacing: -0.5px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <img src="${window.location.origin}/logo.png" style="height: 35px; object-fit: contain; margin-bottom: 5px;" alt="PIL" onload="window.print()" /><br/>
            <span class="logo-text">PIL CHUQUISACA S.A.</span><br/>
            PLANTA INDUSTRIAL SUCRE<br/>
            Av. Jaime Mendoza #1420<br/>
            Telf: 64-51234 · Sucre, Bolivia
          </div>
          
          <div class="dashed-line"></div>
          
          <div class="space-y-1">
            <div class="text-center font-bold">TICKET DE VENTA</div>
            <div><b>Nº Trans:</b> #${sale.id.slice(-8).toUpperCase()}</div>
            <div><b>Fecha:</b> ${new Date(sale.date).toLocaleString("es-BO")}</div>
            <div><b>Operador:</b> ${sale.user_name || "Sistema"}</div>
            <div><b>Sucursal:</b> ${activeBranchName}</div>
          </div>
          
          <div class="dashed-line"></div>
          
          <div class="space-y-1">
            <div><b>Cliente:</b> ${sale.client}</div>
            ${sale.nit_ci ? `<div><b>NIT/CI:</b> ${sale.nit_ci}</div>` : ""}
            ${sale.razon_social ? `<div><b>Razón Social:</b> ${sale.razon_social}</div>` : ""}
          </div>
          
          <div class="dashed-line"></div>
          
          <div className="overflow-x-auto w-full"><table>
            <thead>
              <tr class="font-bold">
                <th style="width: 50%;">Detalle</th>
                <th class="text-right" style="width: 15%;">Cant</th>
                <th class="text-right" style="width: 15%;">P.U.</th>
                <th class="text-right" style="width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items ? sale.items.map((item: any) => `
              <tr>
                <td>
                  ${item.name}
                  ${item.appliedDiscount > 0 ? `<br/><span style="font-size: 9px; color: #555;">(Desc. ${item.appliedDiscount}%)</span>` : ''}
                </td>
                <td class="text-right">${item.qty}</td>
                <td class="text-right">${item.price.toFixed(2)}</td>
                <td class="text-right">Bs. ${item.totalItemPrice.toFixed(2)}</td>
              </tr>`).join('') : `
              <tr>
                <td>${sale.product_name}</td>
                <td class="text-right">${sale.qty}</td>
                <td class="text-right">${sale.unit_price.toFixed(2)}</td>
                <td class="text-right">Bs. ${sale.total.toFixed(2)}</td>
              </tr>`}
            </tbody>
          </table></div>
          
          <div class="dashed-line"></div>
          
          <div style="display: flex; justify-content: space-between;" class="my-2">
            <span>SUBTOTAL:</span>
            <span>Bs. ${(sale.subtotal || sale.total).toFixed(2)}</span>
          </div>
          
          ${sale.items && (sale.subtotal - sale.total > 0) ? `
          <div style="display: flex; justify-content: space-between; font-size: 10px;" class="my-2">
            <span>AHORRO POR DESCUENTOS:</span>
            <span>- Bs. ${(sale.subtotal - sale.total).toFixed(2)}</span>
          </div>
          <div class="dashed-line"></div>` : ''}

          <div style="display: flex; justify-content: space-between;" class="total-row">
            <span>TOTAL A PAGAR:</span>
            <span>Bs. ${sale.total.toFixed(2)}</span>
          </div>
          
          <div class="dashed-line"></div>
          
          <div class="text-center" style="font-size: 9px; margin-top: 12px; color: #555;">
            ¡Gracias por su preferencia!<br/>
            PIL Chuquisaca S.A. - Producto Nacional<br/>
            Exija su factura/comprobante
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();
  };

  const exportPDF = () => {
    let pdfSales = sales;
    if (pdfStartDate) {
      pdfSales = pdfSales.filter(s => s.date.split("T")[0] >= pdfStartDate);
    }
    if (pdfEndDate) {
      pdfSales = pdfSales.filter(s => s.date.split("T")[0] <= pdfEndDate);
    }

    const ts = new Date().toLocaleString("es-BO");
    const w = window.open("", "", "width=900,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>Reporte de Ventas - PIL</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;position:relative}
    body::before{content:"PIL CHUQUISACA S.A.";position:fixed;top:50%;left:50%;
    transform:translate(-50%,-50%) rotate(-45deg);font-size:80px;
    color:rgba(0,0,0,0.04);z-index:-1;pointer-events:none;white-space:nowrap}
    table{width:100%;border-collapse:collapse;margin-top:20px}
    th,td{border:1px solid #ddd;padding:10px;text-align:left}
    th{background:#3776BC;color:white}</style></head><body>
    <div style="text-align:center;margin-bottom:30px">
    <img src="${window.location.origin}/logo.png" style="height: 80px; margin-bottom: 10px;" onload="setTimeout(function(){window.print();}, 200)" onerror="setTimeout(function(){window.print();}, 200)" />
    <h1 style="color:#3776BC;margin:0">PIL CHUQUISACA SA.</h1>
    <h2>Reporte de Operaciones de Ventas</h2>
    ${pdfStartDate || pdfEndDate ? `<p style="font-weight:bold;margin-top:5px;color:#3776BC">Rango: ${pdfStartDate || "Inicio"} al ${pdfEndDate || "Fin"}</p>` : ""}
    <p style="color:#666;font-size:14px">Generado: ${ts}</p></div>
    <div className="overflow-x-auto w-full"><table><thead><tr><th>ID Orden</th><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Cant.</th><th>Total (Bs.)</th><th>Estado</th></tr></thead>
    <tbody>${pdfSales.map(s => `<tr><td>${s.id.slice(0,12)}</td><td>${new Date(s.date).toLocaleString("es-BO")}</td>
    <td>${s.client}</td><td>${s.product_name}</td><td>${s.qty}</td>
    <td>${s.total.toLocaleString("es-BO",{minimumFractionDigits:2})}</td><td>${s.status}</td></tr>`).join("")}
    </tbody></table></div>
    <p style="margin-top:20px;font-weight:bold">Total General: Bs. ${pdfSales.reduce((a,s)=>a+s.total,0).toLocaleString("es-BO",{minimumFractionDigits:2})}</p>
    </body></html>`);
    w.document.close();
  };

  const statusColor = (s: string) => {
    if (s === "Entregado" || s === "Despachado") return "bg-emerald-100 text-emerald-700";
    if (s === "En Tránsito") return "bg-blue-100 text-blue-700";
    if (s === "Programado") return "bg-rose-100 text-rose-700";
    if (s === "Preparando") return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-600";
  };

  const totalVentas = sales.reduce((a, s) => a + s.total, 0);
  const pendientes = sales.filter(s => s.status === "Preparando" || s.status === "Pendiente" || s.status === "Programado").length;
  const enTransito = sales.filter(s => s.status === "En Tránsito" || s.status === "Despachado").length;

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Operaciones de Ventas</h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona transacciones, monitorea ingresos y rastrea la distribución.</p>
        </div>
        <div className="flex flex-wrap items-stretch sm:items-center gap-2 w-full xl:w-auto">
          <div className="flex flex-1 sm:flex-none justify-between items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 shadow-sm">
            <span>Desde:</span>
            <input type="date" value={pdfStartDate} onChange={e => setPdfStartDate(e.target.value)} className="border-0 focus:ring-0 p-0 text-slate-800 text-xs cursor-pointer focus:outline-none bg-transparent" />
            <span className="border-l border-slate-200 h-4 mx-1"></span>
            <span>Hasta:</span>
            <input type="date" value={pdfEndDate} onChange={e => setPdfEndDate(e.target.value)} className="border-0 focus:ring-0 p-0 text-slate-800 text-xs cursor-pointer focus:outline-none bg-transparent" />
          </div>
          <button onClick={exportPDF} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={16} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Ventas</p>
          <p className="text-2xl font-black text-slate-800">Bs. {totalVentas.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">↑ Histórico acumulado</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pagos Pendientes</p>
          <p className="text-2xl font-black text-slate-800">{pendientes}</p>
          <p className="text-xs text-amber-600 font-semibold mt-1">Requieren seguimiento</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Despachado</p>
          <p className="text-2xl font-black text-slate-800">{enTransito}</p>
          <p className="text-xs text-blue-600 font-semibold mt-1">Órdenes activas</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 relative">
        {/* Cash Register Modal Overlay */}
        {showCashRegisterModal && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-40 flex justify-center items-start pt-20">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300">
              <div className="p-6 text-center bg-[#3776BC] text-white">
                <h2 className="text-xl font-bold">Apertura de Caja Obligatoria</h2>
                <p className="text-sm text-blue-100 mt-1">Debes iniciar tu turno con un saldo base para vender.</p>
              </div>
              <form 
                className="p-6" 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!openingBalance) return;
                  try {
                    const { supabase } = await import('../lib/supabase');
                    await supabase.from('cash_registers').insert([{
                      branch_id: activeBranchId,
                      opened_by: loggedInUser?.email,
                      opening_balance: parseFloat(openingBalance),
                      status: 'Abierta'
                    }]);
                    await addAuditLog('Apertura de Caja', `Caja abierta con Bs. ${openingBalance}`);
                    alert('Caja abierta correctamente');
                    if (fetchData) await fetchData();
                    setShowCashRegisterModal(false);
                  } catch (err: any) {
                    alert('Error al abrir caja. ' + err.message);
                  }
                }}
              >
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase text-left">Monto de Apertura (Efectivo inicial en Bs.)</label>
                  <input 
                    type="number" required min="0" step="0.5" autoFocus
                    value={openingBalance} onChange={e => setOpeningBalance(e.target.value)}
                    className="w-full text-2xl font-black text-slate-800 px-4 py-3 border border-slate-300 rounded-xl focus:border-[#3776BC] focus:ring-4 focus:ring-blue-100 text-center"
                    placeholder="Ej. 100.00"
                  />
                </div>
                <button type="submit" className="w-full bg-[#3776BC] hover:bg-blue-800 text-white font-bold py-3 rounded-xl shadow-md transition-colors">
                  Abrir Caja y Comenzar Turno
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Main area */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Quick Sale Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShoppingCart size={18} className="text-[#3776BC]" /> Registro de Venta</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 items-end">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cliente / Distribuidor</label>
                <input value={client} onChange={e => setClient(e.target.value)} placeholder="Buscar nombre o ID de cliente..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Fecha de Transacción</label>
                <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
              </div>
            </div>

            <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <label className="block text-sm font-bold text-slate-700 uppercase">Seleccionar Producto</label>
                <div className="flex gap-2 w-full sm:w-auto flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre, SKU..." 
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3776BC] focus:ring-1 focus:ring-[#3776BC]" 
                    />
                  </div>
                  <button 
                    onClick={() => setShowScanner(true)}
                    className="flex items-center gap-2 bg-slate-800 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors shadow-sm whitespace-nowrap"
                  >
                    📷 Escanear
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar pb-2">
                {filteredInventory.map(i => (
                  <div 
                    key={i.sku}
                    onClick={() => setSelectedSku(i.sku)}
                    className={`relative flex flex-col justify-between p-4 rounded-xl cursor-pointer transition-all select-none border ${
                      selectedSku === i.sku 
                        ? 'bg-slate-800 border-indigo-500 ring-1 ring-indigo-500 shadow-lg transform scale-[1.02]' 
                        : 'bg-[#1a1f2e] border-[#2a3041] hover:bg-[#252b3b] shadow-sm'
                    }`}
                  >
                    {selectedSku === i.sku && (
                      <div className="absolute -top-2 -right-2 bg-indigo-500 text-white rounded-full shadow-md z-10 p-0.5">
                        <CheckCircle size={18} className="fill-indigo-500 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-bold text-sm leading-tight mb-2">{i.name}</h3>
                      <span className="inline-block px-2 py-1 bg-blue-900/40 border border-blue-800/50 text-blue-300 text-[10px] font-bold rounded-full mb-3">
                        {i.category || 'General'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end mt-auto pt-2">
                      <span className="text-amber-400 font-black text-sm">{i.price.toFixed(2)} Bs.</span>
                      <span className="text-slate-400 text-[10px]">Stock: {i.qty}</span>
                    </div>
                  </div>
                ))}
                {filteredInventory.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                    No se encontraron productos disponibles.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4 items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Producto Seleccionado</label>
                <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-semibold truncate h-[38px] flex items-center">
                  {selectedProduct ? `${selectedProduct.name} - Bs. ${selectedProduct.price}` : 'Ningún producto seleccionado'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cantidad</label>
                <input type="number" min="1" max={selectedProduct ? selectedProduct.qty : undefined} value={qty} onChange={e => setQty(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] h-[38px]" />
              </div>
              <div>
                <button type="button" onClick={addToCart} disabled={!selectedSku || !qty} className="w-full h-[38px] justify-center flex items-center gap-2 px-4 bg-[#3776BC] text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50">
                  <Plus size={16} /> Agregar al Carrito
                </button>
              </div>
            </div>

            {/* Cart Table */}
            {cart.length > 0 && (
              <div className="mb-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto w-full"><table className="w-full text-left text-sm">
                  <thead className="bg-slate-100/50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2 font-bold">Producto</th>
                      <th className="px-4 py-2 font-bold">Cant.</th>
                      <th className="px-4 py-2 font-bold">Precio U.</th>
                      <th className="px-4 py-2 font-bold text-right">Subtotal</th>
                      <th className="px-4 py-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {finalCart.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors">
                        <td className="px-4 py-2">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          {item.appliedDiscount > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5">
                              Descuento -{item.appliedDiscount}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-700">{item.qty}</td>
                        <td className="px-4 py-2 text-slate-700 line-through text-xs text-slate-400">Bs. {item.price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-800">Bs. {item.totalItemPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => removeFromCart(item.sku)} className="text-red-500 hover:text-red-700 p-1">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </div>
            )}

            {/* Collapsible Billing Section */}
            <div className="mb-4 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowBilling(!showBilling)}
                className="flex items-center gap-2 text-xs font-bold text-[#3776BC] hover:text-blue-800 transition-colors focus:outline-none cursor-pointer"
              >
                <span className="text-sm">{showBilling ? "−" : "+"}</span>
                {showBilling ? "Ocultar Datos de Facturación" : "Agregar Datos de Facturación"}
              </button>

              {showBilling && (
                <div className="mt-3 space-y-3 pt-3 border-t border-slate-200/60 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase mr-2">Tipo de Comprobante:</span>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-fit">
                      <button
                        type="button"
                        onClick={() => setBillingType("Con Recibo")}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                          billingType === "Con Recibo"
                            ? "bg-[#3776BC] text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Con Recibo
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingType("Sin Comprobante")}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                          billingType === "Sin Comprobante"
                            ? "bg-slate-700 text-white shadow-sm"
                            : "text-slate-655 hover:text-slate-900"
                        }`}
                      >
                        Sin Comprobante
                      </button>
                    </div>
                  </div>

                  {billingType === "Con Recibo" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-200">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">NIT / CI</label>
                        <input
                          type="text"
                          value={nitCi}
                          onChange={e => setNitCi(e.target.value)}
                          placeholder="Ej. 1234567"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#3776BC] bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Razón Social</label>
                        <input
                          type="text"
                          value={razonSocial}
                          onChange={e => setRazonSocial(e.target.value)}
                          placeholder="Ej. Juan Pérez"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#3776BC] bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Método de Pago</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white">
                  <option value="Efectivo">Efectivo</option>
                  <option value="QR">Transferencia QR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Programar Venta (Opcional)</label>
                <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                <p className="text-[10px] text-slate-400 mt-1">Selecciona una fecha futura para programar la entrega.</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center sm:justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Calculado</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-[#3776BC]">Bs. {total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</p>
                  {cartSubtotal > total && <p className="text-sm line-through text-slate-400">Bs. {cartSubtotal.toFixed(2)}</p>}
                </div>
                {cartSubtotal > total && <p className="text-xs font-bold text-emerald-600 mt-1">¡Ahorraste Bs. {(cartSubtotal - total).toFixed(2)}!</p>}
              </div>
              <button onClick={() => {
                if (paymentMethod === 'QR') {
                  handleGenerateQR();
                } else {
                  handleRegister();
                }
              }} disabled={loading || !client || finalCart.length === 0} className="w-full sm:w-auto justify-center flex items-center gap-2 px-6 py-3 bg-[#3776BC] text-white rounded-lg font-bold hover:bg-blue-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? "Registrando..." : "Confirmar Venta →"}
              </button>
            </div>
          </div>

          {/* QR Modal */}
          {showQRModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                <div className="bg-[#3776BC] p-4 text-center text-white">
                  <h2 className="text-lg font-black tracking-wide">PAGO SIMPLE QR</h2>
                  <p className="text-xs text-blue-100 opacity-90">Banca Móvil</p>
                </div>
                <div className="p-6 text-center bg-slate-50 relative">
                  <p className="text-sm text-slate-500 mb-1">Monto a cobrar:</p>
                  <p className="text-3xl font-black text-slate-800 mb-6">Bs. {total.toFixed(2)}</p>
                  
                  {qrLoading ? (
                    <div className="flex flex-col items-center justify-center h-56 mb-6">
                      <div className="w-10 h-10 border-4 border-blue-200 border-t-[#3776BC] rounded-full animate-spin mb-4" />
                      <p className="text-sm font-bold text-slate-600 animate-pulse">Conectando con el Banco...</p>
                      <p className="text-xs text-slate-400 mt-1">Generando QR Oficial Interoperable</p>
                    </div>
                  ) : (
                    <div className="relative mx-auto mb-6 w-56 h-56 bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex justify-center items-center">
                      {qrData ? (
                        <QRCodeSVG 
                          value={qrData} 
                          size={200}
                          level="M"
                          imageSettings={{
                            src: window.location.origin + '/logo.png',
                            x: undefined,
                            y: undefined,
                            height: 40,
                            width: 40,
                            excavate: true,
                          }}
                        />
                      ) : null}
                    </div>
                  )}
                  
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-left mb-6 shadow-sm">
                    <p className="text-xs text-slate-500 mb-0.5">Beneficiario:</p>
                    <p className="text-sm font-bold text-slate-800">{loggedInUser?.name || 'Administrador'} (PIL S.A.)</p>
                    {qrTxn && <p className="text-[10px] text-slate-400 mt-1 font-mono">TXN: {qrTxn}</p>}
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <button onClick={() => setShowQRModal(false)} className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">Cancelar</button>
                    </div>
                    {/* Botón exclusivo para pruebas de Webhook */}
                    {!qrLoading && qrTxn && (
                      <button 
                        onClick={handleWebhookSimulate} 
                        className="w-full py-2 px-4 bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-200 shadow-sm transition-colors mt-2 flex items-center justify-center gap-2"
                      >
                        ⚡ Simular Pago del Cliente (Webhook)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-[#3776BC] hover:shadow-md transition-all cursor-pointer" onClick={exportPDF}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0"><FileText size={20} className="text-[#3776BC]" /></div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Facturación por Lote</p>
                  <p className="text-xs text-slate-500">Generar facturas para entregas completadas.</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer" onClick={() => setStatusFilter("Preparando")}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0"><Clock size={20} className="text-amber-600" /></div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Pagos Pendientes</p>
                  <p className="text-xs text-slate-500">Revisar cuentas por cobrar y cobranzas.</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer" onClick={() => setStatusFilter("En Tránsito")}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0"><Truck size={20} className="text-emerald-600" /></div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Rutas de Despacho</p>
                  <p className="text-xs text-slate-500">Asignar órdenes de venta a camiones.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center sm:justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={16} className="text-slate-400" /> Transacciones Recientes {!isDateFiltered && <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">Últimas 10</span>}</h3>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-xs">
                  <span className="text-slate-500 font-bold">De:</span>
                  <input type="date" value={tableStartDate} onChange={e => setTableStartDate(e.target.value)} className="border-0 focus:ring-0 p-0 text-slate-800 text-xs bg-transparent" />
                  <span className="text-slate-500 font-bold ml-1">A:</span>
                  <input type="date" value={tableEndDate} onChange={e => setTableEndDate(e.target.value)} className="border-0 focus:ring-0 p-0 text-slate-800 text-xs bg-transparent" />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full sm:w-auto pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-auto px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white">
                  <option value="Todos">Todos</option>
                  <option value="Despachado">Despachado</option>
                  <option value="Programado">Programado</option>
                  <option value="Entregado">Entregado</option>
                  <option value="Pendiente">Pendiente</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <div className="overflow-x-auto w-full"><table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="px-4 py-3">ID de Orden</th>
                    <th className="px-4 py-3">Fecha/Hora</th>
                    <th className="px-4 py-3">Cliente/Destino</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-right">Valor (Bs.)</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedDisplayedSales.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No hay transacciones registradas.</td></tr>
                  ) : groupedDisplayedSales.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3"><span className="text-xs font-bold font-mono text-[#3776BC] bg-blue-50 px-2 py-1 rounded">#{s.id.slice(-6).toUpperCase()}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(s.date).toLocaleString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">{s.client}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate" title={s.combinedName}>{s.combinedName}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-800">{s.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColor(s.status)}`}>{s.status}</span></td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => {
                          setTicketSale({ ...s, subtotal: s.total });
                          setShowTicketModal(true);
                        }} className="p-1.5 text-slate-400 hover:text-[#3776BC] hover:bg-blue-50 rounded transition-colors" title="Reimprimir Ticket">🖨️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-72 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500" /> Productos de Alta Rotación</h3>
            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Sin datos de ventas aún.</p>
              ) : topProducts.map(([sku, data], i) => (
                <div key={sku} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${i === 0 ? "bg-blue-100 text-[#3776BC]" : i === 1 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{data.name}</p>
                    <p className="text-xs text-slate-500">{sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">{data.qty >= 1000 ? (data.qty / 1000).toFixed(1) + "k" : data.qty}</p>
                    <p className="text-[10px] text-slate-400">unidades</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Resumen del Período</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Total transacciones</span>
                <span className="font-black text-slate-800">{sales.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Entregadas</span>
                <span className="font-bold text-emerald-600">{sales.filter(s => s.status === "Entregado").length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">En tránsito</span>
                <span className="font-bold text-blue-600">{enTransito}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Preparando</span>
                <span className="font-bold text-amber-600">{pendientes}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Ingreso Total</span>
                <span className="font-black text-[#3776BC]">Bs. {totalVentas.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {loggedInUser?.role === "Admin" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-bold text-[#3776BC] mb-1">Sesión Activa</p>
              <p className="text-sm font-bold text-slate-800">{loggedInUser.name}</p>
              <p className="text-xs text-slate-500">{loggedInUser.role} · {loggedInUser.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* New Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
              <h2 className="text-lg font-bold text-[#3776BC] flex items-center gap-2"><ShoppingCart size={18} /> Nueva Venta Terminal</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cliente / Distribuidor</label>
                <input value={client} onChange={e => setClient(e.target.value)} placeholder="Nombre del cliente..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
              </div>
              
              <div className="grid grid-cols-4 gap-2 items-end">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Producto</label>
                  <select value={selectedSku} onChange={e => setSelectedSku(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white">
                    <option value="">Seleccionar producto...</option>
                    {inventory.filter(i => i.qty > 0).map(i => (
                      <option key={i.sku} value={i.sku}>{i.name} — Bs. {i.price} (Stock: {i.qty})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cant</label>
                  <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                </div>
                <div>
                  <button type="button" onClick={addToCart} disabled={!selectedSku || !qty} className="w-full justify-center flex items-center bg-slate-800 text-white rounded-lg px-2 py-2 font-semibold hover:bg-slate-900 disabled:opacity-50">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {cart.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-200 max-h-40 overflow-y-auto">
                  {finalCart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="font-bold">{item.qty}x</span> {item.name}
                        {item.appliedDiscount > 0 && <span className="ml-1 text-emerald-600 font-bold">(-{item.appliedDiscount}%)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Bs. {item.totalItemPrice.toFixed(2)}</span>
                        <button onClick={() => removeFromCart(item.sku)} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Total Calculado</label>
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-black text-[#3776BC] flex justify-between items-center">
                  <span>Bs. {total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</span>
                  {cartSubtotal > total && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Ahorro: Bs. {(cartSubtotal - total).toFixed(2)}</span>}
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => {setShowModal(false); setCart([]);}} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleRegister} disabled={loading || !client || finalCart.length === 0} className="px-6 py-2 text-sm font-bold text-white bg-[#3776BC] hover:bg-blue-800 rounded-lg shadow-sm transition-colors disabled:opacity-50">
                {loading ? "Registrando..." : "Confirmar Venta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 80mm Ticket Print Modal */}
      {showTicketModal && ticketSale && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[360px] overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <span className="text-xs font-black text-slate-800 tracking-wider flex items-center gap-1.5 uppercase">
                <FileText size={14} className="text-[#3776BC]" /> Comprobante Interno
              </span>
              <button 
                onClick={() => {
                  setShowTicketModal(false);
                  setTicketSale(null);
                  showToast("¡Venta registrada exitosamente! Listo para el siguiente cliente.");
                }} 
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 cursor-pointer border-0"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 bg-slate-100/50 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col justify-start">
              {/* Receipt Preview */}
              <div id="ticket-preview" className="bg-white p-5 rounded-xl shadow-md border border-slate-200/80 max-w-[290px] mx-auto font-mono text-[11px] text-slate-900 flex flex-col gap-2 relative">
                {/* Paper header dots decoration */}
                <div className="absolute -top-1 left-0 right-0 h-1 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:6px_6px]"></div>
                
                <div className="text-center space-y-0.5">
                  <p className="font-black text-sm tracking-tight text-slate-950">PIL CHUQUISACA S.A.</p>
                  <p className="text-[9px] text-slate-600 leading-tight">PLANTA INDUSTRIAL SUCRE<br/>Av. Jaime Mendoza #1420<br/>Telf: 64-51234 · Bolivia</p>
                </div>
                
                <div className="border-t border-dashed border-slate-350 my-1"></div>
                
                <div className="space-y-0.5 text-slate-700">
                  <p className="text-[10px] font-bold text-slate-950 text-center uppercase tracking-wide my-1">Ticket de Venta Rápida</p>
                  <p><span className="font-semibold text-slate-950">Nº Trans:</span> #{ticketSale.id.slice(-8).toUpperCase()}</p>
                  <p><span className="font-semibold text-slate-950">Fecha:</span> {new Date(ticketSale.date).toLocaleString("es-BO")}</p>
                  <p><span className="font-semibold text-slate-950">Operador:</span> {ticketSale.user_name || "Sistema"}</p>
                  <p><span className="font-semibold text-slate-950">Sucursal:</span> {
                    branches.find(b => b.id === ticketSale.branch_id)?.name || "Sucursal Central"
                  }</p>
                </div>
                
                <div className="border-t border-dashed border-slate-350 my-1"></div>
                
                <div className="space-y-0.5 text-slate-700">
                  <p className="truncate"><span className="font-semibold text-slate-950">Cliente:</span> {ticketSale.client}</p>
                  {ticketSale.nit_ci && <p><span className="font-semibold text-slate-950">NIT/CI:</span> {ticketSale.nit_ci}</p>}
                  {ticketSale.razon_social && <p className="truncate"><span className="font-semibold text-slate-950">R. Social:</span> {ticketSale.razon_social}</p>}
                </div>
                
                <div className="border-t border-dashed border-slate-350 my-1"></div>
                
                {/* Items */}
                <div className="overflow-x-auto w-full"><table className="w-full text-[11px] text-slate-800">
                  <thead>
                    <tr className="border-b border-dashed border-slate-300 font-bold text-slate-950">
                      <th className="pb-1 text-left">Detalle</th>
                      <th className="pb-1 text-right">Cant</th>
                      <th className="pb-1 text-right">P.U</th>
                      <th className="pb-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketSale.items ? ticketSale.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-1 text-left align-top max-w-[110px]">
                          <div className="truncate">{item.name}</div>
                          {item.appliedDiscount > 0 && <div className="text-[8px] text-slate-500">-Desc. {item.appliedDiscount}%</div>}
                        </td>
                        <td className="py-1 text-right align-top">{item.qty}</td>
                        <td className="py-1 text-right align-top text-slate-500">{item.price.toFixed(2)}</td>
                        <td className="py-1 text-right align-top font-bold">Bs. {item.totalItemPrice.toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="py-1 text-left align-top max-w-[130px] truncate">{ticketSale.product_name}</td>
                        <td className="py-1 text-right align-top">{ticketSale.qty}</td>
                        <td className="py-1 text-right align-top text-slate-500">{ticketSale.unit_price?.toFixed(2)}</td>
                        <td className="py-1 text-right align-top font-bold">Bs. {ticketSale.total.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table></div>
                
                <div className="border-t border-dashed border-slate-350 my-1"></div>
                
                {ticketSale.items && (ticketSale.subtotal - ticketSale.total > 0) && (
                  <>
                    <div className="flex justify-between items-center text-[10px] text-slate-600">
                      <span>SUBTOTAL:</span>
                      <span>Bs. {ticketSale.subtotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-600">
                      <span>DESCUENTOS:</span>
                      <span>- Bs. {(ticketSale.subtotal - ticketSale.total).toLocaleString("es-BO", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
                
                <div className="flex justify-between items-center text-xs font-black text-slate-950 mt-1 pt-1 border-t border-slate-200">
                  <span>TOTAL A PAGAR:</span>
                  <span>Bs. {ticketSale.total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</span>
                </div>
                
                <div className="border-t border-dashed border-slate-350 my-1"></div>
                
                <div className="text-center text-[8.5px] space-y-0.5 text-slate-600 leading-tight">
                  <p className="font-semibold">¡Gracias por su preferencia!</p>
                  <p>PIL Chuquisaca S.A. - Alimentando a la familia boliviana</p>
                  <p>Documento sin valor tributario</p>
                </div>
              </div>
            </div>
            
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
              <button 
                onClick={() => printTicket(ticketSale)} 
                className="w-full justify-center flex items-center gap-2 px-4 py-2.5 bg-[#3776BC] text-white rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-md cursor-pointer border-0"
              >
                🖨️ Imprimir Ticket (80mm)
              </button>
              <div className="flex gap-2 w-full mt-2">
                <button 
                  onClick={async () => {
                    const el = document.getElementById("ticket-preview");
                    if(el) {
                      try {
                        const html2canvas = (await import('html2canvas')).default;
                        const canvas = await html2canvas(el, { backgroundColor: '#ffffff' });
                        const dataUrl = canvas.toDataURL('image/png');
                        const link = document.createElement('a');
                        link.download = `Ticket_Venta.png`;
                        link.href = dataUrl;
                        link.click();
                      } catch(e) {
                        console.error(e);
                        alert("Error al generar imagen");
                      }
                    }
                  }}
                  className="w-full justify-center px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 cursor-pointer border-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Descargar Imagen para WhatsApp
                </button>
              </div>
              <button 
                onClick={() => {
                  setShowTicketModal(false);
                  setTicketSale(null);
                  showToast("¡Venta registrada exitosamente!");
                }} 
                className="w-full justify-center flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cerrar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><Search size={18} /> Escáner Móvil</h3>
              <button onClick={() => setShowScanner(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 bg-slate-100">
              <div id="reader" className="w-full bg-black rounded-lg overflow-hidden border-2 border-slate-300"></div>
              <p className="text-center text-xs text-slate-500 mt-4 font-semibold">
                Apunta la cámara al código de barras del producto.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[99999] bg-emerald-600 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3.5 animate-in slide-in-from-bottom-6 duration-300 border border-emerald-500/20">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">✓</div>
          <div>
            <p className="text-sm font-black">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
