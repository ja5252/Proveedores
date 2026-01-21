// ============================================
// EDIT INVOICE MODAL - EDITAR FACTURA EXISTENTE
// ============================================

import { useState, useEffect } from 'react';
import { 
  X, Check, Building2, Calendar, FileText, DollarSign, 
  Hash, CreditCard, Truck
} from 'lucide-react';
import { Invoice } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
  invoice: Invoice | null;
}

const EditInvoiceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  invoice
}) => {
  const [formData, setFormData] = useState<Partial<Invoice>>({});

  useEffect(() => {
    if (invoice) {
      setFormData({ ...invoice });
    }
  }, [invoice]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calcular Total si cambian subtotal o IVA
      if (field === 'amount_net') {
        const subtotal = Number(value) || 0;
        updated.iva = Math.round(subtotal * 0.16 * 100) / 100;
        updated.total = Math.round(subtotal * 1.16 * 100) / 100;
      }
      
      return updated;
    });
  };

  const handleSubmit = () => {
    if (!formData.supplier_name?.trim()) {
      alert('El nombre del proveedor es requerido');
      return;
    }
    if (!formData.total || formData.total <= 0) {
      alert('El total debe ser mayor a 0');
      return;
    }

    onSave(formData as Invoice);
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-500 to-indigo-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Editar Factura</h2>
                <p className="text-blue-100 text-sm">Folio: {invoice.folio || 'Sin folio'}</p>
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

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Proveedor */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <Building2 className="w-4 h-4" />
                Proveedor *
              </label>
              <input
                type="text"
                value={formData.supplier_name || ''}
                onChange={(e) => handleChange('supplier_name', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* RFC */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <Hash className="w-4 h-4" />
                RFC Emisor
              </label>
              <input
                type="text"
                value={formData.rfc_emisor || ''}
                onChange={(e) => handleChange('rfc_emisor', e.target.value.toUpperCase())}
                maxLength={13}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all uppercase"
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <Calendar className="w-4 h-4" />
                Fecha
              </label>
              <input
                type="date"
                value={formData.date || ''}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Folio */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Folio</label>
              <input
                type="text"
                value={formData.folio || ''}
                onChange={(e) => handleChange('folio', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Serie */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Serie</label>
              <input
                type="text"
                value={formData.serie || ''}
                onChange={(e) => handleChange('serie', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* UUID */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">UUID (CFDI)</label>
              <input
                type="text"
                value={formData.uuid || ''}
                onChange={(e) => handleChange('uuid', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-mono text-sm"
              />
            </div>

            {/* Concepto */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Concepto/Descripción</label>
              <input
                type="text"
                value={formData.insumo || ''}
                onChange={(e) => handleChange('insumo', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Subtotal */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <DollarSign className="w-4 h-4" />
                Subtotal
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount_net || ''}
                onChange={(e) => handleChange('amount_net', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* IVA */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">IVA (16%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.iva || ''}
                onChange={(e) => handleChange('iva', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Total */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <DollarSign className="w-4 h-4" />
                Total *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total || ''}
                onChange={(e) => handleChange('total', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-xl font-bold"
              />
            </div>

            {/* Método de pago */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <CreditCard className="w-4 h-4" />
                Método de Pago
              </label>
              <select
                value={formData.payment_method || 'PUE'}
                onChange={(e) => handleChange('payment_method', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="PUE">PUE - Pago en una sola exhibición</option>
                <option value="PPD">PPD - Pago en parcialidades</option>
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Estado de Pago</label>
              <select
                value={formData.status || 'Pendiente'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Pagado">Pagado</option>
              </select>
            </div>

            {/* Entrega confirmada */}
            <div className="md:col-span-2 flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <input
                type="checkbox"
                id="delivery_confirmed_edit"
                checked={formData.delivery_confirmed || false}
                onChange={(e) => handleChange('delivery_confirmed', e.target.checked)}
                className="w-5 h-5 accent-blue-500"
              />
              <label htmlFor="delivery_confirmed_edit" className="flex items-center gap-2 text-sm text-slate-700">
                <Truck className="w-4 h-4" />
                Entrega confirmada / Tiene firma de recepción
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-200 transition-all"
          >
            <Check className="w-5 h-5" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditInvoiceModal;
