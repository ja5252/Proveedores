// ============================================
// INVOICE DASHBOARD - CON ELIMINACIÓN MASIVA
// ============================================

import { useState, useMemo } from 'react';
import { Invoice, Supplier, UserRole, PaymentStatus } from '../types';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import {
  Search, Download, Upload, FileText, CheckCircle,
  Clock, Trash2, Eye, DollarSign,
  FileDown, Shield, ChevronDown, FileSpreadsheet, Users,
  X, Check, History, Edit2, PlusCircle, Package, CheckSquare, Square
} from 'lucide-react';

// Import components
import SupplierStatement from './SupplierStatement';
import BulkUploader from './BulkUploader';
import SupplierQuickView from './SupplierQuickView';
import DeleteReasonModal from './DeleteReasonModal';
import DeletedInvoicesHistory from './DeletedInvoicesHistory';
import EditInvoiceModal from './EditInvoiceModal';
import ManualInvoiceForm from './ManualInvoiceForm';
import BulkPdfDownload from './BulkPdfDownload';

interface Props {
  invoices: Invoice[];
  userRole: UserRole;
  onUpdate: (invoices: Invoice[]) => void;
  onDownloadFile: (invoice: Invoice) => void;
  companyId: string;
  suppliers?: Supplier[];
  userId?: string;
  userName?: string;
}

