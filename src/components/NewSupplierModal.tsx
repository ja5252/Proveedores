// ============================================
// NUEVO PROVEEDOR MODAL - CORREGIDO CON SCROLL
// ============================================

import React, { useState, useEffect } from 'react';
import { 
  X, Check, Building2, CreditCard, Phone, Mail, 
  Sparkles, UserPlus, Package 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: SupplierFormData) => void;
  supplierName?: string;
  rfcEmisor?: string;
  insumo?: string;
  extractedData?: {
    telefono?: string;
    email?: string;
    direccion?: string;
  };
}

interface SupplierFormData {
  name: string;
  rfc: string;
  insumo: string;
  bank_name: string;
  bank_account: string;
  clabe: string;
  contact_email: string;
  contact_phone: string;
}

const NewSupplierModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  supplierName,
  rfcEmisor,
  insumo,
  extractedData
}) => {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    rfc: '',
    insumo: '',
    bank_name: '',
    bank_account: '',
    clabe: '',
    contact_email: '',
    contact_phone: ''
  });

  // Actualizar formData cuando cambien las props (datos extraídos)
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: supplierName || '',
        rfc: rfcEmisor || '',
        insumo: insumo || '',
        bank_name: '',
        bank_account: '',
        clabe: '',
        contact_email: extractedData?.email || '',
        contact_phone: extractedData?.telefono || ''
      });
    }
  }, [isOpen, supplierName, rfcEmisor, insumo, extractedData]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('El nombre del proveedor es requerido');
      return;
    }
    if (!formData.insumo.trim()) {
      alert('El insumo principal es requerido');
      return;
    }
    onSave(formData);
  };

  // Verificar si un campo fue auto-llenado
  const isAutoFilled = (field: string, value: string) => {
    if (!value) return false;
    switch (field) {
      case 'name': return value === supplierName;
      case 'rfc': return value === rfcEmisor;
      case 'insumo': return value === insumo;
      case 'contact_email': return value === extractedData?.email;
      case 'contact_phone': return value === extractedData?.telefono;
      default: return false;
    }
  };

  if (!isOpen) return null;

  return (
    // FIX: Overlay con overflow-y-auto para permitir scroll
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      {/* Contenedor centrado con padding */}
      <div className="min-h-full flex items-center justify-center p-4">
        {/* Modal con max-height y flex column */}
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col my-auto">
          
          {/* Header - fixed */}
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-violet-500 to-purple-500 rounded-t-3xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Nuevo Proveedor Detectado</h2>
                  <p className="text-violet-100 text-sm">¿Deseas agregarlo al catálogo?</p>
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

          {/* Form - scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Info box */}
            <div className="p-4 bg-violet-50 border border-violet-200 rounded-2xl">
              <p className="text-sm text-violet-700">
                <strong>"{supplierName}"</strong> no está registrado en tu catálogo de proveedores.
              </p>
              {(rfcEmisor || insumo) && (
                <p className="text-xs text-violet-500 mt-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Los campos con ✓ fueron detectados automáticamente de la factura
                </p>
              )}
            </div>

            {/* Nombre del proveedor */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Nombre del Proveedor *
                {isAutoFilled('name', formData.name) && (
                  <span className="ml-2 text-emerald-500 text-[10px] normal-case">✓ detectado</span>
                )}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all ${
                  isAutoFilled('name', formData.name) 
                    ? 'bg-emerald-50 border-emerald-300' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            {/* RFC e Insumo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  RFC
                  {isAutoFilled('rfc', formData.rfc) && (
                    <span className="ml-2 text-emerald-500 text-[10px] normal-case">✓ detectado</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.rfc}
                  onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                  maxLength={13}
                  className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-violet-200 uppercase transition-all ${
                    isAutoFilled('rfc', formData.rfc) 
                      ? 'bg-emerald-50 border-emerald-300' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  Insumo Principal *
                  {isAutoFilled('insumo', formData.insumo) && (
                    <span className="ml-2 text-emerald-500 text-[10px] normal-case">✓ detectado</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.insumo}
                  onChange={(e) => setFormData({ ...formData, insumo: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-violet-200 transition-all ${
                    isAutoFilled('insumo', formData.insumo) 
                      ? 'bg-emerald-50 border-emerald-300' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            {/* Teléfono y Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Teléfono
                  {isAutoFilled('contact_phone', formData.contact_phone) && (
                    <span className="ml-2 text-emerald-500 text-[10px] normal-case">✓ detectado</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-violet-200 transition-all ${
                    isAutoFilled('contact_phone', formData.contact_phone) 
                      ? 'bg-emerald-50 border-emerald-300' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                  {isAutoFilled('contact_email', formData.contact_email) && (
                    <span className="ml-2 text-emerald-500 text-[10px] normal-case">✓ detectado</span>
                  )}
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-violet-200 transition-all ${
                    isAutoFilled('contact_email', formData.contact_email) 
                      ? 'bg-emerald-50 border-emerald-300' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            {/* Datos bancarios */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Datos Bancarios (opcional)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Banco"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-sm"
                />
                <input
                  type="text"
                  placeholder="Cuenta"
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-sm"
                />
                <input
                  type="text"
                  placeholder="CLABE"
                  value={formData.clabe}
                  onChange={(e) => setFormData({ ...formData, clabe: e.target.value })}
                  maxLength={18}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Footer - fixed at bottom */}
          <div className="p-6 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-3xl flex-shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all"
            >
              Solo guardar factura
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              <Check className="w-5 h-5" />
              Agregar Proveedor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSupplierModal;
