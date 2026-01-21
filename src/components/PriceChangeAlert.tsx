// ============================================
// ALERTA DE CAMBIO DE PRECIO
// ============================================

import { X, AlertTriangle, TrendingUp, TrendingDown, Check, Ban } from 'lucide-react';

interface PriceChange {
  codigo: string;
  producto: string;
  precioAnterior: number;
  precioNuevo: number;
  diferencia: number;
  porcentaje: number;
  fechaAnterior: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  priceChanges: PriceChange[];
  supplierName: string;
}

const PriceChangeAlert: React.FC<Props> = ({
  isOpen,
  onClose,
  onApprove,
  onReject,
  priceChanges,
  supplierName
}) => {
  if (!isOpen || priceChanges.length === 0) return null;

  const totalImpact = priceChanges.reduce((sum, pc) => sum + pc.diferencia, 0);
  const hasIncrease = priceChanges.some(pc => pc.diferencia > 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className={`p-6 border-b border-slate-200 ${
          hasIncrease ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">¡Cambio de Precios Detectado!</h2>
                <p className="text-white/80 text-sm">{supplierName}</p>
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
        <div className="p-6">
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <p className="text-amber-800 text-sm">
              Se detectaron <strong>{priceChanges.length} producto(s)</strong> con cambios de precio 
              respecto a entregas anteriores del mismo proveedor.
            </p>
          </div>

          {/* Price changes table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden mb-4">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Producto</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Anterior</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Nuevo</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Cambio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priceChanges.map((pc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">{pc.codigo}</td>
                    <td className="px-4 py-3 text-sm text-slate-800 truncate max-w-[150px]">{pc.producto}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      ${pc.precioAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-slate-800">
                      ${pc.precioNuevo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {pc.diferencia > 0 ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-rose-500" />
                            <span className="text-sm font-bold text-rose-600">
                              +{pc.porcentaje.toFixed(1)}%
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-bold text-emerald-600">
                              {pc.porcentaje.toFixed(1)}%
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Último: {pc.fechaAnterior}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Impact summary */}
          <div className={`p-4 rounded-2xl ${
            totalImpact > 0 
              ? 'bg-rose-50 border border-rose-200' 
              : 'bg-emerald-50 border border-emerald-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${
                totalImpact > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                Impacto total estimado:
              </span>
              <span className={`text-lg font-black ${
                totalImpact > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {totalImpact > 0 ? '+' : ''}${totalImpact.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={onReject}
            className="flex items-center gap-2 px-6 py-3 bg-rose-100 text-rose-700 font-bold rounded-xl hover:bg-rose-200 transition-all"
          >
            <Ban className="w-5 h-5" />
            Rechazar Cambios
          </button>
          <button
            onClick={onApprove}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            <Check className="w-5 h-5" />
            Aprobar Nuevos Precios
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceChangeAlert;
