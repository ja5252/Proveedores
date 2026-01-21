// ============================================
// INVOICE PREVIEW MODAL - REVISAR ANTES DE GUARDAR
// ============================================

import { useState, useEffect } from 'react';
import { 
  X, Check, Edit2, AlertTriangle, Building2, Calendar,
  FileText, DollarSign, Hash
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  extractedData: any;
  documentType: 'invoice' | 'remission';
  fileName: string;
}

const InvoicePreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  extractedData,
  documentType,
  fileName
}) => {
  const [formData, setFormData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (extractedData) {
      // Mapear datos extraídos a formato de formulario
      setFormData({
        fecha: extractedData.fecha_emision || extractedData.fecha || new Date().toISOString().split('T')[0],
        proveedor: extractedData.nombre_emisor || extractedData.proveedor || '',
        rfc: extractedData.rfc_emisor || '',
        folio: extractedData.folio || '',
        serie: extractedData.serie || '',
        uuid: extractedData.uuid || '',
        concepto: extractedData.conceptos?.[0]?.descripcion || extractedData.insumo || 'General',
        subtotal: extractedData.subtotal || extractedData.amount_net || 0,
        iva: extractedData.iva || 0,
        total: extractedData.total || 0,
        metodo_pago: extractedData.metodo_pago || 'PUE',
        uso_cfdi: extractedData.uso_cfdi || 'G03',
        entrega_confirmada: extractedData.tiene_firma_recepcion || false
      });
    }
  }, [extractedData]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calcular IVA y Total
      if (field === 'subtotal') {
        const subtotal = Number(value) || 0;
        updated.iva = Math.round(subtotal * 0.16 * 100) / 100;
        updated.total = Math.round(subtotal * 1.16 * 100) / 100;
      }
      
      return updated;
    });
  };

  const handleConfirm = () => {
    // Validar campos requeridos
    if (!formData.proveedor?.trim()) {
      alert('El nombre del proveedor es requerido');
      return;
    }
    if (!formData.total || formData.total <= 0) {
      alert('El total debe ser mayor a 0');
      return;
    }

    // Convertir de vuelta al formato esperado
    const finalData = {
      ...extractedData,
      fecha_emision: formData.fecha,
      nombre_emisor: formData.proveedor,
      rfc_emisor: formData.rfc,
      folio: formData.folio,
      serie: formData.serie,
      uuid: formData.uuid,
      conceptos: [{ descripcion: formData.concepto, cantidad: 1, valor_unitario: formData.subtotal, importe: formData.subtotal }],
      subtotal: Number(formData.subtotal),
      iva: Number(formData.iva),
      total: Number(formData.total),
      metodo_pago: formData.metodo_pago,
      uso_cfdi: formData.uso_cfdi,
      tiene_firma_recepcion: formData.entrega_confirmada
    };

    onConfirm(finalData);
  };

  if (!isOpen) return null;

  const hasWarnings = !formData.rfc || !formData.folio || !formData.uuid;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-teal-500 to-emerald-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Revisar {documentType === 'invoice' ? 'Factura' : 'Remisión'}</h2>
                <p className="text-teal-100 text-sm truncate max-w-xs">{fileName}</p>
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

        {/* Warning */}
        {hasWarnings && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              Algunos campos no se detectaron. Revisa y completa la información.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase">Datos Extraídos</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                isEditing 
                  ? 'bg-teal-100 text-teal-700' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Edit2 className="w-4 h-4" />
              {isEditing ? 'Editando' : 'Editar'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Proveedor */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <Building2 className="w-4 h-4" />
                Proveedor *
              </label>
              <input
                type="text"
                value={formData.proveedor || ''}
                onChange={(e) => handleChange('proveedor', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing 
                    ? 'bg-white border-teal-300 focus:ring-2 focus:ring-teal-200' 
                    : 'bg-slate-50 border-slate-200'
                } ${!formData.proveedor ? 'border-amber-300 bg-amber-50' : ''}`}
              />
            </div>

            {/* RFC */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <Hash className="w-4 h-4" />
                RFC
              </label>
              <input
                type="text"
                value={formData.rfc || ''}
                onChange={(e) => handleChange('rfc', e.target.value.toUpperCase())}
                disabled={!isEditing}
                maxLength={13}
                className={`w-full px-4 py-3 rounded-xl border transition-all uppercase ${
                  isEditing 
                    ? 'bg-white border-teal-300 focus:ring-2 focus:ring-teal-200' 
                    : 'bg-slate-50 border-slate-200'
                } ${!formData.rfc ? 'border-amber-300 bg-amber-50' : ''}`}
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
                value={formData.fecha || ''}
                onChange={(e) => handleChange('fecha', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing 
                    ? 'bg-white border-teal-300 focus:ring-2 focus:ring-teal-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            {/* Folio */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Folio</label>
              <input
                type="text"
                value={formData.folio || ''}
                onChange={(e) => handleChange('folio', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing 
                    ? 'bg-white border-teal-300 focus:ring-2 focus:ring-teal-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            {/* Serie */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Serie</label>
              <input
                type="text"
                value={formData.serie || ''}
                onChange={(e) => handleChange('serie', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing 
                    ? 'bg-white border-teal-300 focus:ring-2 focus:ring-teal-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            {/* Concepto */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Concepto/Descripción</label>
              <input
                type="text"
                value={formData.concepto || ''}
                onChange={(e) => handleChange('concepto', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing 
                    ? 'bg-white border-teal-300 focus:ring-2 focus:ring-teal-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
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
                value={formData.subtotal || ''}
                onChange={(e) => handleChange('subtotal', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing 
                    ? 'bg-white border-teal-300 focus:ring-2 focus:ring-teal-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            {/* IVA */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">IVA (16%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.iva || ''}
                onChange={(e) => handleChange('iva', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing 
                    ? 'bg-white border-teal-300 focus:ring-2 focus:ring-teal-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
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
                onChange={(e) => handleChange('total', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border text-xl font-bold transition-all ${
                  isEditing 
                    ? 'bg-white border-teal-300 focus:ring-2 focus:ring-teal-200' 
                    : 'bg-slate-50 border-slate-200'
                } ${!formData.total ? 'border-amber-300 bg-amber-50' : ''}`}
              />
            </div>

            {/* Método de pago */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Método de Pago</label>
              <select
                value={formData.metodo_pago || 'PUE'}
                onChange={(e) => handleChange('metodo_pago', e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing 
                    ? 'bg-white border-teal-300 focus:ring-2 focus:ring-teal-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="PUE">PUE - Pago en una sola exhibición</option>
                <option value="PPD">PPD - Pago en parcialidades</option>
              </select>
            </div>

            {/* Entrega confirmada */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="entrega_confirmada"
                checked={formData.entrega_confirmada || false}
                onChange={(e) => handleChange('entrega_confirmada', e.target.checked)}
                disabled={!isEditing}
                className="w-5 h-5 accent-teal-500"
              />
              <label htmlFor="entrega_confirmada" className="text-sm text-slate-700">
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
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-teal-200 transition-all"
          >
            <Check className="w-5 h-5" />
            Confirmar y Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;
