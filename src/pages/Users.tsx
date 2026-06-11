import React, { useState } from "react";
import { Search, UserPlus, Shield, X, Trash2, Key, Users as UsersIcon, CheckCircle } from "lucide-react";
import { useAppData } from "../context/AppDataContext";

const PERMISSIONS: Record<string, { label: string; desc: string; roles: string[] }[]> = {
  super_admin: [
    { label: "Gestión de Pedidos", desc: "Crear y modificar órdenes", roles: ["Admin", "super_admin"] },
    { label: "Visualizar Inventario", desc: "Acceso a stock en tiempo real", roles: ["Admin", "super_admin"] },
    { label: "Modificar Precios", desc: "Aplicar descuentos manuales", roles: ["Admin", "super_admin"] },
    { label: "Reportes Financieros", desc: "Exportar datos de ventas", roles: ["Admin", "super_admin"] },
  ],
  Admin: [
    { label: "Gestión de Pedidos", desc: "Crear y modificar órdenes", roles: ["Admin"] },
    { label: "Visualizar Inventario", desc: "Acceso a stock en tiempo real", roles: ["Admin"] },
    { label: "Modificar Precios", desc: "Aplicar descuentos manuales", roles: ["Admin"] },
    { label: "Reportes Financieros", desc: "Exportar datos de ventas", roles: ["Admin"] },
  ],
  Supervisor: [
    { label: "Gestión de Pedidos", desc: "Crear y modificar órdenes", roles: ["Admin", "Supervisor"] },
    { label: "Visualizar Inventario", desc: "Acceso a stock en tiempo real", roles: ["Admin", "Supervisor"] },
    { label: "Modificar Precios", desc: "Aplicar descuentos manuales", roles: [] },
    { label: "Reportes Financieros", desc: "Exportar datos de ventas", roles: [] },
  ],
  Operario: [
    { label: "Gestión de Pedidos", desc: "Crear y modificar órdenes", roles: [] },
    { label: "Visualizar Inventario", desc: "Acceso a stock en tiempo real", roles: ["Admin", "Supervisor", "Operario"] },
    { label: "Modificar Precios", desc: "Aplicar descuentos manuales", roles: [] },
    { label: "Reportes Financieros", desc: "Exportar datos de ventas", roles: [] },
  ],
};

const PAGE_SIZE = 8;

