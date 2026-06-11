import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Package, BarChart2, Users, UserCircle, Clock, LogOut, Truck, Bell, ShoppingCart, Menu, X, FileText, Moon, Sun, ShieldAlert } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProfile, setShowProfile] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { loggedInUser, logoutUser, alerts, markAlertRead, branches, selectedBranchId, setSelectedBranchId, isDarkMode, toggleDarkMode } = useAppData();

  const unreadAlerts = alerts.filter(a => !a.read);
  const activeBranch = branches.find(b => b.id === (loggedInUser?.role === 'super_admin' ? selectedBranchId : loggedInUser?.branch_id));

  const [rolePerms, setRolePerms] = useState<Record<string, boolean[]>>(() => {
    const saved = localStorage.getItem("system_role_permissions");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      Admin:      [true, true, true, true],
      Supervisor: [true, true, false, false],
      Operario:   [true, true, false, false],
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem("system_role_permissions");
      if (saved) {
        try { setRolePerms(JSON.parse(saved)); } catch (e) { }
      }
    };
    window.addEventListener("permissionsChanged", handleUpdate);
    return () => window.removeEventListener("permissionsChanged", handleUpdate);
  }, []);

  const allNavItems = [
    { name: 'Resumen', path: '/dashboard', icon: LayoutGrid, roles: ['Admin', 'Supervisor', 'super_admin'] },
    { name: 'Inventario', path: '/inventory', icon: Package, roles: ['Admin', 'Supervisor', 'Operario', 'super_admin'] },
    { name: 'Ventas', path: '/sales', icon: ShoppingCart, roles: ['Admin', 'Supervisor', 'Operario', 'super_admin'] },
    { name: 'Reportes', path: '/reports', icon: BarChart2, roles: ['Admin', 'Supervisor', 'super_admin'] },
    { name: 'Planillas', path: '/payrolls', icon: FileText, roles: ['Admin', 'super_admin'] },
    { name: 'Proveedores y Compras', path: '/suppliers', icon: Truck, roles: ['Admin', 'Supervisor', 'super_admin'] },
    { name: 'Usuarios', path: '/users', icon: Users, roles: ['Admin', 'super_admin'] },
    { name: 'Auditoría', path: '/audit', icon: ShieldAlert, roles: ['super_admin'] },
  ];

  const navItems = allNavItems.filter(item => {
    if (!item.roles.includes(loggedInUser?.role || '')) return false;
    const userRole = loggedInUser?.role || 'Operario';

    // El super_admin tiene pase total bypass
    if (userRole === 'super_admin') return true;

    const perms = rolePerms[userRole] || [false, false, false, false];

    if (item.path === '/inventory' && !perms[1]) return false;
    if (item.path === '/sales' && !perms[0]) return false;
    if (item.path === '/suppliers' && !perms[0]) return false;
    if (item.path === '/reports' && !perms[3]) return false;

    return true;
  });


  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans relative">
      {/* Backdrop overlay on Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex justify-between items-center border-b border-slate-100">
          <img src="/logo.png" alt="PIL Chuquisaca S.A." className="h-12 object-contain" />
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 border border-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-[#3776BC]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon size={18} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Top Header Bar */}
      <header className="h-24 border-b border-slate-200 bg-white flex items-center justify-between px-4 lg:px-6 z-30 shrink-0">
        <div className="flex items-center gap-4 lg:gap-8 h-full">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden border border-slate-200 cursor-pointer"
          >
            <Menu size={24} />
          </button>
          
          <img src="/logo.png" alt="PIL Chuquisaca" className="h-20 object-contain hidden sm:block py-2" />

          {/* Desktop Horizontal Nav */}
          <nav className="hidden lg:flex items-center h-full gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 h-full border-b-2 transition-colors text-sm font-bold ${
                      isActive
                        ? 'border-[#3776BC] text-[#3776BC] bg-indigo-50/50'
                        : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon size={16} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative">
          {/* Branch Selector for Super Admin */}
          {loggedInUser?.role === 'super_admin' && (
            <div className="hidden sm:flex items-center gap-2 bg-indigo-50 px-2 sm:px-3 py-1.5 border border-indigo-100 rounded-lg">
              <span className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase hidden md:inline">Sucursal:</span>
              <select
                value={selectedBranchId || ''}
                onChange={(e) => setSelectedBranchId(e.target.value || null)}
                className="bg-transparent text-xs font-bold text-[#3776BC] focus:outline-none cursor-pointer border-none p-0 max-w-[100px] truncate"
              >
                <option value="" disabled>Global</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Local Branch Info */}
          {loggedInUser?.role !== 'super_admin' && activeBranch && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">
              📍 <span className="hidden md:inline">{activeBranch.name}</span>
            </div>
          )}

          {/* Sync & Time */}
          <div className="hidden xl:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-slate-600">Sincronizado</span>
          </div>
          
          <div className="hidden md:flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100">
            <Clock size={14} className="text-[#3776BC]" />
            <span className="text-xs font-bold text-[#3776BC]">
              {currentTime.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Quick Actions & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 border-l border-slate-200 pl-2 sm:pl-4">
            <button 
              onClick={toggleDarkMode}
              className="p-1.5 sm:p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
              title="Modo Oscuro"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button 
              onClick={() => setShowAlerts(!showAlerts)}
              className="p-1.5 sm:p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors relative border border-slate-200 cursor-pointer"
            >
              <Bell size={16} />
              {unreadAlerts.length > 0 && (
                <span className="absolute right-0 top-0 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-white">
                  {unreadAlerts.length}
                </span>
              )}
            </button>

            {/* Profile Toggle */}
            <div 
              className="flex items-center gap-2 p-1 pl-2 sm:pr-2 rounded-full hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
              onClick={() => setShowProfile(!showProfile)}
            >
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-slate-800 leading-none mb-0.5">{loggedInUser?.name?.split(' ')[0]}</p>
                <p className="text-[10px] text-slate-500 leading-none">{loggedInUser?.role === 'super_admin' ? 'Super Admin' : loggedInUser?.role}</p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${loggedInUser?.color || 'bg-slate-200 text-slate-600'}`}>
                {loggedInUser?.initials || <UserCircle size={16} />}
              </div>
            </div>
          </div>

          {/* Alerts Dropdown */}
          {showAlerts && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAlerts(false)}></div>
              <div className="absolute right-2 sm:right-4 top-14 w-[300px] sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-slate-100 bg-slate-50">
                  <h4 className="font-bold text-slate-800 text-sm">Notificaciones</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {alerts.length === 0 ? (
                    <p className="p-4 text-center text-sm text-slate-500">No hay notificaciones recientes.</p>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {alerts.map(alert => (
                        <div 
                          key={alert.id} 
                          className={`p-3 text-sm cursor-pointer hover:bg-slate-50 transition-colors ${!alert.read ? 'bg-indigo-50/30' : ''}`}
                          onClick={() => markAlertRead(alert.id)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-xs font-bold ${alert.type === 'Bajo Stock' ? 'text-amber-600' : 'text-rose-600'}`}>
                              {alert.type}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(alert.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <p className={`text-xs leading-relaxed ${!alert.read ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
                            {alert.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Profile Dropdown */}
          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)}></div>
              <div className="absolute right-2 top-14 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${loggedInUser?.color || 'bg-slate-200 text-slate-600'}`}>
                    {loggedInUser?.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{loggedInUser?.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{loggedInUser?.email}</p>
                  </div>
                </div>
                <div className="p-2">
                  <div className="px-2 py-1 mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Detalles de Sesión</p>
                    <p className="text-xs text-slate-600 mb-0.5">Rol: <span className="font-semibold text-slate-800">{loggedInUser?.role}</span></p>
                    <p className="text-xs text-slate-600">Sucursal: <span className="font-semibold text-slate-800 truncate">{activeBranch ? activeBranch.name : 'Global/Ninguna'}</span></p>
                  </div>
                  <button 
                    className="w-full flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    onClick={() => logoutUser()}
                  >
                    <LogOut size={14} /> Cerrar Sesión Segura
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 overflow-auto bg-slate-50 custom-scrollbar p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};
