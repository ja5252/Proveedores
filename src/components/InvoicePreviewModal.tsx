// ============================================
// INVOICE PREVIEW MODAL - TABLA EDITABLE MULTILÍNEA
// CON DESCARGA PDF VS ORIGINAL
// ============================================

import { useState, useEffect } from 'react';
import { 
  X, Check, Edit2, AlertTriangle, Building2, Calendar,
  FileText, DollarSign, Hash, Plus, Trash2, Download,
  FileImage, FilePlus, Table
} from 'lucide-react';

interface ConceptoRow {
  id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  importe: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  extractedData: any;
  documentType: 'invoice' | 'remission';
  fileName: string;
  originalFileUrl?: string; // URL del archivo original para descarga
  originalFile?: File; // Archivo original para descarga
}

const InvoicePreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  extractedData,
  documentType,
  fileName,
  originalFileUrl,
  originalFile
}) => {
  const [formData, setFormData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [conceptos, setConceptos] = useState<ConceptoRow[]>([]);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

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
        concepto: extractedData.conceptos?.[0]?.descripcion || extractedData.concepto || '',
        subtotal: extractedData.subtotal || extractedData.amount_net || 0,
        iva: extractedData.iva || 0,
        total: extractedData.total || 0,
        metodo_pago: extractedData.metodo_pago || 'PUE',
        entrega_confirmada: extractedData.tiene_firma_recepcion || false
      });

      // Inicializar conceptos/líneas
      if (extractedData.conceptos && Array.isArray(extractedData.conceptos)) {
        const rows: ConceptoRow[] = extractedData.conceptos.map((c: any, index: number) => ({
          id: `row-${index}`,
          descripcion: c.descripcion || '',
          cantidad: c.cantidad || 1,
          unidad: c.unidad || 'PZA',
          precio_unitario: c.valor_unitario || c.precio_unitario || 0,
          importe: c.importe || (c.cantidad || 1) * (c.valor_unitario || c.precio_unitario || 0)
        }));
        setConceptos(rows);
      } else {
        // Si no hay conceptos, crear una fila vacía
        setConceptos([{
          id: 'row-0',
          descripcion: extractedData.concepto || '',
          cantidad: 1,
          unidad: 'PZA',
          precio_unitario: extractedData.total || 0,
          importe: extractedData.total || 0
        }]);
      }
    }
  }, [extractedData]);

  // Recalcular totales cuando cambian los conceptos
  useEffect(() => {
    if (conceptos.length > 0) {
      const subtotal = conceptos.reduce((sum, c) => sum + (c.importe || 0), 0);
      const iva = subtotal * 0.16;
      const total = subtotal + iva;
      
      setFormData((prev: any) => ({
        ...prev,
        subtotal: Math.round(subtotal * 100) / 100,
        iva: Math.round(iva * 100) / 100,
        total: Math.round(total * 100) / 100
      }));
    }
  }, [conceptos]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calcular si es remisión y cambia el total directamente
      if (field === 'total' && documentType === 'remission') {
        // No recalcular para remisiones
      }
      
      return updated;
    });
  };

  // ========== FUNCIONES PARA TABLA DE CONCEPTOS ==========
  
  const addRow = () => {
    setConceptos(prev => [...prev, {
      id: `row-${Date.now()}`,
      descripcion: '',
      cantidad: 1,
      unidad: 'PZA',
      precio_unitario: 0,
      importe: 0
    }]);
  };

  const removeRow = (id: string) => {
    if (conceptos.length > 1) {
      setConceptos(prev => prev.filter(c => c.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof ConceptoRow, value: any) => {
    setConceptos(prev => prev.map(c => {
      if (c.id !== id) return c;
      
      const updated = { ...c, [field]: value };
      
      // Recalcular importe si cambia cantidad o precio
      if (field === 'cantidad' || field === 'precio_unitario') {
        updated.importe = Math.round((updated.cantidad || 0) * (updated.precio_unitario || 0) * 100) / 100;
      }
      
      return updated;
    }));
  };

  // ========== FUNCIONES DE DESCARGA ==========

  const downloadOriginal = () => {
    if (originalFile) {
      const url = URL.createObjectURL(originalFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'original';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (originalFileUrl) {
      window.open(originalFileUrl, '_blank');
    }
  };

  const downloadAsPdf = () => {
    // Generar HTML y abrir en nueva ventana para imprimir/guardar como PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${documentType === 'remission' ? 'Remisión' : 'Factura'} - ${formData.proveedor}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
    .info div { padding: 8px; background: #f5f5f5; border-radius: 4px; }
    .info strong { color: #666; font-size: 12px; display: block; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #333; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .totales { text-align: right; margin-top: 20px; }
    .totales div { padding: 5px 0; }
    .total-final { font-size: 20px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>${documentType === 'remission' ? 'REMISIÓN' : 'FACTURA'}</h1>
  
  <div class="info">
    <div><strong>Proveedor</strong>${formData.proveedor || 'N/A'}</div>
    <div><strong>Fecha</strong>${formData.fecha || 'N/A'}</div>
    <div><strong>Folio</strong>${formData.folio || 'N/A'}</div>
    <div><strong>RFC</strong>${formData.rfc || 'N/A'}</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Unidad</th>
        <th>P. Unitario</th>
        <th>Importe</th>
      </tr>
    </thead>
    <tbody>
      ${conceptos.map(c => `
        <tr>
          <td>${c.descripcion}</td>
          <td>${c.cantidad}</td>
          <td>${c.unidad}</td>
          <td>$${Number(c.precio_unitario).toFixed(2)}</td>
          <td>$${Number(c.importe).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totales">
    <div><strong>Subtotal:</strong> $${Number(formData.subtotal || 0).toFixed(2)}</div>
    <div><strong>IVA (16%):</strong> $${Number(formData.iva || 0).toFixed(2)}</div>
    <div class="total-final"><strong>TOTAL:</strong> $${Number(formData.total || 0).toFixed(2)}</div>
  </div>
  
  <script>window.print();</script>
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setShowDownloadOptions(false);
  };

  const handleConfirm = () => {
    // Preparar datos con conceptos actualizados
    const dataToSave = {
      ...extractedData,
      ...formData,
      nombre_emisor: formData.proveedor,
      rfc_emisor: formData.rfc,
      fecha_emision: formData.fecha,
      tiene_firma_recepcion: formData.entrega_confirmada,
      conceptos: conceptos.map(c => ({
        descripcion: c.descripcion,
        cantidad: c.cantidad,
        unidad: c.unidad,
        valor_unitario: c.precio_unitario,
        precio_unitario: c.precio_unitario,
        importe: c.importe
      }))
    };
    
    onConfirm(dataToSave);
  };

  const hasWarnings = !formData.proveedor || !formData.total;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col my-auto">
          
          {/* Header */}
          <div className={`p-6 border-b flex-shrink-0 ${
            documentType === 'remission' 
              ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
              : 'bg-gradient-to-r from-teal-500 to-emerald-500'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 bg-white/20 rounded-xl">
                  {documentType === 'remission' ? <FileText className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    Revisar {documentType === 'remission' ? 'Remisión' : 'Factura'}
                  </h2>
                  <p className={`text-sm ${documentType === 'remission' ? 'text-amber-100' : 'text-teal-100'}`}>
                    {fileName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Botón de descarga */}
                <div className="relative">
                  <button
                    onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-white"
                    title="Opciones de descarga"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  
                  {showDownloadOptions && (
                    <div className="absolute right-0 top-12 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 min-w-[200px] z-10">
                      <button
                        onClick={downloadOriginal}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <FileImage className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-slate-800">Descargar Original</p>
                          <p className="text-xs text-slate-500">Imagen/PDF como fue cargado</p>
                        </div>
                      </button>
                      <button
                        onClick={downloadAsPdf}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <FilePlus className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="font-medium text-slate-800">Generar PDF Nuevo</p>
                          <p className="text-xs text-slate-500">PDF limpio con datos editados</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Warning si faltan datos */}
          {hasWarnings && (
            <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-700 font-medium">Algunos campos no se detectaron. Revisa y completa la información.</p>
              </div>
            </div>
          )}

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Datos generales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Fecha */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha
                </label>
                <input
                  type="date"
                  value={formData.fecha || ''}
                  onChange={(e) => handleChange('fecha', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-200 focus:border-teal-400 transition-all"
                />
              </div>

              {/* Proveedor */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Proveedor *
                </label>
                <input
                  type="text"
                  value={formData.proveedor || ''}
                  onChange={(e) => handleChange('proveedor', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-teal-200 ${
                    !formData.proveedor ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                  }`}
                />
              </div>

              {/* Folio */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  <Hash className="w-4 h-4 inline mr-1" />
                  Folio
                </label>
                <input
                  type="text"
                  value={formData.folio || ''}
                  onChange={(e) => handleChange('folio', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-200 transition-all"
                />
              </div>

              {/* RFC */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">RFC Emisor</label>
                <input
                  type="text"
                  value={formData.rfc || ''}
                  onChange={(e) => handleChange('rfc', e.target.value.toUpperCase())}
                  maxLength={13}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-200 transition-all uppercase"
                />
              </div>

              {/* Método de pago */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Método de Pago</label>
                <select
                  value={formData.metodo_pago || 'PUE'}
                  onChange={(e) => handleChange('metodo_pago', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-200 transition-all"
                >
                  <option value="PUE">PUE - Pago en una sola exhibición</option>
                  <option value="PPD">PPD - Pago en parcialidades</option>
                </select>
              </div>
            </div>

            {/* ========== TABLA DE CONCEPTOS/LÍNEAS ========== */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Table className="w-5 h-5 text-teal-500" />
                  Conceptos / Líneas ({conceptos.length})
                </h3>
                <button
                  onClick={addRow}
                  className="flex items-center gap-1 px-3 py-2 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-200 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Línea
                </button>
              </div>
              
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase w-[40%]">Descripción</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase w-[10%]">Cantidad</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase w-[12%]">Unidad</th>
                        <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase w-[15%]">P. Unitario</th>
                        <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase w-[15%]">Importe</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase w-[8%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {conceptos.map((concepto, index) => (
                        <tr key={concepto.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={concepto.descripcion}
                              onChange={(e) => updateRow(concepto.id, 'descripcion', e.target.value)}
                              className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400"
                              placeholder="Descripción del producto/servicio"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={concepto.cantidad}
                              onChange={(e) => updateRow(concepto.id, 'cantidad', Number(e.target.value))}
                              className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-teal-200"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={concepto.unidad}
                              onChange={(e) => updateRow(concepto.id, 'unidad', e.target.value)}
                              className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-teal-200"
                            >
                              <option value="PZA">PZA</option>
                              <option value="KG">KG</option>
                              <option value="LT">LT</option>
                              <option value="MT">MT</option>
                              <option value="M2">M2</option>
                              <option value="M3">M3</option>
                              <option value="SERVICIO">SERVICIO</option>
                              <option value="VIAJE">VIAJE</option>
                              <option value="ROLLO">ROLLO</option>
                              <option value="BULTO">BULTO</option>
                              <option value="CAJA">CAJA</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={concepto.precio_unitario}
                              onChange={(e) => updateRow(concepto.id, 'precio_unitario', Number(e.target.value))}
                              className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-teal-200"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-medium text-slate-800">
                              ${Number(concepto.importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {conceptos.length > 1 && (
                              <button
                                onClick={() => removeRow(concepto.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Eliminar línea"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Resumen de totales */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2 p-4 bg-slate-50 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-medium text-slate-700">
                      ${Number(formData.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">IVA (16%):</span>
                    <span className="font-medium text-slate-700">
                      ${Number(formData.iva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-800">Total:</span>
                    <span className="font-black text-slate-800">
                      ${Number(formData.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Entrega confirmada */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <input
                type="checkbox"
                id="entrega_confirmada"
                checked={formData.entrega_confirmada || false}
                onChange={(e) => handleChange('entrega_confirmada', e.target.checked)}
                className="w-5 h-5 accent-teal-500"
              />
              <label htmlFor="entrega_confirmada" className="text-sm text-slate-700">
                Entrega confirmada / Tiene firma de recepción
              </label>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="p-6 border-t border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className={`flex items-center gap-2 px-6 py-3 text-white rounded-xl font-bold hover:shadow-lg transition-all ${
                documentType === 'remission'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-amber-200'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:shadow-teal-200'
              }`}
            >
              <Check className="w-5 h-5" />
              Confirmar y Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;
