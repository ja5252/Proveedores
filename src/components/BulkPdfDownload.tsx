// ============================================
// BULK PDF DOWNLOAD - DESCARGAR VARIOS PDFs EN ZIP
// ============================================

import { useState, useMemo } from 'react';
import { 
  X, Download, FileText, Check, Filter, Calendar,
  Loader2, Package, CheckSquare, Square
} from 'lucide-react';
import { Invoice } from '../types';
import JSZip from 'jszip';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
}

const BulkPdfDownload: React.FC<Props> = ({
  isOpen,
  onClose,
  invoices
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Filters
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Only invoices with file_url
  const invoicesWithFiles = useMemo(() => 
    invoices.filter(inv => inv.file_url),
    [invoices]
  );

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoicesWithFiles.filter(inv => {
      if (filterSupplier && !inv.supplier_name.toLowerCase().includes(filterSupplier.toLowerCase())) {
        return false;
      }
      if (filterDateFrom && inv.date < filterDateFrom) return false;
      if (filterDateTo && inv.date > filterDateTo) return false;
      if (filterStatus && inv.status !== filterStatus) return false;
      return true;
    });
  }, [invoicesWithFiles, filterSupplier, filterDateFrom, filterDateTo, filterStatus]);

  // Unique suppliers
  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set(invoicesWithFiles.map(inv => inv.supplier_name));
    return Array.from(suppliers).sort();
  }, [invoicesWithFiles]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const handleDownload = async () => {
    if (selectedIds.size === 0) {
      alert('Selecciona al menos una factura');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();
      const selectedInvoices = filteredInvoices.filter(inv => selectedIds.has(inv.id));
      
      let completed = 0;

      for (const invoice of selectedInvoices) {
        if (!invoice.file_url) continue;

        try {
          // Fetch the file
          const response = await fetch(invoice.file_url);
          const blob = await response.blob();
          
          // Create filename
          const date = invoice.date.replace(/-/g, '');
          const supplier = invoice.supplier_name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
          const folio = invoice.folio || 'sin_folio';
          const ext = invoice.file_name?.split('.').pop() || 'pdf';
          const fileName = `${date}_${supplier}_${folio}.${ext}`;
          
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Error downloading ${invoice.folio}:`, error);
        }

        completed++;
        setDownloadProgress(Math.round((completed / selectedInvoices.length) * 100));
      }

      // Generate ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Download
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`✅ Se descargaron ${selectedInvoices.length} archivos`);
      onClose();
    } catch (error: any) {
      console.error('Download error:', error);
      alert('Error al descargar: ' + error.message);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-violet-500 to-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Descargar PDFs en ZIP</h2>
                <p className="text-violet-100 text-sm">
                  {invoicesWithFiles.length} facturas con archivo disponible
                </p>
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

        {/* Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-600">Filtros</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Supplier filter */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Proveedor</label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              >
                <option value="">Todos</option>
                {uniqueSuppliers.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Desde</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            {/* Status filter */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              >
                <option value="">Todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Pagado">Pagado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Select all bar */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors"
          >
            {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? (
              <CheckSquare className="w-5 h-5 text-violet-500" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            Seleccionar todos ({filteredInvoices.length})
          </button>
          <span className="text-sm font-bold text-violet-600">
            {selectedIds.size} seleccionados
          </span>
        </div>

        {/* Content - Invoice list */}
        <div className="flex-1 overflow-auto p-4">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay facturas con archivos disponibles</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map(invoice => (
                <div
                  key={invoice.id}
                  onClick={() => toggleSelect(invoice.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedIds.has(invoice.id)
                      ? 'border-violet-400 bg-violet-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    selectedIds.has(invoice.id)
                      ? 'bg-violet-500 text-white'
                      : 'border-2 border-slate-300'
                  }`}>
                    {selectedIds.has(invoice.id) && <Check className="w-4 h-4" />}
                  </div>

                  {/* Icon */}
                  <div className="p-2 bg-rose-100 rounded-lg">
                    <FileText className="w-5 h-5 text-rose-600" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{invoice.supplier_name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(invoice.date).toLocaleDateString('es-MX')}
                      </span>
                      <span>Folio: {invoice.folio || '-'}</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right">
                    <p className="font-bold text-slate-800">
                      ${Number(invoice.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      invoice.status === 'Pagado'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          {isDownloading ? (
            <div className="flex items-center justify-center gap-4">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-600">Descargando...</span>
                  <span className="text-sm font-bold text-violet-600">{downloadProgress}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDownload}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                Descargar ZIP ({selectedIds.size})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkPdfDownload;
