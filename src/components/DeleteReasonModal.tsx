// ============================================
// MODAL DE ELIMINACIÓN CON MOTIVO
// ============================================

import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  itemType: 'factura' | 'remisión';
  itemDescription: string;
}

const COMMON_REASONS = [
  'Factura duplicada',
  'Error en el monto',
  'Proveedor incorrecto',
  'Fecha incorrecta',
  'Documento no válido',
  'Cancelada por el proveedor',
  'Error de captura',
  'Otro motivo'
];

const DeleteReasonModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemDescription
}) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    const finalReason = reason === 'Otro motivo' ? customReason : reason;
    if (!finalReason.trim()) {
      alert('Por favor selecciona o escribe un motivo de eliminación');
      return;
    }
    onConfirm(finalReason);
    setReason('');
    setCustomReason('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-rose-500 to-red-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Eliminar {itemType}</h2>
                <p className="text-rose-100 text-sm">Esta acción se puede revisar después</p>
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
        <div className="p-6 space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <p className="text-sm text-rose-700">
              Estás por eliminar: <strong>{itemDescription}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
              Motivo de eliminación *
            </label>
            <div className="space-y-2">
              {COMMON_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    reason === r
                      ? 'bg-rose-100 border-2 border-rose-400'
                      : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                    className="accent-rose-500"
                  />
                  <span className="text-sm text-slate-700">{r}</span>
                </label>
              ))}
            </div>
          </div>

          {reason === 'Otro motivo' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Especifica el motivo
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Escribe el motivo de eliminación..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 resize-none"
              />
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
            onClick={handleConfirm}
            disabled={!reason || (reason === 'Otro motivo' && !customReason.trim())}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5" />
            Confirmar Eliminación
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteReasonModal;
