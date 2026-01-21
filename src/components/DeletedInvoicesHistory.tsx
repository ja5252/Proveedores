// ============================================
// HISTORIAL DE FACTURAS ELIMINADAS
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  X, Trash2, Clock, FileText, RotateCcw, 
  Search, AlertTriangle
} from 'lucide-react';

interface DeletedInvoice {
  id: string;
  original_id: string;
  company_id: string;
  folio?: string;
  supplier_name: string;
  total: number;
  date: string;
  deleted_by: string;
  deleted_by_name: string;
  deletion_reason: string;
  deleted_at: string;
  original_data: any;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onRestore?: (invoice: DeletedInvoice) => void;
}

const DeletedInvoicesHistory: React.FC<Props> = ({ isOpen, onClose, companyId, onRestore }) => {
  const [deletedInvoices, setDeletedInvoices] = useState<DeletedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && companyId) {
      loadDeletedInvoices();
    }
  }, [isOpen, companyId]);

  const loadDeletedInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deleted_invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedInvoices(data || []);
    } catch (error) {
      console.error('Error loading deleted invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (invoice: DeletedInvoice) => {
    if (!confirm('¿Restaurar esta factura? Se volverá a agregar a tus facturas activas.')) return;

    try {
      // Recreate the invoice from original_data
      const { id, ...invoiceData } = invoice.original_data;
      
      const { error: insertError } = await supabase
        .from('invoices')
        .insert(invoiceData);

      if (insertError) throw insertError;

      // Remove from deleted_invoices
      const { error: deleteError } = await supabase
        .from('deleted_invoices')
        .delete()
        .eq('id', invoice.id);

      if (deleteError) throw deleteError;

      setDeletedInvoices(prev => prev.filter(i => i.id !== invoice.id));
      alert('✅ Factura restaurada correctamente');
      
      if (onRestore) onRestore(invoice);
    } catch (error: any) {
      console.error('Error restoring invoice:', error);
      alert('Error al restaurar: ' + error.message);
    }
  };

  const handlePermanentDelete = async (invoice: DeletedInvoice) => {
    if (!confirm('⚠️ ¿Eliminar permanentemente? Esta acción NO se puede deshacer.')) return;

    try {
      const { error } = await supabase
        .from('deleted_invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) throw error;
      setDeletedInvoices(prev => prev.filter(i => i.id !== invoice.id));
    } catch (error: any) {
      console.error('Error deleting permanently:', error);
      alert('Error: ' + error.message);
    }
  };

  const filteredInvoices = deletedInvoices.filter(inv =>
    inv.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.deletion_reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-600 to-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Facturas Eliminadas</h2>
                <p className="text-slate-300 text-sm">{deletedInvoices.length} registros en papelera</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por proveedor, folio o motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 animate-spin" />
              <p>Cargando historial...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay facturas eliminadas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map(invoice => (
                <div 
                  key={invoice.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <span className="font-bold text-slate-800">{invoice.supplier_name}</span>
                        {invoice.folio && (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs font-mono">
                            {invoice.folio}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Total</p>
                          <p className="font-bold text-slate-700">
                            ${Number(invoice.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Fecha Factura</p>
                          <p className="text-slate-600">{new Date(invoice.date).toLocaleDateString('es-MX')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Eliminado por</p>
                          <p className="text-slate-600">{invoice.deleted_by_name || 'Usuario'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Fecha Eliminación</p>
                          <p className="text-slate-600">{new Date(invoice.deleted_at).toLocaleDateString('es-MX')}</p>
                        </div>
                      </div>

                      <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                        <div className="flex items-center gap-2 text-rose-700">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase">Motivo de eliminación:</span>
                        </div>
                        <p className="text-sm text-rose-600 mt-1">{invoice.deletion_reason}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleRestore(invoice)}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-200 transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restaurar
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(invoice)}
                        className="flex items-center gap-2 px-3 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-200 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
          Las facturas eliminadas se conservan por 90 días antes de eliminarse permanentemente
        </div>
      </div>
    </div>
  );
};

export default DeletedInvoicesHistory;
