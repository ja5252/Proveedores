// ============================================
// INVOICE DASHBOARD - ACTUALIZADO
// ============================================

import { useState, useMemo } from 'react';
import { Invoice, Supplier, UserRole, PaymentStatus } from '../types';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import {
  Search, Download, Upload, FileText, CheckCircle,
  Clock, Trash2, Eye, DollarSign,
  FileDown, Shield, ChevronDown, FileSpreadsheet, Users,
  X, Check, History, Edit2, PlusCircle, Package
} from 'lucide-react';

// Import new components
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

  // Open delete modal
  const handleDeleteClick = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteModal(true);
  };

  // Delete invoice with reason
  const deleteInvoiceWithReason = async (reason: string) => {
    if (!invoiceToDelete) return;

    try {
      // First, save to deleted_invoices table
      const { error: archiveError } = await supabase
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

      if (archiveError) {
        console.warn('Could not archive invoice:', archiveError);
        // Continue with deletion even if archive fails
      }

      // Now delete the original
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete.id);

      if (error) throw error;
      
      onUpdate(invoices.filter(inv => inv.id !== invoiceToDelete.id));
      setShowDeleteModal(false);
      setInvoiceToDelete(null);
      
      alert('✅ Factura eliminada. Puedes restaurarla desde el historial.');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error al eliminar la factura');
    }
  };

  // Export to formatted Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Resumen sheet
    const summaryData = [
      ['PORTAL LOGAN - REPORTE DE FACTURAS'],
      [''],
      ['Fecha de generación:', new Date().toLocaleDateString('es-MX')],
      [''],
      ['RESUMEN'],
      ['Total Facturado:', stats.total],
      ['Total Pagado:', stats.pagado],
      ['Saldo Pendiente:', stats.pendiente],
      ['Total de Facturas:', invoices.length],
      ['Facturas con Comprobante:', stats.conArchivo],
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

    // Detalle sheet
    const detailData = [
      ['DETALLE DE FACTURAS'],
      [''],
      ['Fecha', 'Folio', 'Serie', 'UUID', 'Proveedor', 'RFC', 'Concepto', 
       'Subtotal', 'IVA', 'Total', 'Estado', 'Fecha Pago', 'Entrega', 'Archivo'],
      ...filteredInvoices.map(inv => [
        inv.date,
        inv.folio || '',
        inv.serie || '',
        inv.uuid || '',
        inv.supplier_name,
        inv.rfc_emisor || '',
        inv.insumo,
        inv.amount_net,
        inv.iva,
        inv.total,
        inv.status,
        inv.payment_date || '',
        inv.delivery_confirmed ? 'Sí' : 'No',
        inv.file_url ? 'Sí' : 'No'
      ])
    ];

    const detailWs = XLSX.utils.aoa_to_sheet(detailData);
    detailWs['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 38 }, { wch: 30 },
      { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }
    ];
    
    // Auto-filter
    detailWs['!autofilter'] = { ref: 'A3:N3' };
    
    XLSX.utils.book_append_sheet(wb, detailWs, 'Detalle');

    // Por Proveedor sheet
    const supplierGroups: Record<string, Invoice[]> = {};
    filteredInvoices.forEach(inv => {
      if (!supplierGroups[inv.supplier_name]) {
        supplierGroups[inv.supplier_name] = [];
      }
      supplierGroups[inv.supplier_name].push(inv);
    });

    const supplierData: any[][] = [
      ['RESUMEN POR PROVEEDOR'],
      [''],
      ['Proveedor', 'Facturas', 'Total', 'Pagado', 'Pendiente']
    ];

    Object.entries(supplierGroups).forEach(([name, invs]) => {
      const total = invs.reduce((sum, inv) => sum + Number(inv.total), 0);
      const pagado = invs.filter(inv => inv.status === 'Pagado').reduce((sum, inv) => sum + Number(inv.total), 0);
      supplierData.push([name, invs.length, total, pagado, total - pagado]);
    });

    const supplierWs = XLSX.utils.aoa_to_sheet(supplierData);
    supplierWs['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    supplierWs['!autofilter'] = { ref: 'A3:E3' };
    XLSX.utils.book_append_sheet(wb, supplierWs, 'Por Proveedor');

    XLSX.writeFile(wb, `Facturas_Logan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Download template
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    const data = [
      ['PLANTILLA DE CARGA DE FACTURAS - PORTAL LOGAN'],
      [''],
      ['Instrucciones:'],
      ['1. Reemplace los datos de ejemplo con sus facturas'],
      ['2. Mantenga el formato de fechas (YYYY-MM-DD)'],
      ['3. No modifique los nombres de las columnas'],
      ['4. Elimine estas filas de instrucciones antes de cargar'],
      [''],
      ['FECHA', 'FOLIO', 'SERIE', 'UUID', 'PROVEEDOR', 'RFC_PROVEEDOR', 
       'CONCEPTO', 'SUBTOTAL', 'IVA', 'TOTAL', 'ESTADO', 'ENTREGA_CONFIRMADA'],
      ['2026-01-15', '12345', 'A', '', 'Proveedor Ejemplo SA', 'PEJ123456789', 
       'Materiales diversos', 10000, 1600, 11600, 'Pendiente', 'No'],
      ['2026-01-16', '12346', 'A', '', 'Otro Proveedor SA', 'OPS987654321', 
       'Servicios profesionales', 5000, 800, 5800, 'Pagado', 'Sí'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 38 }, { wch: 25 },
      { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 18 }
    ];

    // Merge title
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];

    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, 'Plantilla_Facturas_Logan.xlsx');
  };

  // Handle bulk import
  const handleBulkImport = async (newInvoices: any[]) => {
    try {
      const invoicesToInsert = newInvoices.map(inv => ({
        ...inv,
        company_id: companyId,
        status: inv.status || 'Pendiente',
        delivery_confirmed: inv.delivery_confirmed || false,
        uploaded_by: userId,
        uploaded_by_name: userName
      }));

      const { data, error } = await supabase
        .from('invoices')
        .insert(invoicesToInsert)
        .select();

      if (error) throw error;

      if (data) {
        onUpdate([...data as Invoice[], ...invoices]);
        alert(`✅ Se importaron ${data.length} facturas correctamente`);
      }
    } catch (error: any) {
      console.error('Error importing invoices:', error);
      alert(`Error al importar: ${error.message}`);
    }
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

      // Update local state
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
            <div className="p-3 bg-slate-500 rounded-xl shadow-lg shadow-slate-200">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Total Facturado</p>
              <p className="text-xl font-black text-slate-800">
                ${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-200">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-medium uppercase">Pagado</p>
              <p className="text-xl font-black text-emerald-700">
                ${stats.pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 rounded-xl shadow-lg shadow-amber-200">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-amber-600 font-medium uppercase">Pendiente</p>
              <p className="text-xl font-black text-amber-700">
                ${stats.pendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg shadow-blue-200">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium uppercase">Con Archivo</p>
              <p className="text-xl font-black text-blue-700">
                {stats.conArchivo} / {invoices.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por proveedor, folio, UUID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400"
            />
          </div>
          
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer focus:ring-2 focus:ring-teal-100"
            >
              <option value="all">Todos</option>
              <option value="Pagado">Pagados</option>
              <option value="Pendiente">Pendientes</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowStatement(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-100 text-violet-700 rounded-xl font-bold hover:bg-violet-200 transition-all"
          >
            <Users className="w-4 h-4" />
            Estado de Cuenta
          </button>
          
          <button
            onClick={() => setShowBulkUploader(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 transition-all"
          >
            <Upload className="w-4 h-4" />
            Carga Masiva
          </button>

          <button
            onClick={() => setShowManualForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl font-bold hover:bg-emerald-200 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Manual
          </button>

          <button
            onClick={() => setShowBulkDownload(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-100 text-violet-700 rounded-xl font-bold hover:bg-violet-200 transition-all"
          >
            <Package className="w-4 h-4" />
            Descargar ZIPs
          </button>

          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Plantilla
          </button>

          <button
            onClick={() => setShowDeletedHistory(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
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
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
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
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-slate-800">
                        {new Date(invoice.date).toLocaleDateString('es-MX')}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {invoice.folio || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => openSupplierView(invoice.supplier_name)}
                        className="text-left hover:bg-slate-100 p-1 -m-1 rounded-lg transition-colors group"
                      >
                        <p className="text-sm font-medium text-slate-800 group-hover:text-teal-600 transition-colors">
                          {invoice.supplier_name}
                        </p>
                        {invoice.rfc_emisor && (
                          <p className="text-xs text-slate-400">{invoice.rfc_emisor}</p>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-600 truncate max-w-[200px]">
                        {invoice.insumo}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm text-slate-600">
                        ${Number(invoice.amount_net).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-bold text-slate-800">
                        ${Number(invoice.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold mb-1">
                          {invoice.uploaded_by_name ? invoice.uploaded_by_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <p className="text-xs text-slate-600 truncate max-w-[80px]">
                          {invoice.uploaded_by_name || 'Sistema'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {invoice.delivery_confirmed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                          <Check className="w-3 h-3" /> Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold">
                          <X className="w-3 h-3" /> No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {invoice.file_url ? (
                        <button
                          onClick={() => onDownloadFile(invoice)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-all"
                        >
                          <FileDown className="w-3 h-3" /> PDF
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => togglePaymentStatus(invoice)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {userRole !== 'viewer' && (
                          <>
                            <button
                              onClick={() => handleEditClick(invoice)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(invoice)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">Detalle de Factura</h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Fiscal info */}
              {selectedInvoice.uuid && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-emerald-800">CFDI Válido</span>
                  </div>
                  <p className="text-xs font-mono text-emerald-700 break-all">
                    UUID: {selectedInvoice.uuid}
                  </p>
                </div>
              )}

              {/* Main info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Proveedor</p>
                  <p className="text-slate-800 font-medium">{selectedInvoice.supplier_name}</p>
                  {selectedInvoice.rfc_emisor && (
                    <p className="text-sm text-slate-500">RFC: {selectedInvoice.rfc_emisor}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Fecha</p>
                  <p className="text-slate-800 font-medium">
                    {new Date(selectedInvoice.date).toLocaleDateString('es-MX', { 
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Folio / Serie</p>
                  <p className="text-slate-800 font-medium">
                    {selectedInvoice.folio || '-'} {selectedInvoice.serie ? `/ ${selectedInvoice.serie}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Método de Pago</p>
                  <p className="text-slate-800 font-medium">{selectedInvoice.payment_method || 'PUE'}</p>
                </div>
              </div>

              {/* Amounts */}
              <div className="p-4 bg-slate-50 rounded-2xl">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">
                    ${Number(selectedInvoice.amount_net).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">IVA (16%)</span>
                  <span className="font-medium">
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

              {/* AI extracted data */}
              {selectedInvoice.ai_extracted_data && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <p className="text-xs text-blue-600 uppercase font-bold mb-2">
                    Datos extraídos por IA
                  </p>
                  <pre className="text-xs text-blue-800 overflow-auto max-h-40">
                    {JSON.stringify(selectedInvoice.ai_extracted_data, null, 2)}
                  </pre>
                </div>
              )}
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
      />

      <SupplierQuickView
        supplier={suppliers.find(s => s.name === selectedSupplierName) || null}
        supplierName={selectedSupplierName}
        invoices={invoices}
        isOpen={showSupplierView}
        onClose={() => setShowSupplierView(false)}
      />

      {/* Delete Reason Modal */}
      <DeleteReasonModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setInvoiceToDelete(null); }}
        onConfirm={deleteInvoiceWithReason}
        itemType="factura"
        itemDescription={invoiceToDelete ? `${invoiceToDelete.supplier_name} - $${Number(invoiceToDelete.total).toLocaleString('es-MX')}` : ''}
      />

      {/* Deleted History Modal */}
      <DeletedInvoicesHistory
        isOpen={showDeletedHistory}
        onClose={() => setShowDeletedHistory(false)}
        companyId={companyId}
        onRestore={() => {
          // Reload invoices after restore
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
