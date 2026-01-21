// ============================================
// USER MANAGEMENT - ADMINISTRACIÓN DE USUARIOS
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Search, Edit2, Trash2, Building2,
  X, Check, Loader2, Mail, Calendar, RefreshCw,
  AlertTriangle, ChevronDown
} from 'lucide-react';

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: string | null;
  created_at: string;
  company?: {
    id: string;
    name: string;
    rfc: string;
  } | null;
}

interface Company {
  id: string;
  name: string;
  rfc: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

const UserManagement: React.FC<Props> = ({ isOpen, onClose, currentUserId }) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    role: 'editor',
    company_id: ''
  });

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load data
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users with their companies
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          role,
          company_id,
          created_at,
          companies (
            id,
            name,
            rfc
          )
        `)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Transform data to flatten company
      const transformedUsers = (usersData || []).map(user => ({
        ...user,
        company: Array.isArray(user.companies) ? user.companies[0] : user.companies
      }));

      setUsers(transformedUsers);

      // Load all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, rfc')
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      alert('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.company?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Open edit modal
  const handleEdit = (user: UserRecord) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'editor',
      company_id: user.company_id || ''
    });
    setShowEditModal(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: editForm.full_name,
          role: editForm.role,
          company_id: editForm.company_id || null
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { 
              ...u, 
              full_name: editForm.full_name,
              role: editForm.role,
              company_id: editForm.company_id || null,
              company: companies.find(c => c.id === editForm.company_id) || null
            }
          : u
      ));

      setShowEditModal(false);
      setEditingUser(null);
      alert('✅ Usuario actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert('Error al actualizar: ' + error.message);
    }
  };

  // Confirm delete
  const handleDeleteClick = (user: UserRecord) => {
    if (user.id === currentUserId) {
      alert('No puedes eliminar tu propio usuario');
      return;
    }
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  // Execute delete
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      // Delete from users table
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      alert('✅ Usuario eliminado correctamente');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">Admin</span>;
      case 'editor':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">Editor</span>;
      case 'viewer':
        return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">Viewer</span>;
      default:
        return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{role}</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-500 to-indigo-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Administración de Usuarios</h2>
                <p className="text-purple-100 text-sm">
                  {users.length} usuarios registrados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
                title="Recargar"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o compañía..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No se encontraron usuarios</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Compañía</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Rol</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Registro</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.id === currentUserId ? 'bg-purple-50' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                          {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {user.full_name || 'Sin nombre'}
                            {user.id === currentUserId && (
                              <span className="ml-2 text-xs text-purple-600">(Tú)</span>
                            )}
                          </p>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {user.company ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-800">{user.company.name}</p>
                            <p className="text-xs text-slate-400">{user.company.rfc}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          Sin compañía
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-slate-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.created_at).toLocaleDateString('es-MX')}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user)}
                          disabled={user.id === currentUserId}
                          className={`p-2 rounded-lg transition-all ${
                            user.id === currentUserId 
                              ? 'text-slate-200 cursor-not-allowed' 
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title={user.id === currentUserId ? 'No puedes eliminarte' : 'Eliminar'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Stats Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                Admins: {users.filter(u => u.role === 'admin').length}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                Editores: {users.filter(u => u.role === 'editor').length}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                Viewers: {users.filter(u => u.role === 'viewer').length}
              </span>
            </div>
            <span>
              {companies.length} compañías registradas
            </span>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Editar Usuario</h3>
              <p className="text-sm text-slate-500">{editingUser.email}</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Rol
                </label>
                <div className="relative">
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all appearance-none"
                  >
                    <option value="admin">Admin - Acceso total</option>
                    <option value="editor">Editor - Crear y editar</option>
                    <option value="viewer">Viewer - Solo lectura</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Compañía */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Compañía Asignada
                </label>
                <div className="relative">
                  <select
                    value={editForm.company_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, company_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all appearance-none"
                  >
                    <option value="">-- Sin compañía --</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name} ({company.rfc})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-all"
              >
                <Check className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-rose-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">¿Eliminar usuario?</h3>
              <p className="text-slate-500 mb-1">{userToDelete.full_name}</p>
              <p className="text-sm text-slate-400">{userToDelete.email}</p>
              
              <p className="mt-4 text-sm text-rose-600 bg-rose-50 p-3 rounded-xl">
                Esta acción no se puede deshacer. El usuario perderá acceso al sistema.
              </p>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
