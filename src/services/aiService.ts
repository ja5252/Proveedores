// ============================================
// AI SERVICE - CLAUDE API PARA OCR Y CHATBOT
// ============================================

import type { ExtractedInvoiceData, Invoice, Remission, Supplier, ChatMessage } from '../types';

const CLAUDE_API_ENDPOINT = '/.netlify/functions/claude-api';

// Interfaz para la respuesta de extracción
interface ExtractionResponse {
  success: boolean;
  data?: ExtractedInvoiceData;
  type?: 'invoice' | 'remission';
  error?: string;
}

// Interfaz para la respuesta del chat
interface ChatResponse {
  success: boolean;
  message?: string;
  sources?: {
    invoice_id: string;
    supplier_name: string;
    date: string;
    total: number;
    relevance: string;
  }[];
  error?: string;
}

export const aiService = {
  // Extraer datos de factura/remisión usando Claude
  async extractInvoiceData(file: File): Promise<ExtractionResponse> {
    try {
      // Convertir archivo a base64
      const base64Data = await fileToBase64(file);
      
      const response = await fetch(CLAUDE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'extract_invoice',
          data: {
            file_base64: base64Data,
            file_type: file.type,
            file_name: file.name
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error extracting invoice data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  // Chatbot inteligente que responde sobre facturas
  async chat(
    query: string,
    invoices: Invoice[],
    remissions: Remission[],
    suppliers: Supplier[],
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    try {
      // Preparar contexto de datos
      const context = {
        invoices: invoices.map(inv => ({
          id: inv.id,
          uuid: inv.uuid,
          folio: inv.folio,
          serie: inv.serie,
          date: inv.date,
          supplier_name: inv.supplier_name,
          rfc_emisor: inv.rfc_emisor,
          insumo: inv.insumo,
          amount_net: inv.amount_net,
          iva: inv.iva,
          total: inv.total,
          status: inv.status,
          payment_date: inv.payment_date,
          delivery_confirmed: inv.delivery_confirmed,
          payment_method: inv.payment_method,
          cfdi_use: inv.cfdi_use,
          ai_extracted_data: inv.ai_extracted_data
        })),
        remissions: remissions.map(rem => ({
          id: rem.id,
          date: rem.date,
          supplier_name: rem.supplier_name,
          commodity_type: rem.commodity_type,
          amount: rem.amount,
          status: rem.status,
          reception_confirmed: rem.reception_confirmed,
          ai_extracted_data: rem.ai_extracted_data
        })),
        suppliers: suppliers.map(sup => ({
          id: sup.id,
          name: sup.name,
          rfc: sup.rfc,
          insumo: sup.insumo
        })),
        summary: {
          total_invoices: invoices.length,
          total_remissions: remissions.length,
          total_suppliers: suppliers.length,
          total_facturado: invoices.reduce((acc, inv) => acc + inv.total, 0),
          total_pagado: invoices.filter(i => i.status === 'Pagado').reduce((acc, inv) => acc + inv.total, 0),
          total_pendiente: invoices.filter(i => i.status === 'Pendiente').reduce((acc, inv) => acc + inv.total, 0)
        }
      };

      const response = await fetch(CLAUDE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          data: {
            query,
            context,
            conversation_history: conversationHistory.slice(-10) // Últimos 10 mensajes
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error in chat:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  // Validar factura fiscalmente
  async validateInvoice(invoice: Invoice): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validaciones básicas
    if (!invoice.uuid) {
      warnings.push('No tiene UUID fiscal registrado');
    }

    if (!invoice.rfc_emisor) {
      warnings.push('No tiene RFC del emisor');
    }

    // Validar IVA 16%
    const expectedIva = invoice.amount_net * 0.16;
    const ivaDifference = Math.abs(invoice.iva - expectedIva);
    if (ivaDifference > 1) { // Tolerancia de $1
      errors.push(`IVA incorrecto: esperado $${expectedIva.toFixed(2)}, registrado $${invoice.iva.toFixed(2)}`);
    }

    // Validar total
    const expectedTotal = invoice.amount_net + invoice.iva;
    const totalDifference = Math.abs(invoice.total - expectedTotal);
    if (totalDifference > 1) {
      errors.push(`Total incorrecto: esperado $${expectedTotal.toFixed(2)}, registrado $${invoice.total.toFixed(2)}`);
    }

    // Validar entrega
    if (!invoice.delivery_confirmed) {
      warnings.push('Pendiente confirmación de entrega');
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings
    };
  }
};

// Función auxiliar para convertir archivo a base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remover el prefijo "data:application/pdf;base64," o similar
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// Función para uso local/desarrollo (sin backend)
export const aiServiceLocal = {
  // Versión simplificada para desarrollo sin Netlify Functions
  async extractInvoiceDataLocal(_file: File): Promise<ExtractionResponse> {
    // Simular extracción básica
    console.warn('⚠️ Usando extracción simulada. Configure Netlify Functions para OCR real.');
    
    return {
      success: true,
      type: 'invoice',
      data: {
        nombre_emisor: 'Proveedor Demo',
        fecha_emision: new Date().toISOString().split('T')[0],
        subtotal: 1000,
        iva: 160,
        total: 1160,
        metodo_pago: 'PUE',
        uso_cfdi: 'G03',
        tiene_firma_recepcion: false
      }
    };
  }
};
