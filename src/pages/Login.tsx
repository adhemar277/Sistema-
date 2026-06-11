import React, { useState } from 'react';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export const Login: React.FC = () => {
  const { loginUser } = useAppData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(async () => {
      const success = await loginUser(email, password);
      if (success) {
        // Logged in correctly
      } else {
        setError('Credenciales inválidas o usuario inactivo.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[100px] opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[100px] opacity-50"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Logo PIL" className="h-28 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300" />
        </div>
        <h2 className="mt-2 text-center text-3xl font-black text-slate-800 tracking-tight">
          SISTEMA DE GESTIÓN PIL CHUQUISACA S.A.
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          Control Operativo Chuquisaca
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-xl py-8 px-4 shadow-2xl border border-slate-100 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm font-semibold flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Correo Electrónico Institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3776BC] focus:border-transparent transition-all font-medium sm:text-sm"
                  placeholder="ej. cquispe@pil.com.bo"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3776BC] focus:border-transparent transition-all font-medium sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#3776BC] focus:ring-[#3776BC] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 font-medium">
                  Recordarme
                </label>
              </div>

              <div className="text-sm">
                <button type="button" onClick={() => setShowForgotModal(true)} className="font-bold text-[#3776BC] hover:text-indigo-800">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#3776BC] hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3776BC] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Ingresar al Sistema
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-[11px] text-slate-400">
              © {new Date().getFullYear()} PIL Chuquisaca S.A. — Todos los derechos reservados.
            </p>
            <p className="text-[10px] text-slate-300 mt-0.5">v2.4.0 · Sistema de Gestión PIL Chuquisaca S.A.</p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center border-b border-slate-100 bg-slate-50">
              <div className="w-16 h-16 mx-auto bg-indigo-100 text-[#3776BC] rounded-full flex items-center justify-center mb-4">
                <Lock size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">Recuperar Contraseña</h3>
              <p className="text-sm text-slate-500">Ingresa tu correo para recibir un enlace de recuperación.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider text-left">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3776BC] focus:border-transparent transition-all font-medium sm:text-sm"
                  placeholder="ej. usuario@pil.com.bo"
                  id="recoveryEmail"
                />
              </div>
              <button 
                onClick={async () => {
                  const emailInput = document.getElementById('recoveryEmail') as HTMLInputElement;
                  if(emailInput && emailInput.value) {
                    // Simulación visual
                    alert('Solicitud recibida. Si el correo existe en nuestra base de datos, te enviaremos las instrucciones. (Simulación)');
                    setShowForgotModal(false);
                  } else {
                    alert('Por favor ingresa un correo electrónico.');
                  }
                }}
                className="w-full py-2.5 bg-[#3776BC] hover:bg-blue-800 text-white font-bold rounded-xl transition-colors text-sm shadow-sm"
              >
                Enviar Correo de Recuperación
              </button>
              <button 
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
