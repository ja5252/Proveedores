// ============================================
// VISTA RÁPIDA DE PROVEEDOR
// ============================================

import { useMemo } from 'react';
import { Invoice, Supplier } from '../types';
import {
  X, Building2, Phone, Mail, CreditCard, FileText,
  DollarSign, TrendingUp, Calendar, Package
} from 'lucide-react';

interface Props {
  supplier: Supplier | null;
  supplierName: string;
  invoices: Invoice[];
  isOpen: boolean;
  onClose: () => void;
}

const SupplierQuickView: React.FC<Props> = ({ supplier, supplierName, invoices, isOpen, onClose }) => {
  const supplierInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.supplier_name === supplierName || inv.supplier_id === supplier?.id
    );
  }, [invoices, supplierName, supplier]);

  const stats = useMemo(() => {
    const total = supplierInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const pagado = supplierInvoices.filter(inv => inv.status === 'Pagado').reduce((sum, inv) => sum + Number(inv.total), 0);
    const pendiente = total - pagado;
    const numFacturas = supplierInvoices.length;
    const ultimaFactura = supplierInvoices.length > 0 
      ? supplierInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;
    const productosUnicos = new Set(supplierInvoices.map(inv => inv.insumo)).size;

    return { total, pagado, pendiente, numFacturas, ultimaFactura, productosUnicos };
  }, [supplierInvoices]);

  const recentInvoices = useMemo(() => {
    return [...supplierInvoices]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [supplierInvoices]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-violet-500 to-purple-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{supplierName}</h2>
                {supplier?.rfc && (
                  <p className="text-violet-200 text-sm">RFC: {supplier.rfc}</p>
                )}
                {supplier?.insumo && (
                  <p className="text-violet-200 text-sm">{supplier.insumo}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-auto max-h-[60vh]">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-2xl text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <p className="text-2xl font-black text-slate-800">{stats.numFacturas}</p>
              <p className="text-xs text-slate-500">Facturas</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
              <p className="text-lg font-black text-emerald-700">
                ${stats.pagado.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-emerald-600">Pagado</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              <p className="text-lg font-black text-amber-700">
                ${stats.pendiente.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-amber-600">Pendiente</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl text-center">
              <Package className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-black text-blue-700">{stats.productosUnicos}</p>
              <p className="text-xs text-blue-600">Productos</p>
            </div>
          </div>

          {/* Balance Bar */}
          {stats.total > 0 && (
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Balance total</span>
                <span className="font-bold text-slate-800">
                  ${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-4 bg-slate-200 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                  style={{ width: `${(stats.pagado / stats.total) * 100}%` }}
                />
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                  style={{ width: `${(stats.pendiente / stats.total) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-emerald-600">
                  Pagado: {((stats.pagado / stats.total) * 100).toFixed(0)}%
                </span>
                <span className="text-amber-600">
                  Pendiente: {((stats.pendiente / stats.total) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Contact Info */}
          {supplier && (
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
              <h3 className="font-bold text-slate-700 mb-3">Información de Contacto</h3>
              <div className="grid grid-cols-2 gap-3">
                {supplier.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {supplier.contact_phone}
                  </div>
                )}
                {supplier.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {supplier.contact_email}
                  </div>
                )}
                {supplier.bank_name && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    {supplier.bank_name}: {supplier.bank_account}
                  </div>
                )}
                {supplier.clabe && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    CLABE: {supplier.clabe}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Invoices */}
          <div>
            <h3 className="font-bold text-slate-700 mb-3">Últimas Facturas</h3>
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No hay facturas registradas
              </p>
            ) : (
              <div className="space-y-2">
                {recentInvoices.map(inv => (
                  <div 
                    key={inv.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <Calendar className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {inv.folio ? `Folio ${inv.folio}` : inv.insumo}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(inv.date).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">
                        ${Number(inv.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-xs font-medium ${
                        inv.status === 'Pagado' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierQuickView;
