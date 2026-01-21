// ============================================
// ESTADO DE CUENTA POR PROVEEDOR
// ============================================

import { useState, useMemo } from 'react';
import { Invoice, Supplier } from '../types';
import * as XLSX from 'xlsx';
import {
  Calendar, Download, FileSpreadsheet, TrendingUp, TrendingDown,
  DollarSign, FileText, ChevronDown, X, Filter
} from 'lucide-react';

interface Props {
  invoices: Invoice[];
  suppliers: Supplier[];
  isOpen: boolean;
  onClose: () => void;
}

const SupplierStatement: React.FC<Props> = ({ invoices, isOpen, onClose }) => {
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Obtener proveedores únicos de las facturas
  const uniqueSuppliers = useMemo(() => {
    const names = new Set(invoices.map(inv => inv.supplier_name));
    return Array.from(names).sort();
  }, [invoices]);

  // Filtrar facturas por proveedor y rango de fechas
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (selectedSupplier && inv.supplier_name !== selectedSupplier) return false;
      if (dateFrom && inv.date < dateFrom) return false;
      if (dateTo && inv.date > dateTo) return false;
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [invoices, selectedSupplier, dateFrom, dateTo]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const pagado = filteredInvoices.filter(inv => inv.status === 'Pagado').reduce((sum, inv) => sum + Number(inv.total), 0);
    const pendiente = total - pagado;
    const numFacturas = filteredInvoices.length;
    const numPagadas = filteredInvoices.filter(inv => inv.status === 'Pagado').length;

    return { total, pagado, pendiente, numFacturas, numPagadas };
  }, [filteredInvoices]);

  // Calcular saldo acumulado
  const invoicesWithBalance = useMemo(() => {
    let balance = 0;
    return filteredInvoices.map(inv => {
      balance += Number(inv.total);
      if (inv.status === 'Pagado') {
        balance -= Number(inv.total);
      }
      return { ...inv, balance };
    });
  }, [filteredInvoices]);

  // Exportar a Excel formateado
  const exportToExcel = () => {
    if (!selectedSupplier) {
      alert('Selecciona un proveedor primero');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Datos del estado de cuenta
    const data = [
      ['ESTADO DE CUENTA'],
      [''],
      ['Proveedor:', selectedSupplier],
      ['Periodo:', `${dateFrom || 'Inicio'} al ${dateTo || 'Actual'}`],
      ['Fecha de generación:', new Date().toLocaleDateString('es-MX')],
      [''],
      ['RESUMEN'],
      ['Total Facturado:', stats.total],
      ['Total Pagado:', stats.pagado],
      ['Saldo Pendiente:', stats.pendiente],
      ['Número de Facturas:', stats.numFacturas],
      [''],
      ['DETALLE DE MOVIMIENTOS'],
      ['Fecha', 'Folio', 'Serie', 'Concepto', 'Subtotal', 'IVA', 'Total', 'Estado', 'Fecha Pago', 'Saldo Acumulado'],
      ...invoicesWithBalance.map(inv => [
        inv.date,
        inv.folio || '-',
        inv.serie || '-',
        inv.insumo,
        inv.amount_net,
        inv.iva,
        inv.total,
        inv.status,
        inv.payment_date || '-',
        inv.balance
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 30 },
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }
    ];

    // Combinar celdas del título
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Estado de Cuenta');
    XLSX.writeFile(wb, `Estado_Cuenta_${selectedSupplier.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-teal-500 to-emerald-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Estado de Cuenta</h2>
                <p className="text-teal-100 text-sm">Consulta el historial por proveedor</p>
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

        {/* Filtros */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Proveedor
              </label>
              <div className="relative">
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl appearance-none cursor-pointer focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                >
                  <option value="">Todos los proveedores</option>
                  {uniqueSuppliers.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="min-w-[150px]">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Desde
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Hasta
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                />
              </div>
            </div>

            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
            >
              <Download className="w-5 h-5" />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border-b border-slate-100">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-xl">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Facturas</p>
                <p className="text-2xl font-black text-blue-700">{stats.numFacturas}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-500 rounded-xl">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium">Total Facturado</p>
                <p className="text-xl font-black text-slate-700">
                  ${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Pagado</p>
                <p className="text-xl font-black text-emerald-700">
                  ${stats.pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-xl">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Pendiente</p>
                <p className="text-xl font-black text-amber-700">
                  ${stats.pendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de barras simple */}
        {stats.total > 0 && (
          <div className="px-6 py-4 bg-white border-b border-slate-100">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 w-20">Pagado</span>
              <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.pagado / stats.total) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-emerald-600 w-16 text-right">
                {((stats.pagado / stats.total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-slate-500 w-20">Pendiente</span>
              <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.pendiente / stats.total) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-amber-600 w-16 text-right">
                {((stats.pendiente / stats.total) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Tabla de movimientos */}
        <div className="flex-1 overflow-auto p-6">
          {invoicesWithBalance.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Filter className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Selecciona un proveedor para ver el estado de cuenta</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Folio</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Concepto</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Subtotal</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">IVA</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoicesWithBalance.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(inv.date).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-800">
                      {inv.folio || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {inv.insumo}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      ${Number(inv.amount_net).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">
                      ${Number(inv.iva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-slate-800">
                      ${Number(inv.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        inv.status === 'Pagado'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-bold ${
                      inv.balance > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      ${inv.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierStatement;
