// ============================================
// LOGIN COMPONENT - MODO DÍA
// ============================================

import { useState } from 'react';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock, User, Building2, FileText, Eye, EyeOff, Sparkles } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

const Login: React.FC<LoginProps> = ({ onLogin: _onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyRfc, setCompanyRfc] = useState('');

  const addDebug = (msg: string) => {
    console.log('[LOGIN]', msg);
    setDebugInfo(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Limpiar localStorage de Supabase
  const clearSupabaseStorage = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return keysToRemove.length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setDebugInfo([]);

    try {
      if (mode === 'login') {
        addDebug('Iniciando login...');
        addDebug(`Email: ${email}`);
        
        // 1. Limpiar localStorage primero
        const cleared = clearSupabaseStorage();
        addDebug(`Limpiado localStorage: ${cleared} keys`);
        
        // 2. Intentar signOut silencioso (sin esperar mucho)
        addDebug('SignOut previo...');
        try {
          const signOutPromise = supabase.auth.signOut({ scope: 'local' });
          await Promise.race([
            signOutPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000))
          ]);
          addDebug('SignOut OK');
        } catch (e: any) {
          addDebug(`SignOut skip: ${e.message}`);
        }
        
        // 3. Pausa breve
        await new Promise(r => setTimeout(r, 200));
        
        // 4. Login DIRECTO con Supabase (con timeout de 10s)
        addDebug('Llamando signInWithPassword...');
        
        const loginPromise = supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password
        });
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('LOGIN_TIMEOUT')), 10000);
        });
        
        const { data, error: authError } = await Promise.race([loginPromise, timeoutPromise]);
        
        if (authError) {
          addDebug(`Auth error: ${authError.message}`);
          throw authError;
        }
        
        if (!data?.user) {
          addDebug('No user returned');
          throw new Error('No se pudo autenticar');
        }
        
        addDebug(`Auth OK: ${data.user.id.substring(0, 8)}...`);
        addDebug(`Session: ${data.session ? 'existe' : 'no existe'}`);
        
        // Login exitoso - mostrar cargando y recargar
        addDebug('✅ Login exitoso, recargando...');
        setLoading(true);
        setError('');
        
        // Usar setTimeout para asegurar que el UI se actualice primero
        setTimeout(() => {
          // Forzar navegación completa (más confiable que reload)
          window.location.href = window.location.origin + window.location.pathname;
        }, 500);
        
        return; // Salir del try, no continuar
        
      } else if (mode === 'register') {
        addDebug('Iniciando registro...');
        await authService.signUp(email, password, fullName, companyName, companyRfc);
        setSuccess('¡Cuenta creada! Ya puedes iniciar sesión.');
        setMode('login');
      } else if (mode === 'forgot') {
        await authService.resetPassword(email);
        setSuccess('Te enviamos un correo para restablecer tu contraseña.');
        setMode('login');
      }
    } catch (err: any) {
      console.error('[LOGIN] Error:', err);
      addDebug(`ERROR: ${err.message}`);
      
      let errorMsg = err.message || 'Error de autenticación';
      
      if (errorMsg.includes('Invalid login') || errorMsg.includes('invalid_credentials')) {
        errorMsg = 'Correo o contraseña incorrectos';
      } else if (errorMsg.includes('Email not confirmed')) {
        errorMsg = 'Confirma tu correo antes de iniciar sesión';
      } else if (errorMsg.includes('LOGIN_TIMEOUT')) {
        errorMsg = 'El servidor no responde. Intenta de nuevo en unos segundos.';
        // Limpiar por si quedó algo colgado
        clearSupabaseStorage();
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        errorMsg = 'Error de conexión. Verifica tu internet.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Si login exitoso y esperando reload, mostrar pantalla de carga
  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 via-emerald-500 to-green-500 rounded-3xl shadow-2xl shadow-teal-500/30 mb-6 animate-pulse">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Bienvenido!</h2>
          <p className="text-slate-500 mb-4">Cargando tu dashboard...</p>
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-teal-400/20 to-emerald-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] bg-gradient-to-br from-amber-200/10 to-orange-200/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      
      {/* Floating elements */}
      <div className="absolute top-20 right-20 w-4 h-4 bg-teal-400 rounded-full animate-bounce opacity-60" />
      <div className="absolute bottom-32 left-20 w-6 h-6 bg-blue-400 rounded-full animate-pulse opacity-60" />
      <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-amber-400 rounded-full animate-ping opacity-40" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 via-emerald-500 to-green-500 rounded-3xl shadow-2xl shadow-teal-500/30 mb-4 relative">
            <FileText className="w-10 h-10 text-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="w-3 h-3 text-amber-800" />
            </div>
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 bg-clip-text text-transparent tracking-tight">
            Portal Logan
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            Registro de Facturas 🇲🇽
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-8 shadow-2xl shadow-slate-200/50">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-800 shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-800 shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 text-sm font-medium">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all"
                  />
                </div>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nombre de tu empresa"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all"
                  />
                </div>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="RFC de la empresa"
                    value={companyRfc}
                    onChange={(e) => setCompanyRfc(e.target.value.toUpperCase())}
                    required
                    maxLength={13}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all uppercase"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="correo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            )}

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 text-white rounded-2xl font-bold text-sm uppercase tracking-wider hover:shadow-lg hover:shadow-teal-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  {mode === 'login' && '🚀 Entrar'}
                  {mode === 'register' && '✨ Crear Cuenta'}
                  {mode === 'forgot' && '📧 Enviar Instrucciones'}
                </>
              )}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                Volver al inicio de sesión
              </button>
            )}
          </form>
        </div>

        {/* Debug Info */}
        {debugInfo.length > 0 && (
          <div className="mt-4 bg-slate-800 rounded-xl p-4 text-left max-h-32 overflow-auto">
            <p className="text-xs text-slate-400 mb-2 font-bold">📋 Debug:</p>
            {debugInfo.map((log, idx) => (
              <p key={idx} className={`text-xs font-mono ${log.includes('ERROR') ? 'text-red-400' : 'text-green-400'}`}>
                {log}
              </p>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-6">
          Portal Logan © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;
