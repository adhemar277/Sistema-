import React, { useState } from 'react';
import { ShieldAlert, Search } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export const Audit: React.FC = () => {
  const { auditLogs } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = (auditLogs || []).filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 lg:p-8 animate-in fade-in zoom-in duration-300">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="text-rose-600" />
            Registro de Auditoría (Logs)
          </h1>
          <p className="text-slate-500 text-sm mt-1">Historial de seguridad de todas las operaciones críticas del sistema.</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por usuario, acción o detalle..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500 font-black border-b border-slate-100">
                <th className="p-4 pl-6 w-48">Fecha y Hora</th>
                <th className="p-4 w-48">Usuario</th>
                <th className="p-4 w-48">Acción</th>
                <th className="p-4">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 pl-6 text-xs text-slate-600 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('es-BO')}
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-bold text-slate-700">{log.user_email}</span>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${
                      log.action.includes('Eliminar') || log.action.includes('DELETE') ? 'bg-rose-100 text-rose-700' :
                      log.action.includes('Venta') || log.action.includes('Caja') ? 'bg-emerald-100 text-emerald-700' :
                      log.action.includes('Editar') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-600">
                    {log.details}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
