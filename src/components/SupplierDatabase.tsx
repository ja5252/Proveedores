// ============================================
// SUPPLIER DATABASE - CATÁLOGO CON IMPORT/EXPORT
// ============================================

import React, { useState, useMemo, useRef } from 'react';
import { Supplier, Invoice } from '../types';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { 
  Search, Plus, Edit2, Trash2, Building2, CreditCard, 
  Phone, Mail, X, Check, Download, Upload, FileSpreadsheet
} from 'lucide-react';

interface Props {
  suppliers: Supplier[];
  invoices: Invoice[];
  onUpdate: (suppliers: Supplier[]) => void;
  companyId: string;
}

const SupplierDatabase: React.FC<Props> = ({ 
  suppliers, 
  invoices, 
  onUpdate,
  companyId 
}) => {
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    rfc: '',
    insumo: '',
    bank_name: '',
    bank_account: '',
    clabe: '',
    contact_email: '',
    contact_phone: '',
    payment_term: '30 días'
  });

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(sup =>
      sup.name.toLowerCase().includes(filter.toLowerCase()) ||
      (sup.rfc && sup.rfc.toLowerCase().includes(filter.toLowerCase())) ||
      sup.insumo.toLowerCase().includes(filter.toLowerCase())
    );
  }, [suppliers, filter]);

  const supplierBalances = useMemo(() => {
    const balances: Record<string, { total: number; paid: number; pending: number; invoiceCount: number }> = {};
    
    invoices.forEach(inv => {
      const key = inv.supplier_name.toLowerCase();
      if (!balances[key]) {
        balances[key] = { total: 0, paid: 0, pending: 0, invoiceCount: 0 };
      }
      balances[key].total += inv.total;
      balances[key].invoiceCount++;
      if (inv.status === 'Pagado') {
        balances[key].paid += inv.total;
      } else {
        balances[key].pending += inv.total;
      }
    });
    
    return balances;
  }, [invoices]);

  const resetForm = () => {
    setFormData({
      name: '',
      rfc: '',
      insumo: '',
      bank_name: '',
      bank_account: '',
      clabe: '',
      contact_email: '',
      contact_phone: '',
      payment_term: '30 días'
    });
    setEditingSupplier(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSupplier) {
        const { data, error } = await supabase
          .from('suppliers')
          .update(formData)
          .eq('id', editingSupplier.id)
          .select()
          .single();
        
        if (error) throw error;
        onUpdate(suppliers.map(s => s.id === editingSupplier.id ? data : s));
      } else {
        const { data, error } = await supabase
          .from('suppliers')
          .insert({ ...formData, company_id: companyId })
          .select()
          .single();
        
        if (error) throw error;
        onUpdate([data, ...suppliers]);
      }
      
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Error al guardar el proveedor');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      rfc: supplier.rfc || '',
      insumo: supplier.insumo,
      bank_name: supplier.bank_name || '',
      bank_account: supplier.bank_account || '',
      clabe: supplier.clabe || '',
      contact_email: supplier.contact_email || '',
      contact_phone: supplier.contact_phone || '',
      payment_term: '30 días'
    });
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`¿Eliminar al proveedor "${supplier.name}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplier.id);
      
      if (error) throw error;
      onUpdate(suppliers.filter(s => s.id !== supplier.id));
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Error al eliminar el proveedor');
    }
  };

  // Descargar plantilla Excel vacía
  const handleDownloadTemplate = () => {
    const template = [
      {
        'Razón Social': 'Proveedor Ejemplo SA de CV',
        'RFC': 'PEJ123456789',
        'Insumo/Categoría': 'Materiales',
        'Plazo de Pago': '30 días',
        'Banco': 'BBVA',
        'Número de Cuenta': '0123456789',
        'CLABE': '012345678901234567',
        'Email': 'contacto@proveedor.com',
        'Teléfono': '55 1234 5678'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    
    // Ajustar anchos de columna
    worksheet['!cols'] = [
      { wch: 30 }, // Razón Social
      { wch: 15 }, // RFC
      { wch: 20 }, // Insumo
      { wch: 15 }, // Plazo
      { wch: 15 }, // Banco
      { wch: 20 }, // Cuenta
      { wch: 20 }, // CLABE
      { wch: 25 }, // Email
      { wch: 15 }  // Teléfono
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Proveedores");
    
    XLSX.writeFile(workbook, 'Plantilla_Proveedores_Logan.xlsx');
  };

  // Exportar proveedores actuales
  const handleExport = () => {
    const dataForExport = suppliers.map(sup => {
      const balance = supplierBalances[sup.name.toLowerCase()] || { total: 0, paid: 0, pending: 0, invoiceCount: 0 };
      return {
        'Razón Social': sup.name,
        'RFC': sup.rfc || '',
        'Insumo/Categoría': sup.insumo,
        'Banco': sup.bank_name || '',
        'Número de Cuenta': sup.bank_account || '',
        'CLABE': sup.clabe || '',
        'Email': sup.contact_email || '',
        'Teléfono': sup.contact_phone || '',
        'Total Facturas': balance.invoiceCount,
        'Total Facturado': balance.total,
        'Pagado': balance.paid,
        'Pendiente': balance.pending
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Proveedores");
    
    XLSX.writeFile(workbook, `Proveedores_Logan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Importar proveedores desde Excel
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

        const newSuppliers: Partial<Supplier>[] = [];
        const existingNames = new Set(suppliers.map(s => s.name.toLowerCase()));
        let skipped = 0;

        for (const row of json) {
          const name = row['Razón Social'] || row['Razon Social'] || row['Nombre'] || row.name || '';
          if (!name) continue;

          if (existingNames.has(name.toLowerCase())) {
            skipped++;
            continue;
          }

          newSuppliers.push({
            company_id: companyId,
            name: name,
            rfc: row['RFC'] || row.rfc || '',
            insumo: row['Insumo/Categoría'] || row['Insumo'] || row['Categoria'] || row.insumo || 'General',
            bank_name: row['Banco'] || row.bank_name || '',
            bank_account: row['Número de Cuenta'] || row['Cuenta'] || row.bank_account || '',
            clabe: row['CLABE'] || row.clabe || '',
            contact_email: row['Email'] || row['Correo'] || row.contact_email || '',
            contact_phone: row['Teléfono'] || row['Telefono'] || row.contact_phone || ''
          });
        }

        if (newSuppliers.length === 0) {
          alert(skipped > 0 
            ? `Todos los proveedores (${skipped}) ya existen en el sistema.`
            : 'No se encontraron proveedores válidos en el archivo.');
          if (importInputRef.current) importInputRef.current.value = '';
          return;
        }

        // Confirmar importación
        const confirmMsg = skipped > 0
          ? `Se importarán ${newSuppliers.length} proveedores nuevos.\n(${skipped} ya existían y serán omitidos)\n\n¿Continuar?`
          : `Se importarán ${newSuppliers.length} proveedores.\n\n¿Continuar?`;
        
        if (!confirm(confirmMsg)) {
          if (importInputRef.current) importInputRef.current.value = '';
          return;
        }

        // Insertar en base de datos
        const { data: insertedData, error } = await supabase
          .from('suppliers')
          .insert(newSuppliers)
          .select();

        if (error) throw error;

        onUpdate([...insertedData, ...suppliers]);
        alert(`✅ Se importaron ${insertedData.length} proveedores correctamente.`);

      } catch (err) {
        console.error('Import error:', err);
        alert('Error al procesar el archivo Excel.');
      }
    };
    
    reader.readAsBinaryString(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl border border-teal-200">
          <p className="text-xs font-bold text-teal-600 uppercase">Proveedores</p>
          <p className="text-3xl font-black text-teal-800">{suppliers.length}</p>
        </div>
        <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
          <p className="text-xs font-bold text-blue-600 uppercase">Con Facturas</p>
          <p className="text-3xl font-black text-blue-800">
            {Object.keys(supplierBalances).length}
          </p>
        </div>
        <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border border-emerald-200">
          <p className="text-xs font-bold text-emerald-600 uppercase">Total Pagado</p>
          <p className="text-xl font-black text-emerald-800">
            ${Object.values(supplierBalances).reduce((a, b) => a + b.paid, 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="p-5 bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl border border-rose-200">
          <p className="text-xs font-bold text-rose-600 uppercase">Por Pagar</p>
          <p className="text-xl font-black text-rose-800">
            ${Object.values(supplierBalances).reduce((a, b) => a + b.pending, 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar proveedor, RFC o insumo..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Plantilla
            </button>
            
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all cursor-pointer shadow-lg shadow-blue-200">
              <Upload className="w-4 h-4" />
              Importar
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold hover:bg-teal-600 transition-all shadow-lg shadow-teal-200"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map(supplier => {
          const balance = supplierBalances[supplier.name.toLowerCase()] || { total: 0, paid: 0, pending: 0, invoiceCount: 0 };
          
          return (
            <div
              key={supplier.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden hover:shadow-xl transition-all group"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {supplier.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{supplier.name}</h3>
                      <p className="text-xs text-teal-600 font-medium">{supplier.insumo}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="p-2 hover:bg-teal-50 rounded-lg text-slate-400 hover:text-teal-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier)}
                      className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-2 text-sm">
                {supplier.rfc && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="font-mono">{supplier.rfc}</span>
                  </div>
                )}
                {supplier.bank_name && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span>{supplier.bank_name}: {supplier.bank_account}</span>
                  </div>
                )}
                {supplier.clabe && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="font-mono text-xs">CLABE: {supplier.clabe}</span>
                  </div>
                )}
                {supplier.contact_email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{supplier.contact_email}</span>
                  </div>
                )}
                {supplier.contact_phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{supplier.contact_phone}</span>
                  </div>
                )}
              </div>

              {/* Balance */}
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold">Facturas</p>
                    <p className="text-lg font-black text-slate-900">{balance.invoiceCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 uppercase font-bold">Pagado</p>
                    <p className="text-sm font-bold text-emerald-600">${balance.paid.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-rose-600 uppercase font-bold">Pendiente</p>
                    <p className="text-sm font-bold text-rose-600">${balance.pending.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No hay proveedores</p>
          <p className="text-slate-400 text-sm mb-4">Descarga la plantilla, llénala e impórtala</p>
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold hover:bg-teal-600"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Descargar Plantilla
          </button>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">
                {editingSupplier ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">RFC</label>
                  <input
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                    maxLength={13}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-100 uppercase"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Insumo / Categoría *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.insumo}
                    onChange={(e) => setFormData({ ...formData, insumo: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Banco</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cuenta</label>
                  <input
                    type="text"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CLABE</label>
                  <input
                    type="text"
                    value={formData.clabe}
                    onChange={(e) => setFormData({ ...formData, clabe: e.target.value })}
                    maxLength={18}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-100 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600"
                >
                  <Check className="w-5 h-5" />
                  {editingSupplier ? 'Guardar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDatabase;
