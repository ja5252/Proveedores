// ============================================
// AUTH SERVICE - AUTENTICACIÓN DE USUARIOS
// ============================================

import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types';

export const authService = {
  // Registro de nuevo usuario
  async signUp(email: string, password: string, fullName: string, companyName: string, companyRfc: string) {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No se pudo crear el usuario');

    // 2. Crear la empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName, rfc: companyRfc })
      .select()
      .single();

    if (companyError) throw companyError;

    // 3. Crear perfil de usuario con rol admin
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'admin' as UserRole,
        company_id: company.id
      });

    if (profileError) throw profileError;

    return { user: authData.user, company };
  },

  // Inicio de sesión
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  // Cerrar sesión - IMPORTANTE: scope global para cerrar todas las sesiones
  async signOut() {
    try {
      // Cerrar sesión en Supabase con scope global (cierra todas las sesiones del usuario)
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      // Limpiar cualquier dato en localStorage relacionado con Supabase
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Forzar limpieza de localStorage incluso si hay error
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      throw error;
    }
  },

  // Obtener sesión actual
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Obtener perfil del usuario (con timeout y auto-creación)
  async getUserProfile(userId: string): Promise<User | null> {
    // Crear promesa con timeout de 5 segundos
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout al obtener perfil')), 5000);
    });

    const fetchProfile = async (): Promise<User | null> => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          
          // Si el error es que no existe el registro, intentar crearlo
          if (error.code === 'PGRST116') {
            console.log('Perfil no encontrado, creando automáticamente...');
            return await this.createDefaultProfile(userId);
          }
          
          return null;
        }

        return data as User;
      } catch (err) {
        console.error('Exception in getUserProfile:', err);
        return null;
      }
    };

    try {
      return await Promise.race([fetchProfile(), timeoutPromise]);
    } catch (error) {
      console.error('getUserProfile failed:', error);
      // Si hay timeout, intentar crear perfil por defecto
      return await this.createDefaultProfile(userId);
    }
  },

  // Crear perfil por defecto para usuario existente en Auth
  async createDefaultProfile(userId: string): Promise<User | null> {
    try {
      // Obtener datos del usuario de Auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) return null;

      // Buscar o crear empresa por defecto
      let companyId: string;
      
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();
      
      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        // Crear empresa por defecto
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({ 
            name: 'Logan & Mason',
            rfc: 'LAM111118JNA'
          })
          .select()
          .single();
        
        if (companyError || !newCompany) {
          console.error('Error creating default company:', companyError);
          return null;
        }
        companyId = newCompany.id;
      }

      // Crear perfil de usuario
      const newProfile = {
        id: userId,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
        role: 'admin' as UserRole,
        company_id: companyId
      };

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .insert(newProfile)
        .select()
        .single();

      if (profileError) {
        console.error('Error creating default profile:', profileError);
        return null;
      }

      console.log('Perfil creado automáticamente:', profile);
      return profile as User;
    } catch (error) {
      console.error('Error in createDefaultProfile:', error);
      return null;
    }
  },

  // Obtener empresa del usuario
  async getUserCompany(companyId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (error) throw error;
    return data;
  },

  // Recuperar contraseña
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
  },

  // Actualizar contraseña
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  },

  // Invitar usuario a la empresa
  async inviteUser(email: string, role: UserRole, companyId: string) {
    // Invitar vía Supabase Auth
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        role,
        company_id: companyId
      }
    });

    if (error) throw error;
    return data;
  },

  // Obtener usuarios de la empresa
  async getCompanyUsers(companyId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as User[];
  },

  // Actualizar rol de usuario
  async updateUserRole(userId: string, role: UserRole) {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
  },

  // Eliminar usuario
  async deleteUser(userId: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  },

  // Escuchar cambios de autenticación
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};
