// ============================================
// SUPABASE CLIENT - CONEXIÓN A BASE DE DATOS
// ============================================

import { createClient } from '@supabase/supabase-js';

// Credenciales de Supabase (hardcoded para producción)
const supabaseUrl = 'https://mylytzibwrjdpjrowsyj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bHl0emlid3JqZHBqcm93c3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDA1NjksImV4cCI6MjA4NDU3NjU2OX0.bd8mR7sOaGd2e1nMEDdjo9BmRa_XJbq2SDmaSivXhV8';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Tipos de Supabase para TypeScript
export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          rfc: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'editor' | 'viewer';
          company_id: string;
          avatar_url?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      suppliers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          rfc?: string;
          insumo: string;
          bank_name?: string;
          bank_account?: string;
          clabe?: string;
          contact_email?: string;
          contact_phone?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>;
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          uuid?: string;
          rfc_emisor?: string;
          folio?: string;
          serie?: string;
          date: string;
          supplier_id?: string;
          supplier_name: string;
          insumo: string;
          amount_net: number;
          iva: number;
          total: number;
          payment_term: string;
          payment_method: string;
          cfdi_use: string;
          delivery_confirmed: boolean;
          status: string;
          payment_date?: string;
          is_fiscal_valid: boolean;
          file_url?: string;
          file_name?: string;
          file_type?: string;
          ai_extracted_data?: object;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      remissions: {
        Row: {
          id: string;
          company_id: string;
          date: string;
          supplier_id?: string;
          supplier_name: string;
          commodity_type: string;
          amount: number;
          status: string;
          payment_date?: string;
          reception_confirmed: boolean;
          file_url?: string;
          file_name?: string;
          ai_extracted_data?: object;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['remissions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['remissions']['Insert']>;
      };
    };
  };
};
