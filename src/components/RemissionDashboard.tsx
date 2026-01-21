// ============================================
// REMISSION DASHBOARD - PANEL DE REMISIONES
// ============================================

import { useState, useMemo } from 'react';
import { Remission } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Search, Package, CheckCircle, Trash2, 
  FileDown, Image, Eye, X, DollarSign, Clock
} from 'lucide-react';
import RemissionUploader from './RemissionUploader';

interface Props {
  remissions: Remission[];
  onUpdate: (remissions: Remission[]) => void;
  onDownloadFile: (remission: Remission) => void;
  companyId?: string;
}

const RemissionDashboard: React.FC<Props> = ({ remissions, onUpdate, onDownloadFile, companyId }) => {
  const [filter, setFilter] = useState('');
  const [showUploader, setShowUploader] = useState(false);
  const [selectedRemission, setSelectedRemission] = useState<Remission | null>(null);

  const filteredRemissions = useMemo(() => {
    return remissions.filter(rem =>
      rem.supplier_name.toLowerCase().includes(filter.toLowerCase()) ||
      rem.commodity_type.toLowerCase().includes(filter.toLowerCase())
    );
  }, [remissions, filter]);

  const stats = useMemo(() => {
    const total = filteredRemissions.reduce((acc, rem) => acc + Number(rem.amount), 0);
    const confirmed = filteredRemissions.filter(r => r.reception_confirmed).length;
    const pending = filteredRemissions.length - confirmed;
    return { total, count: filteredRemissions.length, confirmed, pending };
  }, [filteredRemissions]);

  const handleToggleReception = async (remission: Remission) => {
    try {
      const { data, error } = await supabase
        .from('remissions')
        .update({ 
          reception_confirmed: !remission.reception_confirmed,
          updated_at: new Date().toISOString()
        })
        .eq('id', remission.id)
        .select()
        .single();

      if (error) throw error;
      onUpdate(remissions.map(r => r.id === remission.id ? data : r));
    } catch (error) {
      console.error('Error updating remission:', error);
    }
  };

  const handleTogglePayment = async (remission: Remission) => {
    const newStatus = remission.status === 'Pagado' ? 'Pendiente' : 'Pagado';
    const paymentDate = newStatus === 'Pagado' ? new Date().toISOString().split('T')[0] : null;
    
    try {
      const { data, error } = await supabase
        .from('remissions')
        .update({ 
          status: newStatus,
          payment_date: paymentDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', remission.id)
        .select()
        .single();

      if (error) throw error;
      onUpdate(remissions.map(r => r.id === remission.id ? data : r));
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const handleDelete = async (remission: Remission) => {
    if (!confirm('¿Eliminar esta remisión?')) return;
    
    try {
      const { error } = await supabase
        .from('remissions')
        .delete()
        .eq('id', remission.id);

      if (error) throw error;
      onUpdate(remissions.filter(r => r.id !== remission.id));
    } catch (error) {
      console.error('Error deleting remission:', error);
    }
  };

  const handleSaveRemission = async (data: any) => {
    try {
      const { data: newRemission, error } = await supabase
        .from('remissions')
        .insert({
          company_id: companyId,
          date: data.date || new Date().toISOString().split('T')[0],
          supplier_name: data.supplier_name || 'Sin proveedor',
          commodity_type: data.commodity_type || 'General',
          amount: data.amount || 0,
          status: 'Pendiente',
          reception_confirmed: false,
          ai_extracted_data: data.ai_extracted_data
        })
        .select()
        .single();

      if (error) throw error;
      
      onUpdate([newRemission, ...remissions]);
      setShowUploader(false);
      alert('✅ Remisión guardada correctamente');
    } catch (error: any) {
      console.error('Error saving remission:', error);
      alert('Error al guardar: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-500 rounded-xl shadow-lg shadow-slate-200">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Total</p>
              <p className="text-2xl font-black text-slate-800">{stats.count}</p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg shadow-blue-200">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium uppercase">Monto Total</p>
              <p className="text-xl font-black text-blue-700">
                ${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-200">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-medium uppercase">Confirmadas</p>
              <p className="text-2xl font-black text-emerald-700">{stats.confirmed}</p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 rounded-xl shadow-lg shadow-amber-200">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-amber-600 font-medium uppercase">Pendientes</p>
              <p className="text-2xl font-black text-amber-700">{stats.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por proveedor o tipo..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400"
          />
        </div>

        <button
          onClick={() => setShowUploader(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
        >
          <Image className="w-5 h-5" />
          Cargar desde Foto
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">Fecha</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">Proveedor</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase">Tipo</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-500 uppercase">Monto</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase">Recepción</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase">Estado</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRemissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No hay remisiones registradas</p>
                    <button
                      onClick={() => setShowUploader(true)}
                      className="mt-4 px-4 py-2 bg-teal-100 text-teal-700 rounded-lg font-medium hover:bg-teal-200 transition-all"
                    >
                      Cargar primera remisión
                    </button>
                  </td>
                </tr>
              ) : (
                filteredRemissions.map(remission => (
                  <tr key={remission.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-slate-800">
                        {new Date(remission.date).toLocaleDateString('es-MX')}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-slate-800">{remission.supplier_name}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-600">{remission.commodity_type}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-bold text-slate-800">
                        ${Number(remission.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleToggleReception(remission)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          remission.reception_confirmed
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        {remission.reception_confirmed ? 'Confirmada' : 'Pendiente'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleTogglePayment(remission)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          remission.status === 'Pagado'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {remission.status}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {remission.file_url && (
                          <button
                            onClick={() => onDownloadFile(remission)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Descargar archivo"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedRemission(remission)}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(remission)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remission Uploader Modal */}
      <RemissionUploader
        isOpen={showUploader}
        onClose={() => setShowUploader(false)}
        onSave={handleSaveRemission}
      />

      {/* Detail Modal */}
      {selectedRemission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">Detalle de Remisión</h2>
              <button
                onClick={() => setSelectedRemission(null)}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Proveedor</p>
                  <p className="text-slate-800 font-medium">{selectedRemission.supplier_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Fecha</p>
                  <p className="text-slate-800 font-medium">
                    {new Date(selectedRemission.date).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Tipo</p>
                  <p className="text-slate-800 font-medium">{selectedRemission.commodity_type}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Monto</p>
                  <p className="text-slate-800 font-bold">
                    ${Number(selectedRemission.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* AI extracted data */}
              {selectedRemission.ai_extracted_data && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <p className="text-xs text-blue-600 uppercase font-bold mb-2">
                    Datos extraídos por IA
                  </p>
                  <pre className="text-xs text-blue-800 overflow-auto max-h-64">
                    {JSON.stringify(selectedRemission.ai_extracted_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemissionDashboard;
