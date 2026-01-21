// ============================================
// FORMULARIO DE CAMPOS FALTANTES
// ============================================

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, ChevronDown } from 'lucide-react';

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  initialData: Record<string, any>;
  documentType: 'invoice' | 'remission';
  missingFields: string[];
  title?: string;
}

const INVOICE_FIELDS: FieldConfig[] = [
  { key: 'date', label: 'Fecha', type: 'date', required: true },
  { key: 'supplier_name', label: 'Proveedor', type: 'text', required: true },
  { key: 'rfc_emisor', label: 'RFC Emisor', type: 'text', required: false },
  { key: 'folio', label: 'Folio', type: 'text', required: false },
  { key: 'serie', label: 'Serie', type: 'text', required: false },
  { key: 'uuid', label: 'UUID (CFDI)', type: 'text', required: false },
  { key: 'insumo', label: 'Concepto/Descripción', type: 'text', required: true },
  { key: 'amount_net', label: 'Subtotal', type: 'number', required: true },
  { key: 'iva', label: 'IVA', type: 'number', required: true },
  { key: 'total', label: 'Total', type: 'number', required: true },
  { key: 'payment_method', label: 'Método de Pago', type: 'select', required: false, options: ['PUE', 'PPD'] },
  { key: 'cfdi_use', label: 'Uso CFDI', type: 'select', required: false, options: ['G01', 'G02', 'G03', 'I01', 'I02', 'I03', 'I04', 'I05', 'I06', 'I07', 'I08', 'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'P01', 'S01', 'CP01', 'CN01'] },
];

const REMISSION_FIELDS: FieldConfig[] = [
  { key: 'date', label: 'Fecha', type: 'date', required: true },
  { key: 'supplier_name', label: 'Proveedor', type: 'text', required: true },
  { key: 'nota_numero', label: 'Número de Nota', type: 'text', required: false },
  { key: 'commodity_type', label: 'Tipo de Producto', type: 'text', required: true },
  { key: 'amount', label: 'Monto Total', type: 'number', required: true },
  { key: 'telefono', label: 'Teléfono Proveedor', type: 'text', required: false },
  { key: 'direccion', label: 'Dirección', type: 'text', required: false },
];

const MissingFieldsForm: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  documentType,
  missingFields,
  title
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  const fields = documentType === 'invoice' ? INVOICE_FIELDS : REMISSION_FIELDS;

  useEffect(() => {
    setFormData({ ...initialData });
  }, [initialData]);

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    
    // Auto-calcular IVA y Total si es factura
    if (documentType === 'invoice') {
      if (key === 'amount_net') {
        const subtotal = Number(value) || 0;
        setFormData(prev => ({
          ...prev,
          amount_net: subtotal,
          iva: subtotal * 0.16,
          total: subtotal * 1.16
        }));
      }
    }
  };

  const handleSubmit = () => {
    // Validar campos requeridos
    const requiredFields = fields.filter(f => f.required);
    const stillMissing = requiredFields.filter(f => !formData[f.key] && formData[f.key] !== 0);
    
    if (stillMissing.length > 0) {
      alert(`Faltan campos requeridos: ${stillMissing.map(f => f.label).join(', ')}`);
      return;
    }
    
    onSave(formData);
  };

  const isMissing = (key: string) => missingFields.includes(key);
  const isEmpty = (key: string) => !formData[key] && formData[key] !== 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{title || 'Completar Información'}</h2>
                <p className="text-amber-100 text-sm">
                  {missingFields.length} campo(s) requieren atención
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

        {/* Form */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(field => {
              const missing = isMissing(field.key);
              const empty = isEmpty(field.key);
              const highlight = missing || (field.required && empty);
              
              return (
                <div 
                  key={field.key}
                  className={`${field.key === 'insumo' || field.key === 'direccion' ? 'md:col-span-2' : ''}`}
                >
                  <label className={`block text-xs font-bold uppercase mb-2 ${
                    highlight ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    {field.label}
                    {field.required && <span className="text-rose-500 ml-1">*</span>}
                    {missing && (
                      <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] normal-case">
                        Faltante
                      </span>
                    )}
                  </label>
                  
                  {field.type === 'select' ? (
                    <div className="relative">
                      <select
                        value={formData[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border appearance-none cursor-pointer ${
                          highlight 
                            ? 'border-amber-400 bg-amber-50 focus:ring-amber-200' 
                            : 'border-slate-200 bg-slate-50 focus:ring-teal-200'
                        } outline-none focus:ring-2`}
                      >
                        <option value="">Seleccionar...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        highlight 
                          ? 'border-amber-400 bg-amber-50 focus:ring-amber-200' 
                          : 'border-slate-200 bg-slate-50 focus:ring-teal-200'
                      } outline-none focus:ring-2`}
                      placeholder={field.label}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Preview de datos extraídos */}
          {initialData.ai_extracted_data && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <p className="text-xs text-blue-600 font-bold uppercase mb-2">
                Datos extraídos por IA (referencia)
              </p>
              <pre className="text-xs text-blue-800 overflow-auto max-h-32">
                {JSON.stringify(initialData.ai_extracted_data, null, 2)}
              </pre>
            </div>
          )}
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
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            <Check className="w-5 h-5" />
            Guardar Documento
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingFieldsForm;
