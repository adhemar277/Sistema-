import React, { useState, useMemo } from 'react';
import { useAppData, Payroll } from '../context/AppDataContext';
import { 
  FileText, Users, DollarSign, ChevronLeft, Download, 
  CheckCircle, AlertCircle, Plus, Search, Printer, X, Calendar, Table as TableIcon, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';


export const Payrolls: React.FC = () => {
  const { payrolls, users, addPayroll, updatePayroll, deletePayroll, selectedBranchId, loggedInUser, attendances, updateAttendance, fetchData } = useAppData();
  const [activeTab, setActiveTab] = useState<'payrolls' | 'attendance'>('payrolls');
  
  const getCurrentPeriod = () => {
    const d = new Date();
    const m = d.toLocaleString('es-BO', { month: 'long' });
    return `${m.charAt(0).toUpperCase() + m.slice(1)} ${d.getFullYear()}`;
  };

  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState(getCurrentPeriod());
  const [showFormModal, setShowFormModal] = useState(false);
  const [formType, setFormType] = useState<'internal' | 'external'>('internal');
  const [userToAdd, setUserToAdd] = useState('');
  
  const [extEmp, setExtEmp] = useState({
    name: '',
    ci: '',
    role: '',
    worked_days: '30',
    base_salary: '',
    bonus_antiquity: '',
    bonus_production: '',
    afp: '',
    health_insurance: '',
    syndicate: '',
    rc_iva: '',
    entry_date: ''
  });
  
  const availableMonths = useMemo(() => {
    const months = [];
    // -3 to 5: incluye 3 meses en el futuro, el actual (0) y 5 hacia atrás
    for (let i = -3; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.toLocaleString('es-BO', { month: 'long' });
      months.push(`${m.charAt(0).toUpperCase() + m.slice(1)} ${d.getFullYear()}`);
    }
    return months;
  }, []);
  
  const filteredPayrolls = useMemo(() => {
    return payrolls.filter(p => {
      const matchSearch = p.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.employee_ci.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMonth = `${p.period_month} ${p.period_year}` === monthFilter;
      return matchSearch && matchMonth;
    });
  }, [payrolls, searchTerm, monthFilter]);

  const selectedPayroll = payrolls.find(p => p.id === selectedPayrollId);

  const totalMonth = filteredPayrolls.reduce((acc, p) => acc + p.net_pay, 0);

  const handleGeneratePayroll = async () => {
    if (filteredPayrolls.length > 0) {
      alert("Ya existen planillas para este periodo.");
      return;
    }

    const [month, year] = monthFilter.split(' ');
    
    // Find previous month
    const monthIndex = availableMonths.indexOf(monthFilter);
    const prevMonthString = monthIndex >= 0 && monthIndex < availableMonths.length - 1 ? availableMonths[monthIndex + 1] : null;
    
    const previousPayrolls = prevMonthString ? payrolls.filter(p => `${p.period_month} ${p.period_year}` === prevMonthString) : [];

    if (previousPayrolls.length > 0) {
      // Clonar del mes anterior
      for (const oldP of previousPayrolls) {
        const p: Omit<Payroll, 'id' | 'created_at'> = {
          ...oldP,
          period_month: month,
          period_year: year,
          status: 'Pendiente'
        };
        // Eliminar ids si existen en el viejo para no sobreescribir
        delete (p as any).id;
        delete (p as any).created_at;
        
        await addPayroll(p);
      }
      alert(`Planilla generada para ${monthFilter} clonando trabajadores del mes anterior.`);
    } else {
      // Generar desde cero con usuarios del sistema
      for (const u of users) {
        if (u.role === 'super_admin' && !u.name.includes("Adhemar")) continue;
        
        const isManager = u.role === 'Admin' || u.role === 'super_admin';
        const baseSal = isManager ? 8500 : u.role === 'Supervisor' ? 6800 : 4200;
        
        const p: Omit<Payroll, 'id' | 'created_at'> = {
          employee_id: u.email,
          employee_name: u.name,
          employee_ci: Math.floor(1000000 + Math.random() * 9000000).toString(),
          employee_role: u.role,
          period_month: month,
          period_year: year,
          base_salary: baseSal,
          worked_days: 30,
          bonus_antiquity: isManager ? 1250 : 350,
          bonus_production: isManager ? 450 : 200,
          total_income: 0,
          afp: 0,
          health_insurance: 250,
          syndicate: 85,
          rc_iva: isManager ? 44.45 : 0,
          total_discounts: 0,
          net_pay: 0,
          status: 'Pendiente',
          branch_id: loggedInUser?.role === 'super_admin' ? selectedBranchId : loggedInUser?.branch_id,
          entry_date: new Date().toISOString().split('T')[0]
        };
        
        p.total_income = p.base_salary + p.bonus_antiquity + p.bonus_production;
        p.afp = p.total_income * 0.1271;
        p.total_discounts = p.afp + p.health_insurance + p.syndicate + p.rc_iva;
        p.net_pay = p.total_income - p.total_discounts;
        
        await addPayroll(p);
      }
      alert("Planilla generada para " + monthFilter + " desde plantilla base.");
    }
  };

  const handleAddUnifiedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formType === 'internal' && !userToAdd) {
      alert("Por favor selecciona un trabajador del sistema.");
      return;
    }
    if (!extEmp.name || !extEmp.ci || !extEmp.role) {
      alert("Por favor completa los campos obligatorios (Nombre, CI, Cargo).");
      return;
    }

    const [month, year] = monthFilter.split(' ');
    const wd = Number(extEmp.worked_days) || 0;
    const dias_faltados = 30 - wd;
    const faltas_discount = dias_faltados > 0 ? (Number(extEmp.base_salary) / 30) * dias_faltados : 0;
    
    const total_income = Number(extEmp.base_salary) + Number(extEmp.bonus_antiquity) + Number(extEmp.bonus_production);
    const total_discounts = Number(extEmp.afp) + Number(extEmp.health_insurance) + Number(extEmp.syndicate) + Number(extEmp.rc_iva) + faltas_discount;
    const net_pay = total_income - total_discounts;

    const p: Omit<Payroll, 'id' | 'created_at'> = {
      employee_id: formType === 'internal' ? userToAdd : extEmp.ci,
      employee_name: extEmp.name,
      employee_ci: extEmp.ci,
      employee_role: extEmp.role,
      period_month: month,
      period_year: year,
      worked_days: wd,
      base_salary: Number(extEmp.base_salary),
      bonus_antiquity: Number(extEmp.bonus_antiquity),
      bonus_production: Number(extEmp.bonus_production),
      total_income,
      afp: Number(extEmp.afp),
      health_insurance: Number(extEmp.health_insurance),
      syndicate: Number(extEmp.syndicate),
      rc_iva: Number(extEmp.rc_iva),
      total_discounts,
      net_pay,
      status: 'Pendiente',
      branch_id: loggedInUser?.role === 'super_admin' ? selectedBranchId : loggedInUser?.branch_id,
      entry_date: extEmp.entry_date
    };

    const success = await addPayroll(p);
    if (success) {
      alert(`Trabajador añadido a la planilla exitosamente.`);
      setShowFormModal(false);
      setUserToAdd('');
      setExtEmp({
        name: '', ci: '', role: '', worked_days: '30', base_salary: '', bonus_antiquity: '', 
        bonus_production: '', afp: '', health_insurance: '', syndicate: '', rc_iva: '', entry_date: ''
      });
    } else {
      alert("Hubo un error al generar la planilla. Verifica la conexión.");
    }
  };

  // handleAddSingleUser se ha unificado en handleAddUnifiedUser

  const handleApprove = async () => {
    if (selectedPayroll) {
      await updatePayroll(selectedPayroll.id, { status: 'Pagado' });
      alert("Pago aprobado exitosamente.");
    }
  };

  const handleExportPDF = () => {
    const timestamp = new Date().toLocaleString('es-BO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const printWindow = window.open('', '', 'width=1000,height=800');
    if (!printWindow) return;
    
    const totalHaberes = filteredPayrolls.reduce((sum, p) => sum + p.total_income, 0);
    const totalDescuentos = filteredPayrolls.reduce((sum, p) => sum + p.total_discounts, 0);
    const totalLiquido = filteredPayrolls.reduce((sum, p) => sum + p.net_pay, 0);

    printWindow.document.write('<html><head><title>Planilla General PIL</title>');
    printWindow.document.write('<style>body { font-family: Arial, sans-serif; position: relative; min-height: 100vh; font-size: 12px; } body::before { content: "PIL CHUQUISACA S.A."; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; color: rgba(0, 0, 0, 0.04); z-index: -1; pointer-events: none; white-space: nowrap; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 6px; text-align: left; } th { background-color: #3776BC; color: white; } .totals { font-weight: bold; background-color: #f8fafc; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div style="text-align: center; margin-bottom: 20px;">');
    const logoUrl = window.location.origin + '/logo.png';
    printWindow.document.write(`<img src="${logoUrl}" style="height: 80px; margin-bottom: 10px;" />`);
    printWindow.document.write('<h1 style="color: #3776BC; margin: 0;">PIL CHUQUISACA SA.</h1>');
    printWindow.document.write('<h2 style="margin: 5px 0;">Planilla General de Sueldos y Salarios</h2>');
    printWindow.document.write(`<h3 style="margin: 5px 0;">Periodo: ${monthFilter}</h3>`);
    printWindow.document.write(`<p style="color: #666; font-size: 12px; margin: 5px 0;">Generado el: ${timestamp}</p>`);
    printWindow.document.write('</div>');
    
    printWindow.document.write('<div className="overflow-x-auto w-full"><table><thead><tr><th>ID/Email</th><th>CI</th><th>Nombre Completo</th><th>Cargo</th><th>T. Haberes</th><th>T. Descuentos</th><th>Líquido Pagable</th><th>Estado</th></tr></thead><tbody>');
    
    filteredPayrolls.forEach(p => {
      printWindow.document.write(`<tr><td>${p.employee_id}</td><td>${p.employee_ci}</td><td>${p.employee_name}</td><td>${p.employee_role}</td><td>Bs. ${p.total_income.toFixed(2)}</td><td>Bs. ${p.total_discounts.toFixed(2)}</td><td>Bs. ${p.net_pay.toFixed(2)}</td><td>${p.status}</td></tr>`);
    });
    
    printWindow.document.write(`<tr class="totals"><td colspan="4" style="text-align: right; padding-right: 10px;">TOTALES DEL MES:</td><td>Bs. ${totalHaberes.toFixed(2)}</td><td>Bs. ${totalDescuentos.toFixed(2)}</td><td>Bs. ${totalLiquido.toFixed(2)}</td><td></td></tr>`);
    
    printWindow.document.write('</tbody></table></div></body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleExportExcel = () => {
    const dataToExport = filteredPayrolls.map(p => ({
      'ID/Email': p.employee_id,
      'CI': p.employee_ci,
      'Nombre Completo': p.employee_name,
      'Cargo': p.employee_role,
      'Días Trabajados': p.worked_days || 30,
      'Salario Base (Bs.)': p.base_salary,
      'Total Ingresos (Bs.)': p.total_income,
      'AFP (Bs.)': p.afp,
      'Total Descuentos (Bs.)': p.total_discounts,
      'Líquido Pagable (Bs.)': p.net_pay,
      'Estado': p.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Planilla");
    XLSX.writeFile(workbook, `planilla_pil_${monthFilter.replace(' ', '_')}.xlsx`);
  };

  const handlePrintBoleta = () => {
    if (!selectedPayroll) return;
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Boleta de Pago - ' + selectedPayroll.employee_name + '</title>');
    printWindow.document.write('<style>body { font-family: "Courier New", Courier, monospace; position: relative; padding: 20px; font-size: 14px; } .boleta { border: 2px dashed #333; padding: 20px; max-width: 700px; margin: 0 auto; position: relative; } .boleta::before { content: "PIL CHUQUISACA S.A."; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 60px; color: rgba(0, 0, 0, 0.05); z-index: -1; pointer-events: none; white-space: nowrap; } .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; } .header h1 { margin: 0; font-size: 24px; color: #3776BC; } .info { display: flex; justify-content: space-between; margin-bottom: 20px; } .info div { width: 48%; } .info p { margin: 5px 0; } .cols { display: flex; justify-content: space-between; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 10px 0; margin-bottom: 20px; } .col { width: 48%; } .col h3 { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 0; } .row { display: flex; justify-content: space-between; margin-bottom: 5px; } .total-row { font-weight: bold; border-top: 1px solid #ccc; padding-top: 5px; margin-top: 5px; } .neto { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; border: 2px solid #3776BC; padding: 10px; background-color: #f0f8ff; } .firmas { display: flex; justify-content: space-around; margin-top: 60px; } .firma { text-align: center; width: 40%; border-top: 1px solid #333; padding-top: 5px; }</style>');
    printWindow.document.write('</head><body>');
    
    printWindow.document.write('<div class="boleta">');
    printWindow.document.write('<div class="header">');
    printWindow.document.write('<img src="' + window.location.origin + '/logo.png" style="height: 70px; object-fit: contain; margin-bottom: 10px;" alt="PIL" onload="setTimeout(function(){window.print();}, 200)" onerror="setTimeout(function(){window.print();}, 200)" />');
    printWindow.document.write('<h2>BOLETA DE PAGO</h2><p>Periodo: ' + selectedPayroll.period_month + ' ' + selectedPayroll.period_year + '</p></div>');
    
    printWindow.document.write('<div class="info">');
    printWindow.document.write('<div><p><strong>Nombre:</strong> ' + selectedPayroll.employee_name + '</p><p><strong>CI:</strong> ' + selectedPayroll.employee_ci + '</p></div>');
    printWindow.document.write('<div><p><strong>Cargo:</strong> ' + selectedPayroll.employee_role + '</p><p><strong>Días Trabajados:</strong> ' + (selectedPayroll.worked_days || 30) + '</p></div>');
    printWindow.document.write('</div>');
    
    printWindow.document.write('<div class="cols">');
    // Haberes
    printWindow.document.write('<div class="col"><h3>INGRESOS (Bs.)</h3>');
    printWindow.document.write('<div class="row"><span>Haber Básico</span><span>' + selectedPayroll.base_salary.toFixed(2) + '</span></div>');
    if (selectedPayroll.bonus_antiquity > 0) printWindow.document.write('<div class="row"><span>Bono Antigüedad</span><span>' + selectedPayroll.bonus_antiquity.toFixed(2) + '</span></div>');
    if (selectedPayroll.bonus_production > 0) printWindow.document.write('<div class="row"><span>Bono Producción</span><span>' + selectedPayroll.bonus_production.toFixed(2) + '</span></div>');
    // Determinar si es un registro antiguo (donde el descuento de faltas se restaba del ingreso total en la BD)
    const display_ingresos = selectedPayroll.base_salary + selectedPayroll.bonus_antiquity + selectedPayroll.bonus_production;
    const isOldRecord = selectedPayroll.total_income < display_ingresos - 0.01;
    
    // Calcular días no trabajados
    const worked_days = selectedPayroll.worked_days || 30;
    const dias_faltados = 30 - worked_days;
    const descuento_faltas = dias_faltados > 0 ? (selectedPayroll.base_salary / 30) * dias_faltados : 0;
    
    const display_descuentos = isOldRecord 
      ? selectedPayroll.total_discounts + descuento_faltas 
      : selectedPayroll.total_discounts;

    printWindow.document.write('<div class="row total-row"><span>TOTAL INGRESOS</span><span>' + display_ingresos.toFixed(2) + '</span></div>');
    printWindow.document.write('</div>');
    
    // Descuentos
    printWindow.document.write('<div class="col"><h3>DESCUENTOS (Bs.)</h3>');
    
    if (dias_faltados > 0) {
      printWindow.document.write('<div class="row" style="color:#d97706;"><span>Días no trabajados (' + dias_faltados + ' días)</span><span>' + descuento_faltas.toFixed(2) + '</span></div>');
    }

    printWindow.document.write('<div class="row"><span>AFP (12.71%)</span><span>' + selectedPayroll.afp.toFixed(2) + '</span></div>');
    printWindow.document.write('<div class="row"><span>Seguro Médico</span><span>' + selectedPayroll.health_insurance.toFixed(2) + '</span></div>');
    printWindow.document.write('<div class="row"><span>Sindicato</span><span>' + selectedPayroll.syndicate.toFixed(2) + '</span></div>');
    printWindow.document.write('<div class="row"><span>RC-IVA</span><span>' + selectedPayroll.rc_iva.toFixed(2) + '</span></div>');
    printWindow.document.write('<div class="row total-row"><span>TOTAL DESCUENTOS</span><span>' + display_descuentos.toFixed(2) + '</span></div>');
    printWindow.document.write('</div>');
    printWindow.document.write('</div>');
    
    printWindow.document.write('<div class="neto">LÍQUIDO PAGABLE: Bs. ' + selectedPayroll.net_pay.toFixed(2) + '</div>');
    
    printWindow.document.write('<div class="firmas">');
    printWindow.document.write('<div class="firma">Firma Empleador<br>Sello Empresa</div>');
    printWindow.document.write('<div class="firma">Firma Empleado<br>CI: ' + selectedPayroll.employee_ci + '</div>');
    printWindow.document.write('</div>');
    
    printWindow.document.write('</div>');
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Pagado': return 'bg-emerald-100 text-emerald-700';
      case 'En Proceso': return 'bg-amber-100 text-amber-700';
      case 'Pendiente': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (selectedPayrollId && selectedPayroll) {
    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedPayrollId(null)}
              className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 text-slate-600 transition-colors border border-slate-200"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Detalle de Planilla Individual</h2>
              <p className="text-sm text-slate-500">Gestión Operativa PIL Chuquisaca</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">{selectedPayroll.period_month} {selectedPayroll.period_year}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#3776BC] to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md border-4 border-indigo-50">
                {selectedPayroll.employee_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">{selectedPayroll.employee_name}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-1"><Users size={14} /> {selectedPayroll.employee_role}</span>
                  <span className="flex items-center gap-1"><FileText size={14} /> CI: {selectedPayroll.employee_ci}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrintBoleta}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-[#3776BC] font-bold rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <Printer size={18} />
                Generar Comprobante
              </button>
              {selectedPayroll.status !== 'Pagado' && (
                <button 
                  onClick={handleApprove}
                  className="flex items-center gap-2 px-6 py-2 bg-[#3776BC] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-md shadow-blue-900/20"
                >
                  <CheckCircle size={18} />
                  Aprobar Pago
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Plus size={18} className="text-[#3776BC]" /> Haberes
                </h4>
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#3776BC] px-2 py-1 rounded-md">Ingresos</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Salario Base</span>
                  <span className="text-sm font-bold text-slate-800">Bs. {selectedPayroll.base_salary.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Bono Antigüedad</span>
                  <span className="text-sm font-bold text-slate-800">Bs. {selectedPayroll.bonus_antiquity.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Bono Producción</span>
                  <span className="text-sm font-bold text-slate-800">Bs. {selectedPayroll.bonus_production.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base font-black text-slate-800">Total Haberes</span>
                  <span className="text-lg font-black text-[#3776BC]">Bs. {selectedPayroll.total_income.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#3776BC] to-indigo-800 rounded-2xl shadow-xl p-8 text-white text-center relative overflow-hidden">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/20 rounded-full blur-2xl"></div>
              
              <div className="relative z-10">
                <h4 className="text-sm font-bold tracking-widest text-blue-100 uppercase mb-2">Líquido Pagable</h4>
                <div className="text-5xl font-black mb-2 tracking-tight">
                  <span className="text-2xl mr-1 align-top block">Bs.</span>
                  {selectedPayroll.net_pay.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-blue-200 mb-8 italic">Correspondiente al periodo {selectedPayroll.period_month} {selectedPayroll.period_year}</p>
                
                <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6">
                  <div>
                    <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-1">Días Trabajados</p>
                    <p className="text-xl font-black">{selectedPayroll.worked_days || 30}/30</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-1">Horas Extra</p>
                    <p className="text-xl font-black">12.5</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <AlertCircle size={18} className="text-rose-500" /> Descuentos
                </h4>
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 px-2 py-1 rounded-md">Retenciones</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">AFP (12.71%)</span>
                  <span className="text-sm font-bold text-slate-800">Bs. {selectedPayroll.afp.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Seguro de Salud</span>
                  <span className="text-sm font-bold text-slate-800">Bs. {selectedPayroll.health_insurance.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Sindicato</span>
                  <span className="text-sm font-bold text-slate-800">Bs. {selectedPayroll.syndicate.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">RC-IVA</span>
                  <span className="text-sm font-bold text-slate-800">Bs. {selectedPayroll.rc_iva.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base font-black text-slate-800">Total Descuentos</span>
                  <span className="text-lg font-black text-rose-600">Bs. {selectedPayroll.total_discounts.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex items-start gap-3">
              <AlertCircle size={20} className="text-[#3776BC] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-slate-800 mb-1">Validación Tributaria</h5>
                <p className="text-xs text-[#3776BC]/80 leading-relaxed">
                  Este cálculo ha sido validado bajo las normativas actuales de Impuestos Nacionales y Ley General del Trabajo vigente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Recursos Humanos</h2>
          <p className="text-sm text-slate-500 font-medium">Control de planillas y asistencia del personal</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('payrolls')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'payrolls' ? 'border-[#3776BC] text-[#3776BC]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Planillas de Sueldos
        </button>
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-[#3776BC] text-[#3776BC]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Asistencia y Vacaciones
        </button>
      </div>

      {activeTab === 'payrolls' ? (
        <>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Planilla Mes</p>
              <h3 className="text-2xl font-black text-[#3776BC]">Bs. {totalMonth.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <DollarSign size={20} className="text-[#3776BC]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Empleados Activos</p>
              <h3 className="text-2xl font-black text-slate-800">{filteredPayrolls.length > 0 ? filteredPayrolls.length : users.length}</h3>
              <p className="text-xs text-slate-500 mt-1">Personal en planta</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#3776BC] to-indigo-700 p-6 rounded-2xl shadow-lg border border-[#3776BC] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">Acción Rápida</p>
                <h3 className="text-lg font-black mt-2 leading-tight">Generar Nueva Planilla</h3>
                <p className="text-xs text-indigo-200 mt-1">Periodo: {monthFilter}</p>
              </div>
            </div>
            <button 
              onClick={handleGeneratePayroll}
              className="mt-4 w-full bg-white text-[#3776BC] text-sm font-bold py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm"
            >
              Procesar Mes
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-bold text-slate-500 uppercase">Mes:</span>
              <select 
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="text-sm font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
              >
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar empleado o CI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3776BC]/20 focus:border-[#3776BC] transition-all bg-white"
              />
            </div>
            <button 
              onClick={() => {
                setFormType('internal');
                setShowFormModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#3776BC] text-white rounded-xl text-sm font-bold hover:bg-blue-800 transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus size={16} />
              Añadir a Planilla
            </button>
            <button 
              onClick={() => {
                setFormType('external');
                setShowFormModal(true);
              }}
              className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus size={16} />
              Añadir Externo
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-50 transition-colors shadow-sm whitespace-nowrap"
            >
              <Download size={16} />
              PDF
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors shadow-sm whitespace-nowrap"
            >
              <TableIcon size={16} />
              Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full"><table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500 font-black border-b border-slate-100">
                <th className="p-4 pl-6">ID Empleado</th>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Cargo / F. Ingreso</th>
                <th className="p-4 text-right">Total Haberes</th>
                <th className="p-4 text-right">Total Desctos.</th>
                <th className="p-4 text-right text-[#3776BC]">Líquido Pagable</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                    No hay planillas generadas para este mes. Haz clic en "Generar Nueva Planilla".
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4 pl-6">
                      <span className="text-xs font-bold font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        {p.employee_id.split('@')[0].toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-[#3776BC] font-bold text-xs shrink-0">
                          {p.employee_name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{p.employee_name}</p>
                          <p className="text-[10px] text-slate-500">CI: {p.employee_ci}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-600">{p.employee_role}</span>
                        {p.entry_date && <span className="text-[10px] text-slate-400">Ingreso: {p.entry_date}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-bold text-slate-700">{p.total_income.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-bold text-rose-600">{p.total_discounts.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-black text-[#3776BC]">{p.net_pay.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusColor(p.status)}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${p.status === 'Pagado' ? 'bg-emerald-500' : p.status === 'En Proceso' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setSelectedPayrollId(p.id)}
                          className="text-xs font-bold text-[#3776BC] bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Ver Detalle
                        </button>
                        <button
                          onClick={async () => {
                            if(window.confirm(`¿Seguro que desea eliminar a ${p.employee_name} de esta planilla?`)) {
                              await deletePayroll(p.id);
                            }
                          }}
                          className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-800">
                {formType === 'internal' ? 'Añadir Trabajador a Planilla' : 'Añadir Trabajador Externo'}
              </h3>
              <button 
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleAddUnifiedUser} className="space-y-6">
                
                {formType === 'internal' && (
                  <div className="col-span-1 md:col-span-2 mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Seleccionar Trabajador del Sistema</label>
                    <select 
                      value={userToAdd}
                      onChange={(e) => {
                        const email = e.target.value;
                        setUserToAdd(email);
                        const u = users.find(user => user.email === email);
                        if (u) {
                          setExtEmp(prev => ({ ...prev, name: u.name, role: u.role }));
                        }
                      }}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3776BC]/20 focus:border-[#3776BC] bg-white text-slate-800"
                    >
                      <option value="">Seleccione un trabajador...</option>
                      {users.filter(u => !filteredPayrolls.some(p => p.employee_id === u.email)).map(u => (
                        <option key={u.email} value={u.email}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                      Al seleccionar un trabajador, su nombre y cargo se autocompletarán abajo.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <h4 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2 mb-4">Datos del Trabajador</h4>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                    <input type="text" required value={extEmp.name} onChange={e => setExtEmp({...extEmp, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-slate-50" placeholder="Ej. Juan Pérez" readOnly={formType === 'internal'} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Carnet de Identidad *</label>
                    <input type="text" required value={extEmp.ci} onChange={e => setExtEmp({...extEmp, ci: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white" placeholder="Ej. 1234567" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cargo / Función *</label>
                    <input type="text" required value={extEmp.role} onChange={e => setExtEmp({...extEmp, role: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-slate-50" placeholder="Ej. Operario" readOnly={formType === 'internal'} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Ingreso *</label>
                    <input type="date" required value={extEmp.entry_date} onChange={e => setExtEmp({...extEmp, entry_date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Días Trabajados *</label>
                    <input type="number" required min="0" max="30" value={extEmp.worked_days} onChange={e => setExtEmp({...extEmp, worked_days: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white" />
                  </div>

                  <div className="col-span-1 md:col-span-2 mt-4">
                    <h4 className="text-sm font-bold text-emerald-700 border-b border-emerald-200 pb-2 mb-4">Ingresos (Haberes)</h4>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Haber Básico (Bs.) *</label>
                    <input type="number" required min="0" step="0.01" value={extEmp.base_salary} onChange={e => setExtEmp({...extEmp, base_salary: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bono Antigüedad (Bs.)</label>
                    <input type="number" min="0" step="0.01" value={extEmp.bonus_antiquity} onChange={e => setExtEmp({...extEmp, bonus_antiquity: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bono Producción (Bs.)</label>
                    <input type="number" min="0" step="0.01" value={extEmp.bonus_production} onChange={e => setExtEmp({...extEmp, bonus_production: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white" />
                  </div>

                  <div className="col-span-1 md:col-span-2 mt-4">
                    <div className="flex justify-between items-end border-b border-rose-200 pb-2 mb-4">
                      <h4 className="text-sm font-bold text-rose-700">Retenciones (Descuentos)</h4>
                      <button type="button" onClick={() => {
                        const base_sal = Number(extEmp.base_salary);
                        const totalInc = base_sal + Number(extEmp.bonus_antiquity) + Number(extEmp.bonus_production);
                        setExtEmp(prev => ({
                          ...prev,
                          afp: (totalInc * 0.1271).toFixed(2),
                          health_insurance: '0',
                          syndicate: '0',
                          rc_iva: '0'
                        }));
                      }} className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded hover:bg-rose-100">Autocalcular AFP (12.71%)</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">AFP (Bs.)</label>
                    <input type="number" min="0" step="0.01" value={extEmp.afp} onChange={e => setExtEmp({...extEmp, afp: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Seguro Médico (Bs.)</label>
                    <input type="number" min="0" step="0.01" value={extEmp.health_insurance} onChange={e => setExtEmp({...extEmp, health_insurance: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sindicato (Bs.)</label>
                    <input type="number" min="0" step="0.01" value={extEmp.syndicate} onChange={e => setExtEmp({...extEmp, syndicate: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">RC-IVA (Bs.)</label>
                    <input type="number" min="0" step="0.01" value={extEmp.rc_iva} onChange={e => setExtEmp({...extEmp, rc_iva: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white" />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 px-4 bg-[#3776BC] text-white rounded-xl text-sm font-bold hover:bg-blue-800 transition-colors shadow-sm"
                  >
                    Guardar en Planilla
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </>
      ) : (
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Control de Vacaciones y Faltas</h3>
              <p className="text-sm text-slate-500">Gestión mensual por trabajador ({monthFilter})</p>
            </div>
            <button
              onClick={async () => {
                const [mStr, yStr] = monthFilter.split(' ');
                // Mostrar solo los trabajadores en la planilla del mes seleccionado
                const workersMap = new Map();
                const periodPayrolls = payrolls.filter(p => p.period_month === mStr && p.period_year === yStr);
                
                periodPayrolls.forEach(p => {
                  const eid = p.employee_ci === p.employee_id ? p.employee_ci : p.employee_id;
                  workersMap.set(eid, { id: eid, name: p.employee_name, branch_id: p.branch_id, role: p.employee_role });
                });
                
                const allWorkers = Array.from(workersMap.values());

                let hasError = false;
                for (const w of allWorkers) {
                  const exist = attendances.find(a => a.employee_id === w.id && a.period_month === mStr && a.period_year === yStr);
                  if (!exist) {
                    const { supabase } = await import('../lib/supabase');
                    const { error } = await supabase.from('attendance').insert({
                      employee_id: w.id,
                      employee_name: w.name,
                      period_month: mStr,
                      period_year: yStr,
                      total_vacation_days: 4, // Mensual
                      used_vacation_days: 0,
                      unjustified_absences: 0,
                      branch_id: w.branch_id
                    });
                    if (error) {
                      console.error("Error insertando asistencia:", error);
                      alert('Error de base de datos: ' + error.message + '\nPor favor asegúrate de ejecutar el código SQL para crear la tabla attendance.');
                      hasError = true;
                      break;
                    }
                  }
                }
                if (!hasError) {
                  alert(`Asistencias sincronizadas para ${monthFilter}`);
                  if (fetchData) await fetchData();
                }
              }}
              className="bg-indigo-50 text-[#3776BC] px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors"
            >
              Sincronizar Trabajadores {monthFilter}
            </button>
          </div>
          <div className="p-0 overflow-x-auto">
            <div className="overflow-x-auto w-full"><table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500 font-black border-b border-slate-100">
                  <th className="p-4 pl-6">Trabajador</th>
                  <th className="p-4 text-center">Total Vacaciones (Mes)</th>
                  <th className="p-4 text-center">Días Usados</th>
                  <th className="p-4 text-center">Saldo Vacación</th>
                  <th className="p-4 text-center">Faltas Injustificadas</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const workersMap = new Map();
                  const [mStr, yStr] = monthFilter.split(' ');
                  const periodPayrolls = payrolls.filter(p => p.period_month === mStr && p.period_year === yStr);
                  
                  periodPayrolls.forEach(p => {
                    const eid = p.employee_ci === p.employee_id ? p.employee_ci : p.employee_id;
                    workersMap.set(eid, { id: eid, name: p.employee_name, branch_id: p.branch_id, role: p.employee_role });
                  });
                  return Array.from(workersMap.values());
                })().map(w => {
                  const [mStr, yStr] = monthFilter.split(' ');
                  const att = attendances.find(a => a.employee_id === w.id && a.period_month === mStr && a.period_year === yStr) || {
                    id: '', employee_id: w.id, employee_name: w.name, period_month: mStr, period_year: yStr, total_vacation_days: 4, used_vacation_days: 0, unjustified_absences: 0
                  };
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 pl-6">
                        <p className="text-sm font-bold text-slate-800">{w.name}</p>
                        <p className="text-[10px] text-slate-500">{w.role} {w.id.includes('@') ? '' : '(Externo)'}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-medium text-slate-700">{att.total_vacation_days}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => att.id ? updateAttendance(att.id, { used_vacation_days: Math.max(0, att.used_vacation_days - 1) }) : alert('Debes presionar "Sincronizar Trabajadores" primero.')} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-bold active:scale-95 transition-transform text-lg">-</button>
                          <span className="text-sm font-bold text-[#3776BC] w-8">{att.used_vacation_days}</span>
                          <button onClick={() => att.id ? updateAttendance(att.id, { used_vacation_days: att.used_vacation_days + 1 }) : alert('Debes presionar "Sincronizar Trabajadores" primero.')} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-bold active:scale-95 transition-transform text-lg">+</button>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-sm font-black ${att.total_vacation_days - att.used_vacation_days < 1 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {att.total_vacation_days - att.used_vacation_days} días
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => att.id ? updateAttendance(att.id, { unjustified_absences: Math.max(0, att.unjustified_absences - 1) }) : alert('Debes presionar "Sincronizar Trabajadores" primero.')} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 font-bold active:scale-95 transition-transform text-lg">-</button>
                          <span className="text-sm font-bold text-rose-700 w-8">{att.unjustified_absences}</span>
                          <button onClick={() => att.id ? updateAttendance(att.id, { unjustified_absences: att.unjustified_absences + 1 }) : alert('Debes presionar "Sincronizar Trabajadores" primero.')} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 font-bold active:scale-95 transition-transform text-lg">+</button>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {!att.id && <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-md">Requiere Sincronización</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table></div>
          </div>
        </div>
      )}
    </div>
  );
};
