// ============================================
// FINANZAI HUB - TIPOS Y INTERFACES
// ============================================

export enum PaymentStatus {
  PAID = 'Pagado',
  PENDING = 'Pendiente'
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string;
  created_at: string;
  avatar_url?: string;
}

export interface Company {
  id: string;
  name: string;
  rfc: string;
  created_at: string;
}

export interface Supplier {
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
}

export interface Invoice {
  id: string;
  company_id: string;
  // Identificadores fiscales únicos
  uuid?: string;
  rfc_emisor?: string;
  folio?: string;
  serie?: string;
  // Datos del documento
  date: string;
  supplier_id?: string;
  supplier_name: string;
  insumo: string;
  // Montos
  amount_net: number;
  iva: number;
  total: number;
  // Términos y métodos
  payment_term: string;
  payment_method: string;
  cfdi_use: string;
  // Estados
  delivery_confirmed: boolean;
  status: PaymentStatus;
  payment_date?: string;
  is_fiscal_valid: boolean;
  // Archivo adjunto
  file_url?: string;
  file_name?: string;
  file_type?: string;
  // Datos extraídos por IA
  ai_extracted_data?: ExtractedInvoiceData;
  // Usuario que cargó
  uploaded_by?: string;
  uploaded_by_name?: string;
  // Metadatos
  created_at: string;
  updated_at: string;
}

export interface Remission {
  id: string;
  company_id: string;
  date: string;
  supplier_id?: string;
  supplier_name: string;
  commodity_type: string;
  amount: number;
  status: PaymentStatus;
  payment_date?: string;
  reception_confirmed: boolean;
  file_url?: string;
  file_name?: string;
  ai_extracted_data?: ExtractedRemissionData;
  // Usuario que cargó
  uploaded_by?: string;
  uploaded_by_name?: string;
  created_at: string;
  updated_at: string;
}

// Datos extraídos por IA del documento
export interface ExtractedInvoiceData {
  // Identificadores
  uuid?: string;
  rfc_emisor?: string;
  rfc_receptor?: string;
  folio?: string;
  serie?: string;
  // Fechas
  fecha_emision?: string;
  fecha_timbrado?: string;
  // Emisor
  nombre_emisor?: string;
  regimen_fiscal_emisor?: string;
  // Receptor
  nombre_receptor?: string;
  uso_cfdi?: string;
  // Conceptos detallados
  conceptos?: InvoiceConcept[];
  // Totales
  subtotal?: number;
  descuento?: number;
  iva?: number;
  isr_retenido?: number;
  iva_retenido?: number;
  total?: number;
  // Método de pago
  forma_pago?: string;
  metodo_pago?: string;
  condiciones_pago?: string;
  // Entrega
  tiene_firma_recepcion?: boolean;
  fecha_recepcion?: string;
  nombre_receptor_entrega?: string;
  // Observaciones
  observaciones?: string;
  // Validación
  es_valido_fiscalmente?: boolean;
  errores_detectados?: string[];
}

export interface InvoiceConcept {
  clave_prod_serv?: string;
  descripcion: string;
  cantidad: number;
  unidad?: string;
  valor_unitario: number;
  importe: number;
  descuento?: number;
}

export interface ExtractedRemissionData {
  folio?: string;
  fecha?: string;
  proveedor?: string;
  conceptos?: RemissionConcept[];
  total?: number;
  tiene_firma_recepcion?: boolean;
  fecha_recepcion?: string;
  observaciones?: string;
}

export interface RemissionConcept {
  descripcion: string;
  cantidad: number;
  unidad?: string;
  precio_unitario?: number;
  importe?: number;
}

// Resultado de detección de duplicados
export interface DuplicateCheckResult {
  is_duplicate: boolean;
  match_type?: 'uuid' | 'folio_rfc' | 'proveedor_total_fecha';
  existing_invoice?: Invoice;
  message?: string;
}

// Respuesta del chatbot
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: InvoiceReference[];
}

export interface InvoiceReference {
  invoice_id: string;
  supplier_name: string;
  date: string;
  total: number;
  relevance: string;
}

// Estado de la aplicación
export interface AppState {
  user: User | null;
  company: Company | null;
  suppliers: Supplier[];
  invoices: Invoice[];
  remissions: Remission[];
  isLoading: boolean;
  error: string | null;
}

// Props comunes
export interface DashboardProps {
  invoices: Invoice[];
  userRole: UserRole;
  onUpdate: (invoices: Invoice[]) => void;
  onDownloadFile: (invoice: Invoice) => void;
}

export interface SupplierDashboardProps {
  suppliers: Supplier[];
  invoices: Invoice[];
  remissions: Remission[];
  onUpdate: (suppliers: Supplier[]) => void;
}

export interface ChatBotProps {
  invoices: Invoice[];
  remissions: Remission[];
  suppliers: Supplier[];
}
