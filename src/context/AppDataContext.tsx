import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface Branch {
  id: string;
  name: string;
  address?: string;
}

export interface InventoryItem {
  sku: string;
  branch_id: string;
  name: string;
  lot: string;
  exp: string;
  qty: number;
  unit: string;
  status: string;
  category: string;
  price: number;
}

export interface User {
  initials: string;
  name: string;
  email: string;
  role: string;
  lastAccess: string;
  status: string;
  color: string;
  password?: string;
  branch_id?: string | null;
}

export interface Movement {
  id: string;
  branch_id: string;
  date: string;
  sku: string;
  name: string;
  qty: number;
  type: 'Entrada' | 'Salida' | 'Merma';
  reason: string;
  value: number;
  userName?: string;
  userRole?: string;
}

export interface Alert {
  id: string;
  branch_id: string;
  date: string;
  type: 'Bajo Stock' | 'Próximo a Vencer';
  message: string;
  read: boolean;
}

export interface Sale {
  id: string;
  branch_id: string;
  date: string;
  client: string;
  product_sku: string;
  product_name: string;
  qty: number;
  unit_price: number;
  total: number;
  status: 'Entregado' | 'En Tránsito' | 'Preparando' | 'Pendiente' | 'Despachado' | 'Programado';
  user_name?: string;
  nit_ci?: string;
  razon_social?: string;
  payment_method?: string;
  scheduled_date?: string;
}

export interface Payroll {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_ci: string;
  employee_role: string;
  period_month: string;
  period_year: string;
  worked_days: number;
  base_salary: number;
  bonus_antiquity: number;
  bonus_production: number;
  total_income: number;
  afp: number;
  health_insurance: number;
  syndicate: number;
  rc_iva: number;
  total_discounts: number;
  net_pay: number;
  status: 'Pagado' | 'En Proceso' | 'Pendiente';
  branch_id?: string | null;
  created_at?: string;
  entry_date?: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  employee_name: string;
  period_month: string;
  period_year: string;
  total_vacation_days: number;
  used_vacation_days: number;
  unjustified_absences: number;
  branch_id?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  product_sku: string;
  qty: number;
  total_cost: number;
  date?: string;
  branch_id: string;
}

export interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
}

export interface CashRegister {
  id: string;
  branch_id: string;
  opened_by: string;
  opened_at: string;
  closed_at?: string;
  opening_balance: number;
  closing_balance?: number;
  expected_balance?: number;
  status: 'Abierta' | 'Cerrada';
}

