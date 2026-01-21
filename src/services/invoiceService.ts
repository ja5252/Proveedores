// ============================================
// INVOICE SERVICE - GESTIÓN DE FACTURAS
// ============================================

import { supabase } from '../lib/supabase';
import type { Invoice, DuplicateCheckResult, PaymentStatus } from '../types';

export const invoiceService = {
  // Obtener todas las facturas de la empresa
  async getInvoices(companyId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Invoice[];
  },

  // Obtener factura por ID
  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
    return data as Invoice;
  },

  // Crear nueva factura
  async createInvoice(invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single();

    if (error) throw error;
    return data as Invoice;
  },

  // Actualizar factura
  async updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data as Invoice;
  },

  // Eliminar factura
  async deleteInvoice(invoiceId: string, fileUrl?: string): Promise<void> {
    // Si tiene archivo, eliminarlo del storage
    if (fileUrl) {
      const filePath = fileUrl.split('/').pop();
      if (filePath) {
        await supabase.storage.from('invoices').remove([filePath]);
      }
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) throw error;
  },

  // Subir archivo de factura
  async uploadInvoiceFile(file: File, companyId: string): Promise<{ url: string; path: string }> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('invoices')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path
    };
  },

  // Descargar archivo de factura
  async downloadInvoiceFile(fileUrl: string, fileName: string): Promise<void> {
    // Extraer el path del archivo de la URL
    const urlParts = fileUrl.split('/storage/v1/object/public/invoices/');
    if (urlParts.length < 2) {
      throw new Error('URL de archivo inválida');
    }
    
    const filePath = urlParts[1];
    
    const { data, error } = await supabase.storage
      .from('invoices')
      .download(filePath);

    if (error) throw error;

    // Crear blob y descargar
    const blob = new Blob([data], { type: data.type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'factura';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Obtener URL firmada para descarga directa
  async getSignedUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('invoices')
      .createSignedUrl(filePath, 60 * 60); // 1 hora de validez

    if (error) throw error;
    return data.signedUrl;
  },

  // Verificar duplicados
  checkDuplicate(newInvoice: Partial<Invoice>, existingInvoices: Invoice[]): DuplicateCheckResult {
    const normalize = (str?: string) => (str || '').trim().toLowerCase();
    const normalizeAmount = (amount?: number) => Math.round((amount || 0) * 100) / 100;

    // 1. Verificación por UUID Fiscal
    if (newInvoice.uuid && newInvoice.uuid.length >= 32) {
      const normalizedNewUUID = normalize(newInvoice.uuid);
      const existingByUUID = existingInvoices.find(
        inv => normalize(inv.uuid) === normalizedNewUUID
      );
      
      if (existingByUUID) {
        return {
          is_duplicate: true,
          match_type: 'uuid',
          existing_invoice: existingByUUID,
          message: `⚠️ Factura duplicada: Ya existe una factura con UUID Fiscal "${newInvoice.uuid.slice(0, 8)}..." del proveedor "${existingByUUID.supplier_name}"`
        };
      }
    }

    // 2. Verificación por RFC + Folio + Serie
    if (newInvoice.rfc_emisor && newInvoice.folio) {
      const existingByFolioRFC = existingInvoices.find(inv => 
        normalize(inv.rfc_emisor) === normalize(newInvoice.rfc_emisor) &&
        normalize(inv.folio) === normalize(newInvoice.folio) &&
        normalize(inv.serie) === normalize(newInvoice.serie)
      );
      
      if (existingByFolioRFC) {
        return {
          is_duplicate: true,
          match_type: 'folio_rfc',
          existing_invoice: existingByFolioRFC,
          message: `⚠️ Factura duplicada: Ya existe la factura ${newInvoice.serie || ''}${newInvoice.folio} del RFC "${newInvoice.rfc_emisor}"`
        };
      }
    }

    // 3. Verificación por Proveedor + Total + Fecha
    if (newInvoice.supplier_name && newInvoice.total && newInvoice.date) {
      const normalizedSupplier = normalize(newInvoice.supplier_name);
      const normalizedTotal = normalizeAmount(newInvoice.total);
      const normalizedDate = normalize(newInvoice.date);
      
      const existingByCombo = existingInvoices.find(inv => {
        const invSupplier = normalize(inv.supplier_name);
        const invTotal = normalizeAmount(inv.total);
        const invDate = normalize(inv.date);
        
        const supplierMatch = invSupplier === normalizedSupplier || 
                             invSupplier.includes(normalizedSupplier) ||
                             normalizedSupplier.includes(invSupplier);
        
        return supplierMatch && invTotal === normalizedTotal && invDate === normalizedDate;
      });
      
      if (existingByCombo) {
        return {
          is_duplicate: true,
          match_type: 'proveedor_total_fecha',
          existing_invoice: existingByCombo,
          message: `⚠️ Posible duplicado: Ya existe una factura de "${existingByCombo.supplier_name}" con total $${existingByCombo.total.toFixed(2)} del ${existingByCombo.date}`
        };
      }
    }

    return { is_duplicate: false };
  },

  // Verificar múltiples facturas (importación masiva)
  checkBulkDuplicates(
    newInvoices: Partial<Invoice>[],
    existingInvoices: Invoice[]
  ): { valid: Partial<Invoice>[]; duplicates: { invoice: Partial<Invoice>; result: DuplicateCheckResult }[] } {
    const valid: Partial<Invoice>[] = [];
    const duplicates: { invoice: Partial<Invoice>; result: DuplicateCheckResult }[] = [];
    const processedInvoices: Partial<Invoice>[] = [];
    
    for (const invoice of newInvoices) {
      const resultExisting = this.checkDuplicate(invoice, existingInvoices);
      if (resultExisting.is_duplicate) {
        duplicates.push({ invoice, result: resultExisting });
        continue;
      }
      
      const resultBatch = this.checkDuplicate(invoice, processedInvoices as Invoice[]);
      if (resultBatch.is_duplicate) {
        duplicates.push({ 
          invoice, 
          result: {
            ...resultBatch,
            message: resultBatch.message?.replace('Ya existe', 'Duplicado en el mismo archivo:')
          }
        });
        continue;
      }
      
      valid.push(invoice);
      processedInvoices.push(invoice);
    }
    
    return { valid, duplicates };
  },

  // Cambiar estado de pago
  async togglePaymentStatus(invoiceId: string, currentStatus: PaymentStatus): Promise<Invoice> {
    const newStatus = currentStatus === 'Pagado' ? 'Pendiente' : 'Pagado';
    const paymentDate = newStatus === 'Pagado' ? new Date().toISOString().split('T')[0] : null;

    return this.updateInvoice(invoiceId, {
      status: newStatus as PaymentStatus,
      payment_date: paymentDate || undefined
    });
  },

  // Buscar facturas
  async searchInvoices(companyId: string, query: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', companyId)
      .or(`supplier_name.ilike.%${query}%,folio.ilike.%${query}%,uuid.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Invoice[];
  },

  // Estadísticas
  async getStatistics(companyId: string) {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('total, status')
      .eq('company_id', companyId);

    if (error) throw error;

    const total = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
    const paid = invoices
      .filter(i => i.status === 'Pagado')
      .reduce((acc, inv) => acc + (inv.total || 0), 0);
    const pending = total - paid;

    return { total, paid, pending, count: invoices.length };
  }
};
