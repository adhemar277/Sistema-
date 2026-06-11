import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';
import { Suppliers } from './pages/Suppliers';
import { Sales } from './pages/Sales';
import { Login } from './pages/Login';
import { Payrolls } from './pages/Payrolls';
import { Audit } from './pages/Audit';
import { AppDataProvider, useAppData } from './context/AppDataContext';

const AppContent = () => {
  const { loggedInUser, selectedBranchId, setSelectedBranchId, branches, logoutUser } = useAppData();

  if (!loggedInUser) {
    return <Login />;
  }

  // Si es super_admin y no ha seleccionado sucursal, mostrar pantalla intermedia
  if (loggedInUser.role === 'super_admin' && !selectedBranchId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Elementos decorativos */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[100px] opacity-50"></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10 text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#3776BC] to-indigo-600 shadow-xl flex items-center justify-center text-white font-black text-2xl tracking-tighter mb-4">
            PIL
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            SISTEMA DE GESTIÓN MULTI-SUCURSAL
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Ingreso de Super Administrador. Selecciona la sucursal que deseas gestionar.
          </p>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
          <div className="bg-white/80 backdrop-blur-xl py-8 px-6 shadow-2xl border border-slate-100 sm:rounded-2xl sm:px-10">
            <h3 className="text-xs font-bold text-slate-400 mb-5 uppercase tracking-wider text-center">
              Sucursales Disponibles
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {branches.map(branch => (
                <button
                  key={branch.id}
                  onClick={() => setSelectedBranchId(branch.id)}
                  className="p-5 text-left border border-slate-200 rounded-xl bg-white hover:border-[#3776BC] hover:shadow-lg transition-all duration-200 group flex flex-col justify-between h-32 cursor-pointer"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 group-hover:text-[#3776BC] transition-colors leading-tight">
                      {branch.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                      {branch.address || 'Sin dirección registrada'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#3776BC] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Ingresar a Tienda <span>→</span>
                  </span>
                </button>
              ))}
            </div>

            {branches.length === 0 && (
              <p className="text-center text-sm text-slate-500 py-4">No hay sucursales registradas en el sistema.</p>
            )}

            <div className="mt-8 border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">
                Sesión: {loggedInUser.name}
              </span>
              <button
                onClick={logoutUser}
                className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to={loggedInUser.role === 'Operario' ? '/inventory' : '/dashboard'} replace />} />
          
          {loggedInUser.role !== 'Operario' && (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/reports" element={<Reports />} />
            </>
          )}
          
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<Sales />} />
          
          {(loggedInUser.role === 'Admin' || loggedInUser.role === 'super_admin' || loggedInUser.role === 'Supervisor') && (
            <Route path="/suppliers" element={<Suppliers />} />
          )}
          
          {(loggedInUser.role === 'Admin' || loggedInUser.role === 'super_admin') && (
            <>
              <Route path="/users" element={<Users />} />
              <Route path="/payrolls" element={<Payrolls />} />
            </>
          )}

          {loggedInUser.role === 'super_admin' && (
            <Route path="/audit" element={<Audit />} />
          )}

          <Route path="*" element={<Navigate to={loggedInUser.role === 'Operario' ? '/inventory' : '/dashboard'} replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

function App() {
  return (
    <AppDataProvider>
      <AppContent />
    </AppDataProvider>
  );
}

export default App;