interface AppDataContextType {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
  activeBranchId: string | null;
  addBranch: (branch: Branch) => Promise<boolean>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<boolean>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  movements: Movement[];
  alerts: Alert[];
  sales: Sale[];
  payrolls: Payroll[];
  setPayrolls: React.Dispatch<React.SetStateAction<Payroll[]>>;
  attendances: Attendance[];
  setAttendances: React.Dispatch<React.SetStateAction<Attendance[]>>;
  updateAttendance: (id: string, updates: Partial<Attendance>) => Promise<boolean>;
  markAlertRead: (id: string) => void;
  addMovement: (movement: Omit<Movement, 'id' | 'date' | 'userName' | 'userRole' | 'branch_id'>) => void;
  updateStock: (sku: string, qtyChange: number, type: 'Entrada' | 'Salida' | 'Merma', reason: string) => void;
  deleteProduct: (sku: string) => void;
  reactivateUser: (email: string) => void;
  loggedInUser: User | null;
  loginUser: (email: string, pass: string) => Promise<boolean>;
  logoutUser: () => void;
  updateUserPassword: (email: string, newPass: string) => void;
  addUser: (user: Omit<User, 'initials' | 'lastAccess' | 'status' | 'color'>) => Promise<void>;
  deleteUser: (email: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'date' | 'user_name' | 'branch_id'>) => Promise<boolean>;
  addPayroll: (payroll: Omit<Payroll, 'id' | 'created_at'>) => Promise<boolean>;
  updatePayroll: (id: string, updates: Partial<Payroll>) => Promise<boolean>;
  deletePayroll: (id: string) => Promise<boolean>;
  seedDatabase: () => Promise<void>;
  loading: boolean;
  fetchData: () => Promise<void>;
  suppliers: Supplier[];
  purchases: Purchase[];
  auditLogs: AuditLog[];
  cashRegisters: CashRegister[];
  addPurchase: (purchase: Omit<Purchase, 'id' | 'date'>) => Promise<boolean>;
  addAuditLog: (action: string, details: string) => Promise<void>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const defaultBranches: Branch[] = [
  { id: 'sucursal-a', name: 'Sucursal A - Central', address: 'Av. Jaime Mendoza #1420' },
  { id: 'sucursal-b', name: 'Sucursal B - Calvo', address: 'Calle Calvo #350' },
  { id: 'sucursal-c', name: 'Sucursal C - Sud', address: 'Av. Destacamento 111' },
];

const defaultUsers: User[] = [
  { initials: 'AG', name: 'Adhemar Garcia', email: 'agarcia@pil.com.bo', role: 'super_admin', lastAccess: 'Ahora', status: 'Activo', color: 'bg-indigo-100 text-[#3776BC]', password: 'admin' },
  { initials: 'AA', name: 'Admin Sucursal A', email: 'admin_a@pil.com.bo', role: 'Admin', lastAccess: 'Nunca', status: 'Activo', color: 'bg-blue-100 text-blue-700', password: 'admina', branch_id: 'sucursal-a' },
  { initials: 'AB', name: 'Admin Sucursal B', email: 'admin_b@pil.com.bo', role: 'Admin', lastAccess: 'Nunca', status: 'Activo', color: 'bg-emerald-100 text-emerald-700', password: 'adminb', branch_id: 'sucursal-b' },
  { initials: 'SA', name: 'Supervisor A', email: 'sup_a@pil.com.bo', role: 'Supervisor', lastAccess: 'Nunca', status: 'Activo', color: 'bg-orange-100 text-orange-700', password: 'supa', branch_id: 'sucursal-a' },
  { initials: 'SB', name: 'Supervisor B', email: 'sup_b@pil.com.bo', role: 'Supervisor', lastAccess: 'Nunca', status: 'Activo', color: 'bg-amber-100 text-amber-750', password: 'supb', branch_id: 'sucursal-b' },
  { initials: 'OA', name: 'Operario A', email: 'operario_a@pil.com.bo', role: 'Operario', lastAccess: 'Nunca', status: 'Activo', color: 'bg-slate-100 text-slate-700', password: '123', branch_id: 'sucursal-a' },
  { initials: 'OB', name: 'Operario B', email: 'operario_b@pil.com.bo', role: 'Operario', lastAccess: 'Nunca', status: 'Activo', color: 'bg-slate-100 text-slate-700', password: '123', branch_id: 'sucursal-b' },
];

const defaultInventory = [
  // Sucursal A
  { sku: 'PIL-LAC-001', branch_id: 'sucursal-a', name: 'Leche Entera UHT 1L', lot: 'L-20231015-A', exp: '15/04/2026', qty: 12500, unit: 'u.', status: 'Stock Saludable', category: 'Lácteos', price: 6.5 },
  { sku: 'PIL-YOG-042', branch_id: 'sucursal-a', name: 'Yogurt Frutado Fresa 2L', lot: 'L-20231102-B', exp: new Date(Date.now() + 86400000 * 3).toLocaleDateString('es-BO'), qty: 840, unit: 'u.', status: 'Próximo a Vencer', category: 'Lácteos', price: 18.0 },
  { sku: 'PIL-ENV-105', branch_id: 'sucursal-a', name: 'Bobina Film Termoencogible', lot: 'B-202308-05', exp: 'N/A', qty: 12, unit: 'kg', status: 'Bajo Stock', category: 'Envases', price: 120.0 },
  // Sucursal B
  { sku: 'PIL-LAC-001', branch_id: 'sucursal-b', name: 'Leche Entera UHT 1L', lot: 'L-20231015-B', exp: '15/04/2026', qty: 4500, unit: 'u.', status: 'Stock Saludable', category: 'Lácteos', price: 6.5 },
  { sku: 'PIL-MAN-018', branch_id: 'sucursal-b', name: 'Mantequilla con Sal 200g', lot: 'L-20231020-C', exp: '20/01/2026', qty: 1800, unit: 'u.', status: 'Stock Saludable', category: 'Lácteos', price: 15.0 },
  { sku: 'PIL-QSO-088', branch_id: 'sucursal-b', name: 'Queso Fresco 500g', lot: 'L-20231028-A', exp: new Date(Date.now() - 86400000 * 2).toLocaleDateString('es-BO'), qty: 150, unit: 'u.', status: 'Vencido', category: 'Lácteos', price: 25.0 },
];

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);

  // Master lists
  const [masterInventory, setMasterInventory] = useState<InventoryItem[]>([]);
  const [masterUsers, setMasterUsers] = useState<User[]>([]);
  const [masterMovements, setMasterMovements] = useState<Movement[]>([]);
  const [masterAlerts, setMasterAlerts] = useState<Alert[]>([]);
  const [masterSales, setMasterSales] = useState<Sale[]>([]);
  const [masterPayrolls, setMasterPayrolls] = useState<Payroll[]>([]);
  const [masterAttendances, setMasterAttendances] = useState<Attendance[]>([]);
  
  const [masterSuppliers, setMasterSuppliers] = useState<Supplier[]>([]);
  const [masterPurchases, setMasterPurchases] = useState<Purchase[]>([]);
  const [masterAuditLogs, setMasterAuditLogs] = useState<AuditLog[]>([]);
  const [masterCashRegisters, setMasterCashRegisters] = useState<CashRegister[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sgi_dark_mode');
    return saved === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem('sgi_dark_mode', String(newVal));
      return newVal;
    });
  };

  // Determinar la sucursal activa actual
  const activeBranchId = loggedInUser?.role === 'super_admin' ? selectedBranchId : (loggedInUser?.branch_id || null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [branchesRes, invRes, usersRes, movsRes, alertsRes, salesRes, payrollsRes, attendancesRes] = await Promise.all([
        supabase.from('branches').select('*'),
        supabase.from('inventory').select('*'),
        supabase.from('users').select('*'),
        supabase.from('movements').select('*').order('date', { ascending: false }),
        supabase.from('alerts').select('*').order('date', { ascending: false }),
        supabase.from('sales').select('*').order('date', { ascending: false }),
        supabase.from('payrolls').select('*').order('created_at', { ascending: false }),
        supabase.from('attendance').select('*'),
      ]);

      if (branchesRes.data) {
        setBranches(branchesRes.data);
      }
      
      if (invRes.data) {
        setMasterInventory(invRes.data);
      }

      if (usersRes.data && usersRes.data.length > 0) {
        const mappedUsers = usersRes.data.map(u => ({
          ...u,
          lastAccess: u.last_access,
          branch_id: u.branch_id
        }));

        // Red de seguridad: Si no hay ningún super_admin en la base de datos remota, inyectamos el super_admin por defecto
        const hasSuperAdmin = mappedUsers.some(u => u.role === 'super_admin');
        if (!hasSuperAdmin) {
          const defaultSuper = defaultUsers.find(u => u.role === 'super_admin');
          if (defaultSuper) {
            mappedUsers.push(defaultSuper);
          }
        }

        setMasterUsers(mappedUsers);
      } else {
        setMasterUsers(defaultUsers);
      }

      if (movsRes.data) {
        const mappedMovs = movsRes.data.map(m => ({
          ...m,
          userName: m.user_name,
          userRole: m.user_role
        }));
        setMasterMovements(mappedMovs);
      }

      if (alertsRes.data) {
        setMasterAlerts(alertsRes.data);
      }

      if (salesRes.data) {
        setMasterSales(salesRes.data as Sale[]);
      }

      if (payrollsRes.data) {
        setMasterPayrolls(payrollsRes.data as Payroll[]);
      }

      if (attendancesRes && attendancesRes.data) {
        setMasterAttendances(attendancesRes.data as Attendance[]);
      }

      // Nuevas tablas (envueltas en un try-catch independiente para no romper si no se corrió el SQL)
      try {
        const [supRes, purRes, auditRes, cashRes] = await Promise.all([
          supabase.from('suppliers').select('*'),
          supabase.from('purchases').select('*').order('date', { ascending: false }),
          supabase.from('audit_logs').select('*').order('created_at', { ascending: false }),
          supabase.from('cash_registers').select('*').order('opened_at', { ascending: false })
        ]);

        if (supRes.data) setMasterSuppliers(supRes.data as Supplier[]);
        if (purRes.data) setMasterPurchases(purRes.data as Purchase[]);
        if (auditRes.data) setMasterAuditLogs(auditRes.data as AuditLog[]);
        if (cashRes.data) setMasterCashRegisters(cashRes.data as CashRegister[]);
      } catch (e) {
        console.warn("Algunas tablas nuevas (suppliers, purchases, etc.) podrían no existir en la base de datos.", e);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Agregar una nueva sucursal
  const addBranch = async (branch: Branch): Promise<boolean> => {
    try {
      const { error } = await supabase.from('branches').insert([branch]);
      if (error) throw error;
      setBranches(prev => [...prev, branch]);
      return true;
    } catch (error: any) {
      console.error('Error al agregar sucursal:', error);
      alert('Error al agregar sucursal: ' + error.message);
      return false;
    }
  };

  const updateBranch = async (id: string, updates: Partial<Branch>): Promise<boolean> => {
    try {
      const { error } = await supabase.from('branches').update(updates).eq('id', id);
      if (error) throw error;
      setBranches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
      return true;
    } catch (error: any) {
      console.error('Error al actualizar sucursal:', error);
      alert('Error al actualizar sucursal: ' + error.message);
      return false;
    }
  };

  // Sembrar Base de Datos
  const seedDatabase = async () => {
    try {
      await supabase.from('movements').delete().neq('id', 'none');
      await supabase.from('sales').delete().neq('id', 'none');
      await supabase.from('inventory').delete().neq('sku', 'none');
      await supabase.from('users').delete().neq('email', 'none');
      await supabase.from('suppliers').delete().neq('id', 'none');
      await supabase.from('alerts').delete().neq('id', 'none');
      await supabase.from('branches').delete().neq('id', 'none');

      const { error: branchErr } = await supabase.from('branches').insert(defaultBranches);
      if (branchErr) throw branchErr;

      const { error: invErr } = await supabase.from('inventory').insert(defaultInventory);
      if (invErr) throw invErr;

      const mappedDefaultUsers = defaultUsers.map(u => ({
        email: u.email,
        initials: u.initials,
        name: u.name,
        role: u.role,
        last_access: 'Nunca',
        status: u.status,
        color: u.color,
        password: u.password,
        branch_id: u.branch_id || null
      }));
      const { error: userErr } = await supabase.from('users').insert(mappedDefaultUsers);
      if (userErr) throw userErr;

      const defaultSuppliers = [
        { id: 'PRV-001', name: 'Empaques Bolivia S.A.', category: 'Envases', contact: 'Juan Pérez', phone: '+591 71234567', status: 'Activo' },
        { id: 'PRV-002', name: 'Químicos Industriales SRL', category: 'Químicos', contact: 'María López', phone: '+591 79876543', status: 'Activo' },
        { id: 'PRV-003', name: 'Lácteos del Sur', category: 'Lácteos (Materia Prima)', contact: 'Carlos Mamani', phone: '+591 75551234', status: 'Activo' },
      ];
      await supabase.from('suppliers').insert(defaultSuppliers);

      // Sembrar ventas
      const now = new Date();
      const defaultSales = [
        { id: `sale-1`, branch_id: 'sucursal-a', date: new Date(now.getTime() - 3600000).toISOString(), client: 'Supermercado Central', product_sku: 'PIL-LAC-001', product_name: 'Leche Entera UHT 1L', qty: 100, unit_price: 6.5, total: 650, status: 'Entregado', user_name: 'Sistema' },
        { id: `sale-2`, branch_id: 'sucursal-b', date: new Date(now.getTime() - 7200000).toISOString(), client: 'Mercado Calvo', product_sku: 'PIL-MAN-018', product_name: 'Mantequilla con Sal 200g', qty: 50, unit_price: 15.0, total: 750, status: 'Entregado', user_name: 'Sistema' },
      ];
      await supabase.from('sales').insert(defaultSales);

      const defaultMov = {
        id: `mov-init`,
        branch_id: 'sucursal-a',
        date: new Date().toISOString(),
        sku: 'PIL-LAC-001',
        name: 'Leche Entera UHT 1L',
        qty: 100,
        type: 'Entrada',
        reason: 'Inventario Inicial',
        value: 650,
        user_name: 'Sistema',
        user_role: 'Auto'
      };
      await supabase.from('movements').insert([defaultMov]);

      await fetchData();
      alert('Base de datos inicializada con éxito con Sucursales A, B y C.');
    } catch (error: any) {
      console.error('Error seeding DB:', error);
      alert('Error inicializando base de datos: ' + error.message);
    }
  };

  // Movimientos
  const addMovement = async (movement: Omit<Movement, 'id' | 'date' | 'userName' | 'userRole' | 'branch_id'>) => {
    if (!activeBranchId) return;

    const newMov = {
      ...movement,
      id: `mov-${Date.now()}`,
      branch_id: activeBranchId,
      date: new Date().toISOString(),
      user_name: loggedInUser?.name || 'Sistema',
      user_role: loggedInUser?.role || 'Auto'
    };

    const { error } = await supabase.from('movements').insert([newMov]);

    if (!error) {
      const savedMov: Movement = {
        ...movement,
        id: newMov.id,
        branch_id: newMov.branch_id,
        date: newMov.date,
        userName: newMov.user_name,
        userRole: newMov.user_role
      };
      setMasterMovements(prev => [savedMov, ...prev]);
    } else {
      console.error("Error al registrar movimiento:", error);
    }
  };

  // Stock
  const updateStock = async (sku: string, qtyChange: number, type: 'Entrada' | 'Salida' | 'Merma', reason: string) => {
    if (!activeBranchId) return;

    const item = masterInventory.find(i => i.sku === sku && i.branch_id === activeBranchId);
    if (!item) return;

    const newValue = type === 'Entrada' ? item.qty + qtyChange : item.qty - qtyChange;
    let newStatus = item.status;

    if (newValue <= 20 && item.status !== 'Bajo Stock') {
      newStatus = 'Bajo Stock';
      const newAlert: Alert = {
        id: `alt-${Date.now()}`,
        branch_id: activeBranchId,
        date: new Date().toISOString(),
        type: 'Bajo Stock',
        message: `El producto ${item.name} (${item.sku}) en ${branches.find(b => b.id === activeBranchId)?.name || activeBranchId} ha bajado a un nivel crítico (${newValue} ${item.unit}).`,
        read: false
      };
      supabase.from('alerts').insert([newAlert]).then(() => {});
      setMasterAlerts(prev => [newAlert, ...prev]);
    } else if (item.status === 'Bajo Stock' && newValue > 20) {
      newStatus = 'Stock Saludable';
    }

    const newQty = Math.max(0, newValue);

    const { error } = await supabase.from('inventory')
      .update({ qty: newQty, status: newStatus })
      .eq('sku', sku)
      .eq('branch_id', activeBranchId);

    if (!error) {
      setMasterInventory(prev => prev.map(i => i.sku === sku && i.branch_id === activeBranchId ? { ...i, qty: newQty, status: newStatus } : i));
      addMovement({
        sku: item.sku,
        name: item.name,
        qty: qtyChange,
        type,
        reason,
        value: qtyChange * item.price
      });
    } else {
      console.error('Error al actualizar inventario:', error);
    }
  };

  // Eliminar producto
  const deleteProduct = async (sku: string) => {
    if (!activeBranchId) return;
    const { error } = await supabase.from('inventory')
      .delete()
      .eq('sku', sku)
      .eq('branch_id', activeBranchId);

    if (!error) {
      setMasterInventory(prev => prev.filter(item => !(item.sku === sku && item.branch_id === activeBranchId)));
    } else {
      console.error('Error al eliminar producto:', error);
    }
  };

  // Agregar venta
  const addSale = async (saleData: Omit<Sale, 'id' | 'date' | 'user_name' | 'branch_id'>): Promise<boolean> => {
    if (!activeBranchId) return false;

    const newSale: Sale = {
      ...saleData,
      id: `sale-${Date.now()}`,
      branch_id: activeBranchId,
      date: new Date().toISOString(),
      user_name: loggedInUser?.name || 'Sistema',
    };

    // Intentar inserción con todos los campos
    let { error } = await supabase.from('sales').insert([newSale]);

    // Fallback: si falla por falta de columnas nit_ci o razon_social, intentar inserción simplificada
    if (error && (error.message.includes('column') || error.code === '42703')) {
      console.warn('Faltan columnas nit_ci o razon_social en la base de datos de Supabase. Reintentando guardado simplificado...', error);
      const { nit_ci, razon_social, ...simplifiedSale } = newSale;
      // Concatenar datos de facturación en el campo 'client' para no perderlos
      if (nit_ci || razon_social) {
        simplifiedSale.client = `${simplifiedSale.client} (NIT: ${nit_ci || 'N/A'}, RS: ${razon_social || 'N/A'})`;
      }
      const fallbackResult = await supabase.from('sales').insert([simplifiedSale]);
      error = fallbackResult.error;
      
      // Si la inserción simplificada tuvo éxito, actualizar localmente con los datos guardados
      if (!error) {
        newSale.client = simplifiedSale.client;
      }
    }

    if (error) {
      console.error('Error al guardar venta:', error);
      return false;
    }

    setMasterSales(prev => [newSale, ...prev]);

    // Descontar del inventario
    await updateStock(
      saleData.product_sku,
      saleData.qty,
      'Salida',
      `Venta a ${newSale.client}`
    );

    return true;
  };

  const addPayroll = async (payroll: Omit<Payroll, 'id' | 'created_at'>): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from('payrolls').insert([payroll]).select();
      if (error) {
        console.error('Error insertando payroll:', error);
        return false;
      }
      if (data && data.length > 0) {
        setMasterPayrolls(prev => [data[0] as Payroll, ...prev]);
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const updatePayroll = async (id: string, updates: Partial<Payroll>): Promise<boolean> => {
    try {
      const { error } = await supabase.from('payrolls').update(updates).eq('id', id);
      if (error) {
        console.error('Error actualizando payroll:', error);
        return false;
      }
      setMasterPayrolls(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const deletePayroll = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('payrolls').delete().eq('id', id);
      if (error) {
        console.error('Error eliminando payroll:', error);
        return false;
      }
      setMasterPayrolls(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const updateAttendance = async (id: string, updates: Partial<Attendance>): Promise<boolean> => {
    try {
      const { error } = await supabase.from('attendance').update(updates).eq('id', id);
      if (error) {
        console.error('Error actualizando asistencia:', error);
        return false;
      }
      setMasterAttendances(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const reactivateUser = async (email: string) => {
    const { error } = await supabase.from('users').update({ status: 'Activo', color: 'bg-indigo-100 text-[#3776BC]' }).eq('email', email);
    if (!error) {
      setMasterUsers(prev => prev.map(u => u.email === email ? { ...u, status: 'Activo', color: 'bg-indigo-100 text-[#3776BC]' } : u));
    }
  };

  const setPayrolls = (action: React.SetStateAction<Payroll[]>) => {
    setMasterPayrolls(action);
  };

  const markAlertRead = async (id: string) => {
    const { error } = await supabase.from('alerts').update({ read: true }).eq('id', id);
    if (!error) {
      setMasterAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    }
  };

  // Cambiar contraseña
  const updateUserPassword = async (email: string, newPass: string) => {
    const { error } = await supabase.from('users').update({ password: newPass }).eq('email', email);
    if(!error) {
      setMasterUsers(prev => prev.map(u => u.email === email ? { ...u, password: newPass } : u));
    }
  };

  // Agregar usuario
  const addUser = async (userData: Omit<User, 'initials' | 'lastAccess' | 'status' | 'color'>) => {
    const initials = userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const newUser = {
      ...userData,
      initials,
      last_access: 'Nunca',
      status: 'Activo',
      color: userData.role === 'super_admin' ? 'bg-indigo-100 text-[#3776BC]' : userData.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700',
      branch_id: userData.branch_id || null
    };

    const dbUser = {
      email: newUser.email,
      initials: newUser.initials,
      name: newUser.name,
      role: newUser.role,
      last_access: newUser.last_access,
      status: newUser.status,
      color: newUser.color,
      password: newUser.password,
      branch_id: newUser.branch_id
    };

    const { error } = await supabase.from('users').insert([dbUser]);
    if (!error) {
      setMasterUsers(prev => [{ ...newUser, lastAccess: 'Nunca' }, ...prev]);
    } else {
      console.error('Error al agregar usuario:', error);
      alert('Error al guardar usuario en Supabase: ' + error.message);
    }
  };

  // Eliminar usuario
  const deleteUser = async (email: string) => {
    const { error } = await supabase.from('users').delete().eq('email', email);
    if (!error) {
      setMasterUsers(prev => prev.filter(u => u.email !== email));
    } else {
      console.error('Error al eliminar usuario:', error);
      alert('Error al eliminar usuario: ' + error.message);
    }
  };

  // Login
  const loginUser = async (email: string, pass: string): Promise<boolean> => {
    // Sincronizar directamente con Supabase al iniciar sesión para evitar datos obsoletos en caché
    const { data: usersData } = await supabase.from('users').select('*');
    const { data: branchesData } = await supabase.from('branches').select('*');
    
    if (branchesData) {
      setBranches(branchesData);
    }
    
    let currentUsers = masterUsers;
    if (usersData && usersData.length > 0) {
      const mappedUsers = usersData.map(u => ({
        ...u,
        lastAccess: u.last_access,
        branch_id: u.branch_id
      }));

      // Red de seguridad: Si no hay ningún super_admin en la base de datos remota, inyectamos el super_admin por defecto
      const hasSuperAdmin = mappedUsers.some(u => u.role === 'super_admin');
      if (!hasSuperAdmin) {
        const defaultSuper = defaultUsers.find(u => u.role === 'super_admin');
        if (defaultSuper) {
          mappedUsers.push(defaultSuper);
        }
      }

      setMasterUsers(mappedUsers);
      currentUsers = mappedUsers;
    }

    const user = currentUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (user) {
      if (user.status === 'Inactivo') return false;

      const now = new Date().toLocaleString('es-BO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      await supabase.from('users').update({ last_access: now }).eq('email', email);

      const updatedUser = { ...user, lastAccess: now };
      setMasterUsers(prev => prev.map(u => u.email === user.email ? updatedUser : u));
      setLoggedInUser(updatedUser);

      // Si no es super admin, auto-seleccionar su sucursal
      if (user.role !== 'super_admin' && user.branch_id) {
        setSelectedBranchId(user.branch_id);
      } else {
        setSelectedBranchId(null); // Obligar a pantalla intermedia
      }

      // Re-cargar todo el resto de la data de la sucursal activa en segundo plano
      fetchData();

      return true;
    }
    return false;
  };

  // Logout
  const logoutUser = () => {
    setLoggedInUser(null);
    setSelectedBranchId(null);
  };

  // Listas filtradas expuestas para los componentes
  const filteredInventory = masterInventory.filter(i => i.branch_id === activeBranchId);
  const movements = masterMovements.filter(m => m.branch_id === activeBranchId);
  const alerts = masterAlerts.filter(a => a.branch_id === activeBranchId);
  const sales = masterSales.filter(s => s.branch_id === activeBranchId);
  const payrolls = masterPayrolls.filter(p => p.branch_id === activeBranchId);
  
  // Segregación de personal
  const filteredUsers = loggedInUser?.role === 'super_admin'
    ? masterUsers
    : masterUsers.filter(u => u.branch_id === loggedInUser?.branch_id);

  // Nuevas listas filtradas
  const purchases = masterPurchases.filter(p => p.branch_id === activeBranchId);
  const cashRegisters = masterCashRegisters.filter(c => c.branch_id === activeBranchId);

  // Funciones nuevas
  const addAuditLog = async (action: string, details: string) => {
    if (!loggedInUser) return;
    const newLog = {
      user_email: loggedInUser.email,
      action,
      details,
      created_at: new Date().toISOString()
    };
    try {
      const { data, error } = await supabase.from('audit_logs').insert([newLog]).select();
      if (!error && data) {
        setMasterAuditLogs(prev => [data[0] as AuditLog, ...prev]);
      }
    } catch (e) {
      console.warn('Audit log table may not exist yet', e);
    }
  };

  const addPurchase = async (purchase: Omit<Purchase, 'id' | 'date'>) => {
    try {
      const newP = { ...purchase, date: new Date().toISOString() };
      const { data, error } = await supabase.from('purchases').insert([newP]).select();
      if (error) throw error;
      
      if (data && data[0]) {
        setMasterPurchases(prev => [data[0] as Purchase, ...prev]);
      }
      
      // Actualizar inventario (Entrada)
      updateStock(purchase.product_sku, purchase.qty, 'Entrada', `Compra a proveedor ${purchase.supplier_id}`);
      
      // Registrar log
      await addAuditLog('Compra', `Se registró una compra de ${purchase.qty} unidades del SKU ${purchase.product_sku} por Bs. ${purchase.total_cost}`);
      
      return true;
    } catch (e: any) {
      console.error('Error al agregar compra:', e);
      alert('Error al registrar compra: ' + e.message);
      return false;
    }
  };

  return (
    <AppDataContext.Provider value={{
      branches,
      setBranches,
      selectedBranchId,
      setSelectedBranchId,
      activeBranchId,
      addBranch,
      updateBranch,
      inventory: filteredInventory,
      setInventory: setMasterInventory as any,
      users: filteredUsers,
      setUsers: setMasterUsers as any,
      movements: movements,
      alerts: alerts,
      sales: sales,
      payrolls,
      setPayrolls,
      attendances: masterAttendances,
      setAttendances: setMasterAttendances as any,
      updateAttendance,
      markAlertRead,
      addMovement,
      updateStock,
      deleteProduct,
      reactivateUser,
      loggedInUser,
      loginUser,
      logoutUser,
      updateUserPassword,
      addUser,
      deleteUser,
      addSale,
      addPayroll,
      updatePayroll,
      deletePayroll,
      seedDatabase,
      loading,
      fetchData,
      suppliers: masterSuppliers,
      purchases,
      auditLogs: masterAuditLogs,
      cashRegisters,
      addPurchase,
      addAuditLog,
      isDarkMode,
      toggleDarkMode,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