const InvoiceDashboard: React.FC<Props> = ({ 
  invoices, 
  userRole, 
  onUpdate, 
  onDownloadFile, 
  companyId,
  suppliers = [],
  userId = '',
  userName = 'Usuario'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // New states for modals
  const [showStatement, setShowStatement] = useState(false);
  const [showBulkUploader, setShowBulkUploader] = useState(false);
  const [showSupplierView, setShowSupplierView] = useState(false);
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  
  // Delete states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [showDeletedHistory, setShowDeletedHistory] = useState(false);

  // Edit and Manual states
  const [showEditModal, setShowEditModal] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showBulkDownload, setShowBulkDownload] = useState(false);

  // ========== NUEVO: Estados para selección múltiple ==========
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const pagado = invoices.filter(inv => inv.status === 'Pagado').reduce((sum, inv) => sum + Number(inv.total), 0);
    const pendiente = total - pagado;
    const conArchivo = invoices.filter(inv => inv.file_url).length;
    return { total, pagado, pendiente, conArchivo };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.uuid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.insumo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  // ========== NUEVO: Funciones de selección múltiple ==========
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // ========== NUEVO: Eliminación masiva ==========
  const handleBulkDelete = async (reason: string) => {
    if (selectedIds.size === 0) return;
    
    setBulkDeleting(true);
    const idsToDelete = Array.from(selectedIds);
    const invoicesToDelete = invoices.filter(inv => selectedIds.has(inv.id));
    
    try {
      // Archivar cada factura antes de eliminar
      for (const invoice of invoicesToDelete) {
        await supabase
          .from('deleted_invoices')
          .insert({
            original_id: invoice.id,
            company_id: companyId,
            folio: invoice.folio,
            supplier_name: invoice.supplier_name,
            total: invoice.total,
            date: invoice.date,
            deleted_by: userId,
            deleted_by_name: userName,
            deletion_reason: reason,
            original_data: invoice
          });
      }

      // Eliminar todas las facturas seleccionadas
      const { error } = await supabase
        .from('invoices')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;
      
      // Actualizar estado local
      onUpdate(invoices.filter(inv => !selectedIds.has(inv.id)));
      setSelectedIds(new Set());
      setShowBulkDeleteModal(false);
      
      alert(`✅ ${idsToDelete.length} facturas eliminadas correctamente`);
    } catch (error: any) {
      console.error('Error en eliminación masiva:', error);
      alert('Error al eliminar: ' + error.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  // Toggle payment status
  const togglePaymentStatus = async (invoice: Invoice) => {
    const newStatus = invoice.status === 'Pagado' ? 'Pendiente' : 'Pagado';
    const paymentDate = newStatus === 'Pagado' ? new Date().toISOString().split('T')[0] : undefined;

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus, payment_date: paymentDate || null })
        .eq('id', invoice.id);

      if (error) throw error;

      onUpdate(invoices.map(inv => 
        inv.id === invoice.id 
          ? { ...inv, status: newStatus as PaymentStatus, payment_date: paymentDate } 
          : inv
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Open delete modal (single)
  const handleDeleteClick = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteModal(true);
  };

  // Delete invoice with reason (single)
  const deleteInvoiceWithReason = async (reason: string) => {
    if (!invoiceToDelete) return;

    try {
      await supabase
        .from('deleted_invoices')
        .insert({
          original_id: invoiceToDelete.id,
          company_id: companyId,
          folio: invoiceToDelete.folio,
          supplier_name: invoiceToDelete.supplier_name,
          total: invoiceToDelete.total,
          date: invoiceToDelete.date,
          deleted_by: userId,
          deleted_by_name: userName,
          deletion_reason: reason,
          original_data: invoiceToDelete
        });

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete.id);

      if (error) throw error;
      
      onUpdate(invoices.filter(inv => inv.id !== invoiceToDelete.id));
      setShowDeleteModal(false);
      setInvoiceToDelete(null);
      
      alert('✅ Factura eliminada');
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      alert('Error al eliminar: ' + error.message);
    }
  };

  // Bulk import handler
  const handleBulkImport = async (importedInvoices: any[]) => {
    try {
      const invoicesToInsert = importedInvoices.map(inv => ({
        company_id: companyId,
        date: inv.date || inv.fecha_emision || new Date().toISOString().split('T')[0],
        supplier_name: inv.supplier_name || inv.nombre_emisor || 'Proveedor',
        supplier_id: inv.supplier_id || null,
        rfc_emisor: inv.rfc_emisor,
        folio: inv.folio,
        insumo: inv.insumo || inv.description || 'General',
        amount_net: inv.amount_net || inv.subtotal || 0,
        iva: inv.iva || 0,
        total: inv.total || 0,
        status: 'Pendiente',
        uploaded_by: userId,
        uploaded_by_name: userName
      }));

      const { data, error } = await supabase
        .from('invoices')
        .insert(invoicesToInsert)
        .select();

      if (error) throw error;
      
      onUpdate([...(data as Invoice[]), ...invoices]);
      alert(`✅ ${data?.length || 0} facturas importadas correctamente`);
    } catch (error: any) {
      console.error('Error importing invoices:', error);
      alert('Error al importar: ' + error.message);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = filteredInvoices.map(inv => ({
      'Fecha': inv.date,
      'Folio': inv.folio || '',
      'Serie': inv.serie || '',
      'UUID': inv.uuid || '',
      'Proveedor': inv.supplier_name,
      'RFC': inv.rfc_emisor || '',
      'Concepto': inv.insumo,
      'Subtotal': inv.amount_net,
      'IVA': inv.iva,
      'Total': inv.total,
      'Estado': inv.status,
      'Entrega Confirmada': inv.delivery_confirmed ? 'Sí' : 'No',
      'Fecha Pago': inv.payment_date || '',
      'Cargado por': inv.uploaded_by_name || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, `facturas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Open supplier quick view
  const openSupplierView = (supplierName: string) => {
    setSelectedSupplierName(supplierName);
    setShowSupplierView(true);
  };

  // Open edit modal
  const handleEditClick = (invoice: Invoice) => {
    setInvoiceToEdit(invoice);
    setShowEditModal(true);
  };

  // Save edited invoice
  const handleSaveEdit = async (updatedInvoice: Invoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          supplier_name: updatedInvoice.supplier_name,
          rfc_emisor: updatedInvoice.rfc_emisor,
          date: updatedInvoice.date,
          folio: updatedInvoice.folio,
          serie: updatedInvoice.serie,
          uuid: updatedInvoice.uuid,
          insumo: updatedInvoice.insumo,
          amount_net: updatedInvoice.amount_net,
          iva: updatedInvoice.iva,
          total: updatedInvoice.total,
          payment_method: updatedInvoice.payment_method,
          status: updatedInvoice.status,
          delivery_confirmed: updatedInvoice.delivery_confirmed,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedInvoice.id);

      if (error) throw error;

      const updatedInvoices = invoices.map(inv => 
        inv.id === updatedInvoice.id ? { ...inv, ...updatedInvoice } : inv
      );
      onUpdate(updatedInvoices);
      
      setShowEditModal(false);
      setInvoiceToEdit(null);
      alert('✅ Factura actualizada correctamente');
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      alert('Error al actualizar: ' + error.message);
    }
  };

  // Save manual invoice
  const handleSaveManual = async (invoiceData: any) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          company_id: companyId,
          supplier_name: invoiceData.supplier_name,
          rfc_emisor: invoiceData.rfc_emisor,
          date: invoiceData.date,
          folio: invoiceData.folio,
          serie: invoiceData.serie,
          uuid: invoiceData.uuid,
          insumo: invoiceData.insumo,
          amount_net: invoiceData.amount_net,
          iva: invoiceData.iva,
          total: invoiceData.total,
          payment_method: invoiceData.payment_method,
          cfdi_use: invoiceData.cfdi_use,
          delivery_confirmed: invoiceData.delivery_confirmed,
          status: invoiceData.status || PaymentStatus.PENDING,
          uploaded_by: userId,
          uploaded_by_name: userName
        })
        .select()
        .single();

      if (error) throw error;

      onUpdate([data as Invoice, ...invoices]);
      setShowManualForm(false);
      alert('✅ Factura registrada correctamente');
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert('Error al crear factura: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-200 rounded-xl">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Facturas</p>
              <p className="text-2xl font-black text-slate-800">{invoices.length}</p>
            </div>
          </div>
        </div>
        
        <div className="p-5 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 rounded-xl">
              <DollarSign className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-teal-600 uppercase font-bold">Total</p>
              <p className="text-xl font-black text-teal-700">${stats.total.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
        
        <div className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-emerald-600 uppercase font-bold">Pagado</p>
              <p className="text-xl font-black text-emerald-700">${stats.pagado.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
        
        <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-amber-600 uppercase font-bold">Pendiente</p>
              <p className="text-xl font-black text-amber-700">${stats.pendiente.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== NUEVO: Barra de selección múltiple ========== */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl text-white animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-6 h-6" />
            <span className="font-bold">{selectedIds.size} factura(s) seleccionada(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-rose-600 rounded-xl font-bold hover:bg-rose-50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Seleccionadas
            </button>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Search and Filter */}
        <div className="flex flex-1 gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por proveedor, folio, UUID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400 transition-all"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-200"
          >
            <option value="all">Todos</option>
            <option value="Pagado">Pagado</option>
            <option value="Pendiente">Pendiente</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowManualForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Manual
          </button>
          
          <button
            onClick={() => setShowBulkUploader(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-200"
          >
            <Upload className="w-4 h-4" />
            Carga Masiva
          </button>
          
          <button
            onClick={() => setShowStatement(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 text-white rounded-xl font-bold hover:bg-violet-600 transition-all shadow-lg shadow-violet-200"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Estado de Cuenta
          </button>

          <button
            onClick={() => setShowDeletedHistory(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all"
          >
            <History className="w-4 h-4" />
            Eliminados
          </button>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {/* ========== NUEVO: Checkbox de selección ========== */}
                <th className="px-3 py-4 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-slate-200 rounded transition-all"
                    title={selectedIds.size === filteredInvoices.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  >
                    {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-teal-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">Fecha / Folio</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">Proveedor</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">Concepto</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase">Neto</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase">Cargado por</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase">Entrega</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase">Archivo</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase">Estado</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No hay facturas registradas</p>
                    <button
                      onClick={() => setShowBulkUploader(true)}
                      className="mt-4 px-4 py-2 bg-teal-100 text-teal-700 rounded-lg font-medium hover:bg-teal-200 transition-all"
                    >
                      Cargar facturas
                    </button>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(invoice => (
                  <tr 
                    key={invoice.id} 
                    className={`hover:bg-slate-50 transition-colors ${
                      selectedIds.has(invoice.id) ? 'bg-teal-50' : ''
                    }`}
                  >
                    {/* ========== NUEVO: Checkbox por fila ========== */}
                    <td className="px-3 py-4 text-center">
                      <button
                        onClick={() => toggleSelect(invoice.id)}
                        className="p-1 hover:bg-slate-200 rounded transition-all"
                      >
                        {selectedIds.has(invoice.id) ? (
                          <CheckSquare className="w-5 h-5 text-teal-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-slate-800">
                        {new Date(invoice.date).toLocaleDateString('es-MX')}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">{invoice.folio || '-'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => openSupplierView(invoice.supplier_name)}
                        className="text-sm font-medium text-slate-800 hover:text-teal-600 text-left transition-colors"
                      >
                        {invoice.supplier_name}
                      </button>
                      {invoice.rfc_emisor && (
                        <p className="text-xs text-slate-500">{invoice.rfc_emisor}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-600 max-w-[200px] truncate">{invoice.insumo}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-medium text-slate-700">
                        ${Number(invoice.amount_net).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-bold text-slate-800">
                        ${Number(invoice.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs text-slate-500">
                        {invoice.uploaded_by_name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${
                        invoice.delivery_confirmed 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {invoice.delivery_confirmed ? '✓ Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {invoice.file_url ? (
                        <button
                          onClick={() => onDownloadFile(invoice)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Descargar archivo"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => togglePaymentStatus(invoice)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          invoice.status === 'Pagado'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        {invoice.status}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleEditClick(invoice)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(invoice)}
                          className="p-2 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto my-auto">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-slate-900">Detalle de Factura</h2>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Proveedor</p>
                    <p className="text-slate-800 font-medium">{selectedInvoice.supplier_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Fecha</p>
                    <p className="text-slate-800">{new Date(selectedInvoice.date).toLocaleDateString('es-MX')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Folio</p>
                    <p className="text-slate-800 font-mono">{selectedInvoice.folio || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">RFC Emisor</p>
                    <p className="text-slate-800 font-mono">{selectedInvoice.rfc_emisor || '-'}</p>
                  </div>
                </div>

                {selectedInvoice.uuid && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">UUID Fiscal</p>
                    <p className="text-slate-800 font-mono text-xs break-all">{selectedInvoice.uuid}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Concepto</p>
                  <p className="text-slate-800">{selectedInvoice.insumo}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="text-slate-800 font-medium">
                      ${Number(selectedInvoice.amount_net).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">IVA</span>
                    <span className="text-slate-800 font-medium">
                      ${Number(selectedInvoice.iva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-800">Total</span>
                    <span className="font-black text-lg text-slate-800">
                      ${Number(selectedInvoice.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <SupplierStatement
        invoices={invoices}
        suppliers={suppliers}
        isOpen={showStatement}
        onClose={() => setShowStatement(false)}
      />

      <BulkUploader
        isOpen={showBulkUploader}
        onClose={() => setShowBulkUploader(false)}
        onImport={handleBulkImport}
        existingInvoices={invoices}
        suppliers={suppliers}
      />

      <SupplierQuickView
        supplier={suppliers.find(s => s.name === selectedSupplierName) || null}
        supplierName={selectedSupplierName}
        invoices={invoices}
        isOpen={showSupplierView}
        onClose={() => setShowSupplierView(false)}
      />

      {/* Delete Reason Modal (Single) */}
      <DeleteReasonModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setInvoiceToDelete(null); }}
        onConfirm={deleteInvoiceWithReason}
        itemType="factura"
        itemDescription={invoiceToDelete ? `${invoiceToDelete.supplier_name} - $${Number(invoiceToDelete.total).toLocaleString('es-MX')}` : ''}
      />

      {/* ========== NUEVO: Modal de Eliminación Masiva ========== */}
      <DeleteReasonModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        itemType="facturas"
        itemDescription={`${selectedIds.size} facturas seleccionadas`}
        isLoading={bulkDeleting}
      />

      {/* Deleted History Modal */}
      <DeletedInvoicesHistory
        isOpen={showDeletedHistory}
        onClose={() => setShowDeletedHistory(false)}
        companyId={companyId}
        onRestore={() => {
          window.location.reload();
        }}
      />

      {/* Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setInvoiceToEdit(null);
        }}
        onSave={handleSaveEdit}
        invoice={invoiceToEdit}
      />

      {/* Manual Invoice Form */}
      <ManualInvoiceForm
        isOpen={showManualForm}
        onClose={() => setShowManualForm(false)}
        onSave={handleSaveManual}
      />

      {/* Bulk PDF Download */}
      <BulkPdfDownload
        isOpen={showBulkDownload}
        onClose={() => setShowBulkDownload(false)}
        invoices={invoices}
      />
    </div>
  );
};

export default InvoiceDashboard;