export const Users: React.FC = () => {
  const { users, reactivateUser, loggedInUser, updateUserPassword, addUser, deleteUser, branches, addBranch } = useAppData();
  const [showModal, setShowModal] = useState(false);
  const [editPassModal, setEditPassModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", role: "Operario", password: "", branch_id: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("Supervisor");
  const [page, setPage] = useState(1);
  const [savedMsg, setSavedMsg] = useState(false);

  // Sucursales locales
  const { updateBranch } = useAppData();
  const [newBranch, setNewBranch] = useState({ id: "", name: "", address: "" });
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [editBranchData, setEditBranchData] = useState({ name: "", address: "" });
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [inlineBranch, setInlineBranch] = useState({ id: "", name: "", address: "" });

  // Estado mutable de permisos por rol (copia editable)
  const [permState, setPermState] = useState<Record<string, boolean[]>>(() => {
    const saved = localStorage.getItem("system_role_permissions");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      super_admin:[true, true, true, true],
      Admin:      [true, true, true, true],
      Supervisor: [true, true, false, false],
      Operario:   [false, true, false, false],
    };
  });

  const togglePerm = (idx: number) => {
    setPermState(prev => ({
      ...prev,
      [selectedRole]: prev[selectedRole].map((v, i) => i === idx ? !v : v),
    }));
  };

  const handleSavePerms = () => {
    localStorage.setItem("system_role_permissions", JSON.stringify(permState));
    window.dispatchEvent(new Event("permissionsChanged"));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const handleAddUser = async () => {
    if (!formData.name) return;
    
    // Auto-asignar la sucursal del local Admin si no es super_admin
    const assignedBranchId = loggedInUser?.role === 'super_admin'
      ? (formData.branch_id || undefined)
      : loggedInUser?.branch_id;

    await addUser({ 
      name: formData.name, 
      email: formData.email || "usuario@pil.com.bo", 
      role: formData.role || "Operario", 
      password: formData.password || "123456",
      branch_id: assignedBranchId
    });
    
    setShowModal(false);
    setFormData({ name: "", email: "", role: "Operario", password: "", branch_id: "" });
  };

  const handleCreateBranch = async () => {
    if (!newBranch.id || !newBranch.name) {
      alert("Por favor ingrese el ID y el Nombre de la sucursal.");
      return;
    }
    const success = await addBranch(newBranch);
    if (success) {
      setNewBranch({ id: "", name: "", address: "" });
    }
  };

  const handleUpdateBranch = async (id: string) => {
    if (!editBranchData.name) {
      alert("El nombre de la sucursal no puede estar vacío.");
      return;
    }
    const success = await updateBranch(id, { name: editBranchData.name, address: editBranchData.address });
    if (success) {
      setEditingBranch(null);
    }
  };

  const handleCreateInlineBranch = async () => {
    if (!inlineBranch.id || !inlineBranch.name) {
      alert("Por favor ingrese el ID y el Nombre de la sucursal.");
      return;
    }
    const success = await addBranch(inlineBranch);
    if (success) {
      setFormData(prev => ({ ...prev, branch_id: inlineBranch.id }));
      setInlineBranch({ id: "", name: "", address: "" });
      setShowInlineForm(false);
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCount = users.filter(u => u.status === "Activo").length;
  const superAdminCount = users.filter(u => u.role === "super_admin").length;
  const adminCount = users.filter(u => u.role === "Admin").length;
  const supervisorCount = users.filter(u => u.role === "Supervisor").length;
  const operarioCount = users.filter(u => u.role === "Operario").length;

  const perms = PERMISSIONS[selectedRole] || PERMISSIONS["Supervisor"];

  const roleColor = (role: string) => {
    if (role === "super_admin") return "bg-[#3776BC] text-white";
    if (role === "Admin") return "bg-[#3776BC] text-white";
    if (role === "Supervisor") return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administración de Personal</h1>
          <p className="text-slate-500 text-sm mt-1">Gestione accesos, roles y permisos de sucursales del sistema ERP.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-[#3776BC] text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors shadow-sm cursor-pointer">
          <UserPlus size={16} /> Nuevo Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><UsersIcon size={20} className="text-[#3776BC]" /></div>
            <span className="text-xs font-bold text-slate-500 uppercase">Total</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{users.length}</p>
          <p className="text-xs text-slate-500 mt-1">Usuarios bajo tu jurisdicción</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center"><CheckCircle size={20} className="text-emerald-600" /></div>
            <span className="text-xs font-bold text-slate-500 uppercase">Activos</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{activeCount}</p>
          <p className="text-xs text-slate-500 mt-1">Operando actualmente</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Distribución por Rol</p>
          <div className="grid grid-cols-4 gap-2 text-center pt-1">
            {loggedInUser?.role === 'super_admin' && (
              <div><p className="text-[10px] text-slate-400 truncate">Super</p><p className="font-black text-slate-800 text-sm">{superAdminCount}</p></div>
            )}
            <div><p className="text-[10px] text-slate-400 truncate">Admin</p><p className="font-black text-slate-800 text-sm">{adminCount}</p></div>
            <div><p className="text-[10px] text-slate-400 truncate">Supervisor</p><p className="font-black text-slate-800 text-sm">{supervisorCount}</p></div>
            <div><p className="text-[10px] text-slate-400 truncate">Operario</p><p className="font-black text-slate-800 text-sm">{operarioCount}</p></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Directory Table */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[500px]">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center sm:justify-between bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-800">Directorio de Personal</h2>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Buscar usuarios..." className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="overflow-x-auto w-full"><table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-5 py-3">Usuario / Correo</th>
                  {loggedInUser?.role === 'super_admin' && <th className="px-5 py-3">Sucursal</th>}
                  <th className="px-5 py-3">Rol Asignado</th>
                  <th className="px-5 py-3">Contraseña</th>
                  <th className="px-5 py-3">Último Acceso</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((user, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${user.color}`}>{user.initials}</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </td>
                    {loggedInUser?.role === 'super_admin' && (
                      <td className="px-5 py-3 text-xs font-semibold text-slate-650">
                        {branches.find(b => b.id === user.branch_id)?.name || 'Global / Super Admin'}
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${roleColor(user.role)}`}>
                        {user.role === 'super_admin' ? 'Super Admin' : user.role === 'Admin' ? 'Administrador' : user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded select-all">{user.password || '••••••'}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{user.lastAccess}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 w-fit ${user.status === "Activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === "Activo" ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        {user.status === "Inactivo" && (loggedInUser?.role === "Admin" || loggedInUser?.role === "super_admin") && (
                          <button onClick={() => reactivateUser(user.email)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors text-xs font-bold cursor-pointer" title="Reactivar">✓</button>
                        )}
                        {(loggedInUser?.role === "Admin" || loggedInUser?.role === "super_admin") && (
                          <button onClick={() => { setEditPassModal(user.email); setNewPassword(""); }} className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors cursor-pointer" title="Cambiar Contraseña"><Key size={14} /></button>
                        )}
                        {(loggedInUser?.role === "Admin" || loggedInUser?.role === "super_admin") && loggedInUser.email !== user.email && (
                          <button onClick={() => { if(window.confirm(`¿Seguro que deseas eliminar al usuario ${user.name}?`)) deleteUser(user.email); }} className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition-colors cursor-pointer" title="Eliminar"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
          
          <div className="p-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}-{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} usuarios</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer">Anterior</button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded border text-xs font-bold ${page === p ? "bg-[#3776BC] text-white border-[#3776BC]" : "border-slate-200 hover:bg-slate-50 cursor-pointer"}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer">Siguiente</button>
            </div>
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0">
          {/* Permissions Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Shield size={16} className="text-[#3776BC]" /> Matriz de Permisos</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">Seleccione un rol para modificar sus privilegios de acceso al sistema ERP.</p>
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white mb-4 font-semibold text-slate-700">
              {loggedInUser?.role === 'super_admin' && <option value="super_admin">Super Administrador</option>}
              <option value="Admin">Administrador</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Operario">Operario</option>
            </select>
            
            <div className="space-y-3">
              {perms.map((perm, i) => {
                const enabled = permState[selectedRole]?.[i] ?? false;
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{perm.label}</p>
                      <p className="text-xs text-slate-500">{perm.desc}</p>
                    </div>
                    <button
                      onClick={() => togglePerm(i)}
                      className={`w-11 h-6 rounded-full relative transition-colors focus:outline-none cursor-pointer ${
                        enabled ? 'bg-[#3776BC]' : 'bg-slate-200'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
            
            {savedMsg && (
              <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 text-xs font-bold animate-in fade-in">
                <CheckCircle size={14} /> Permisos guardados exitosamente
              </div>
            )}
            
            <button
              onClick={handleSavePerms}
              className="w-full mt-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              Guardar Cambios
            </button>
          </div>

          {/* Branch management for Super Admin */}
          {loggedInUser?.role === 'super_admin' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                🏢 Gestión de Sucursales
              </h3>
              <p className="text-xs text-slate-500 mb-3">Registra y visualiza las tiendas de la red.</p>
              
              <div className="space-y-2 max-h-40 overflow-y-auto mb-4 border border-slate-100 p-2 rounded-lg bg-slate-50 custom-scrollbar">
                {branches.map(b => (
                  <div key={b.id} className="text-xs p-2 bg-white rounded border border-slate-150 shadow-sm flex flex-col justify-between group">
                    {editingBranch === b.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editBranchData.name}
                          onChange={e => setEditBranchData({ ...editBranchData, name: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#3776BC]"
                          placeholder="Nombre de Sucursal"
                        />
                        <input
                          type="text"
                          value={editBranchData.address}
                          onChange={e => setEditBranchData({ ...editBranchData, address: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#3776BC]"
                          placeholder="Dirección"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateBranch(b.id)} className="flex-1 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700">Guardar</button>
                          <button onClick={() => setEditingBranch(null)} className="flex-1 py-1 bg-slate-200 text-slate-700 rounded font-bold hover:bg-slate-300">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-indigo-905">{b.name}</p>
                          <button 
                            onClick={() => {
                              setEditingBranch(b.id);
                              setEditBranchData({ name: b.name, address: b.address || "" });
                            }}
                            className="text-slate-400 hover:text-[#3776BC] opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Editar Sucursal"
                          >
                            ✎
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{b.id}</p>
                        {b.address && <p className="text-[10px] text-slate-500 mt-1 truncate">{b.address}</p>}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="ID (ej. sucursal-d)"
                  value={newBranch.id}
                  onChange={e => setNewBranch({ ...newBranch, id: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#3776BC]"
                />
                <input
                  type="text"
                  placeholder="Nombre de Sucursal"
                  value={newBranch.name}
                  onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#3776BC]"
                />
                <input
                  type="text"
                  placeholder="Dirección (Opcional)"
                  value={newBranch.address}
                  onChange={e => setNewBranch({ ...newBranch, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#3776BC]"
                />
                <button
                  onClick={handleCreateBranch}
                  className="w-full py-2 bg-blue-800 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Crear Sucursal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[480px] overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
              <h2 className="text-lg font-bold text-[#3776BC] flex items-center gap-2"><UserPlus size={18} /> Nuevo Usuario</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nombre Completo</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Juan Pérez" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Correo Electrónico</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Ej. jperez@pil.com.bo" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
              </div>

              {/* Selector de sucursal para el Super Admin */}
              {loggedInUser?.role === 'super_admin' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Sucursal Asignada</label>
                    <button
                      type="button"
                      onClick={() => setShowInlineForm(!showInlineForm)}
                      className="text-xs text-indigo-650 hover:text-indigo-805 font-bold focus:outline-none cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      {showInlineForm ? "✕ Cancelar" : "➕ Crear Sucursal"}
                    </button>
                  </div>

                  {showInlineForm && (
                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-2 animate-in fade-in slide-in-from-top-1">
                      <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1">🏢 Crear Nueva Sucursal</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="ID (ej. sucursal-d)"
                          value={inlineBranch.id}
                          onChange={e => setInlineBranch({ ...inlineBranch, id: e.target.value })}
                          className="w-full px-2 py-1 border border-indigo-200 rounded text-xs focus:outline-none focus:border-[#3776BC] bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Nombre"
                          value={inlineBranch.name}
                          onChange={e => setInlineBranch({ ...inlineBranch, name: e.target.value })}
                          className="w-full px-2 py-1 border border-indigo-200 rounded text-xs focus:outline-none focus:border-[#3776BC] bg-white"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Dirección (Opcional)"
                        value={inlineBranch.address}
                        onChange={e => setInlineBranch({ ...inlineBranch, address: e.target.value })}
                        className="w-full px-2 py-1 border border-indigo-200 rounded text-xs focus:outline-none focus:border-[#3776BC] bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleCreateInlineBranch}
                        className="w-full py-1.5 bg-[#3776BC] hover:bg-blue-800 text-white text-xs font-bold rounded shadow transition-colors cursor-pointer"
                      >
                        Crear e Importar
                      </button>
                    </div>
                  )}

                  {!showInlineForm && (
                    <select
                      value={formData.branch_id}
                      onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white cursor-pointer"
                    >
                      <option value="">Global / Super Admin (Sin sucursal)</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Rol</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC] bg-white cursor-pointer">
                    <option value="Operario">Operario</option>
                    <option value="Supervisor">Supervisor</option>
                    {loggedInUser?.role === 'super_admin' && (
                      <>
                        <option value="Admin">Administrador Local</option>
                        <option value="super_admin">Super Administrador</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Contraseña</label>
                  <input type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Ej. 123456" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#3776BC]" />
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancelar</button>
              <button onClick={handleAddUser} className="flex items-center gap-2 px-5 py-2 bg-[#3776BC] text-white rounded-lg text-sm font-semibold hover:bg-blue-800 shadow-sm cursor-pointer">
                <UserPlus size={15} /> Guardar Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {editPassModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[380px] overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-amber-50">
              <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2"><Key size={18} /> Cambiar Contraseña</h2>
              <button onClick={() => setEditPassModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nueva Contraseña</label>
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Ej. secreta123" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setEditPassModal(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancelar</button>
              <button onClick={() => { if (newPassword) { updateUserPassword(editPassModal, newPassword); setEditPassModal(null); } }} className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 shadow-sm cursor-pointer">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
