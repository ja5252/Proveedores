// ============================================
// SIDEBAR COMPONENT - MODO DÍA
// ============================================

import { User } from '../types';
import { 
  FileText, Package, Users, MessageCircle, 
  Shield, LogOut, ChevronRight, Sparkles 
} from 'lucide-react';

type TabType = 'invoices' | 'remissions' | 'suppliers' | 'chat' | 'admin';

interface Props {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  user: User;
  onLogout: () => void;
}

const Sidebar: React.FC<Props> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const menuItems = [
    { id: 'invoices' as TabType, label: 'Facturas', icon: FileText, description: 'Gestión CFDI', color: 'teal' },
    { id: 'remissions' as TabType, label: 'Remisiones', icon: Package, description: 'Notas de venta', color: 'blue' },
    { id: 'suppliers' as TabType, label: 'Proveedores', icon: Users, description: 'Catálogo', color: 'violet' },
    { id: 'chat' as TabType, label: 'Asistente IA', icon: MessageCircle, description: 'Consultas', badge: 'AI', color: 'amber' },
  ];

  const adminItem = { id: 'admin' as TabType, label: 'Seguridad', icon: Shield, description: 'Usuarios', color: 'rose' };

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen shadow-xl shadow-slate-100">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 via-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200 relative">
            <FileText className="w-6 h-6 text-white" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
              <Sparkles className="w-2 h-2 text-amber-800" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent tracking-tight">
              Portal Logan
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Registro Facturas</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 mx-4 mt-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-teal-200">
            {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">
              {user.full_name || 'Usuario'}
            </p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
            user.role === 'admin' 
              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
              : user.role === 'editor'
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {user.role === 'admin' && '👑'} {user.role}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Módulos
        </p>
        
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${
              activeTab === item.id
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className={`p-2 rounded-xl ${
              activeTab === item.id 
                ? 'bg-white/20' 
                : 'bg-slate-100 group-hover:bg-slate-200'
            }`}>
              <item.icon className={`w-5 h-5 ${
                activeTab === item.id ? 'text-white' : 'text-slate-500'
              }`} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold">{item.label}</p>
              <p className={`text-[10px] ${
                activeTab === item.id ? 'text-teal-100' : 'text-slate-400'
              }`}>
                {item.description}
              </p>
            </div>
            {item.badge && (
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                activeTab === item.id
                  ? 'bg-white/20 text-white'
                  : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200'
              }`}>
                <Sparkles className="w-3 h-3" />
                {item.badge}
              </span>
            )}
            <ChevronRight className={`w-4 h-4 transition-all ${
              activeTab === item.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'
            }`} />
          </button>
        ))}

        {/* Admin Section */}
        {user.role === 'admin' && (
          <>
            <div className="pt-4 mt-4 border-t border-slate-200">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Administración
              </p>
              <button
                onClick={() => setActiveTab(adminItem.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${
                  activeTab === adminItem.id
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2 rounded-xl ${
                  activeTab === adminItem.id 
                    ? 'bg-white/20' 
                    : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  <adminItem.icon className={`w-5 h-5 ${
                    activeTab === adminItem.id ? 'text-white' : 'text-slate-500'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold">{adminItem.label}</p>
                  <p className={`text-[10px] ${
                    activeTab === adminItem.id ? 'text-teal-100' : 'text-slate-400'
                  }`}>
                    {adminItem.description}
                  </p>
                </div>
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all group"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-bold">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
