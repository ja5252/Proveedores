// ============================================
// ADMIN PANEL - GESTIÓN DE USUARIOS
// ============================================

import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';
import { 
  Users, UserPlus, Trash2, Edit2, Mail, 
  X, AlertTriangle, Crown, Eye, Pencil
} from 'lucide-react';

interface Props {
  currentUser: User;
  companyId: string;
}

const AdminPanel: React.FC<Props> = ({ currentUser, companyId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, [companyId]);

  const loadUsers = async () => {
    console.log('[AdminPanel] Cargando usuarios para company:', companyId);
    setLoading(true);
    
    try {
      // Intentar cargar usuarios de la tabla users
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[AdminPanel] Error cargando users:', error);
        // Si hay error, intentar sin filtro de company
      }
      
      console.log('[AdminPanel] Usuarios encontrados:', data?.length || 0);
      
      if (data && data.length > 0) {
        // Si hay companyId, filtrar; si no, mostrar todos
        const filtered = companyId 
          ? data.filter(u => u.company_id === companyId)
          : data;
        console.log('[AdminPanel] Usuarios filtrados:', filtered.length);
        setUsers(filtered.length > 0 ? filtered : data);
      } else {
        // Si no hay usuarios en la tabla, crear entrada para el usuario actual
        console.log('[AdminPanel] No hay usuarios, agregando usuario actual');
        setUsers([currentUser]);
      }
    } catch (error) {
      console.error('[AdminPanel] Error:', error);
      // Como fallback, mostrar al menos el usuario actual
      setUsers([currentUser]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authService.inviteUser(inviteEmail, inviteRole, companyId);
      alert(`Invitación enviada a ${inviteEmail}`);
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteRole('viewer');
    } catch (error: any) {
      console.error('Error inviting user:', error);
      alert(error.message || 'Error al enviar invitación');
    }
  };

  const handleUpdateRole = async (user: User, newRole: UserRole) => {
    if (user.id === currentUser.id) {
      alert('No puedes cambiar tu propio rol');
      return;
    }
    
    try {
      await authService.updateUserRole(user.id, newRole);
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error al actualizar el rol');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser.id) {
      alert('No puedes eliminarte a ti mismo');
      return;
    }
    
    if (!confirm(`¿Eliminar al usuario ${user.email}? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      await authService.deleteUser(user.id);
      setUsers(users.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar usuario');
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4" />;
      case 'editor': return <Pencil className="w-4 h-4" />;
      case 'viewer': return <Eye className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'editor': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'viewer': return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Acceso total: crear, editar, eliminar y administrar usuarios';
      case 'editor': return 'Puede crear y editar facturas, remisiones y proveedores';
      case 'viewer': return 'Solo puede ver información, sin permisos de edición';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Gestión de Usuarios</h2>
          <p className="text-slate-500">Administra el acceso a tu empresa</p>
        </div>
        
        <button
          onClick={() => setShowInviteForm(true)}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlus className="w-5 h-5" />
          Invitar Usuario
        </button>
      </div>

      {/* Role Explanation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['admin', 'editor', 'viewer'] as UserRole[]).map(role => (
          <div key={role} className={`p-4 rounded-2xl border ${getRoleColor(role)}`}>
            <div className="flex items-center gap-2 mb-2">
              {getRoleIcon(role)}
              <span className="font-bold uppercase text-sm">{role}</span>
            </div>
            <p className="text-xs opacity-80">{getRoleDescription(role)}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">Usuarios de la Empresa</h3>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-xs font-bold">
              {users.length}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              Cargando usuarios...
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay usuarios registrados</p>
            </div>
          ) : (
            users.map(user => (
              <div key={user.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
                      {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 flex items-center gap-2">
                        {user.full_name || 'Sin nombre'}
                        {user.id === currentUser.id && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold uppercase">
                            Tú
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {editingUser?.id === user.id ? (
                      <div className="flex items-center gap-2">
                        {(['admin', 'editor', 'viewer'] as UserRole[]).map(role => (
                          <button
                            key={role}
                            onClick={() => handleUpdateRole(user, role)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                              user.role === role
                                ? getRoleColor(role)
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                        <button
                          onClick={() => setEditingUser(null)}
                          className="p-2 hover:bg-slate-100 rounded-lg"
                        >
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border flex items-center gap-1.5 ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          {user.role}
                        </span>
                        
                        {user.id !== currentUser.id && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Cambiar rol"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-amber-800 mb-2">Recomendaciones de Seguridad</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Asigna el rol de <strong>Admin</strong> solo a personal de confianza</li>
              <li>• Revisa periódicamente los usuarios con acceso</li>
              <li>• Elimina usuarios que ya no necesiten acceso</li>
              <li>• Los <strong>Viewers</strong> son ideales para contadores externos</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Invitar Usuario</h2>
              <button
                onClick={() => setShowInviteForm(false)}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Rol
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'editor', 'viewer'] as UserRole[]).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setInviteRole(role)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        inviteRole === role
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {getRoleIcon(role)}
                        <span className="text-xs font-bold uppercase">{role}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">
                  {getRoleDescription(inviteRole)}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  <Mail className="w-5 h-5" />
                  Enviar Invitación
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
