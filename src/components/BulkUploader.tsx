// ============================================
// CARGA MASIVA DE FACTURAS (Excel + PDFs)
// ============================================

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Invoice } from '../types';
import { aiService } from '../services/aiService';
import {
  Upload, FileSpreadsheet, FileText, X, Check, AlertCircle,
  Loader2, Download, Trash2
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (invoices: any[]) => void;
  existingInvoices: Invoice[];
}

interface PreviewRow {
  id: number;
  date: string;
  folio: string;
  description: string;
  quantity: number;
  price: number;
  amount: number;
  supplier: string;
  order: string;
  remission: string;
  selected: boolean;
  isDuplicate: boolean;
}

interface PDFFile {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  result?: any;
  error?: string;
}

const BulkUploader: React.FC<Props> = ({ isOpen, onClose, onImport, existingInvoices }) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'pdf'>('excel');
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [period, setPeriod] = useState('');
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [processingPdfs, setProcessingPdfs] = useState(false);

  // Procesar archivo Excel
  const handleExcelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Extraer nombre del proveedor (primera fila)
        const supplierRow = jsonData[0];
        if (supplierRow && supplierRow[0]) {
          setSupplierName(String(supplierRow[0]));
        }

        // Extraer periodo (segunda fila)
        const periodRow = jsonData[1];
        if (periodRow && periodRow[0]) {
          setPeriod(String(periodRow[0]));
        }

        // Encontrar fila de encabezados
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
          const row = jsonData[i];
          if (row && (row.includes('FECHA') || row.includes('FACTURA') || row.includes('Fecha'))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          alert('No se encontró la fila de encabezados en el Excel');
          return;
        }

        const headers = jsonData[headerRowIndex];
        const dataRows = jsonData.slice(headerRowIndex + 1);

        // Mapear columnas
        const colMap: Record<string, number> = {};
        headers.forEach((header: string, index: number) => {
          if (header) {
            const h = String(header).toUpperCase().trim();
            if (h.includes('FECHA')) colMap['fecha'] = index;
            if (h.includes('FACTURA') || h.includes('FOLIO')) colMap['folio'] = index;
            if (h.includes('TIPO') || h.includes('GUATA') || h.includes('DESC') || h.includes('CONCEPTO')) colMap['descripcion'] = index;
            if (h.includes('CANTIDAD') || h.includes('CANT')) colMap['cantidad'] = index;
            if (h.includes('PRECIO')) colMap['precio'] = index;
            if (h.includes('IMPORTE') || h.includes('TOTAL')) colMap['importe'] = index;
            if (h.includes('MAQUIL') || h.includes('CLIENTE')) colMap['maquilero'] = index;
            if (h.includes('ORDEN')) colMap['orden'] = index;
            if (h.includes('REMISION') || h.includes('REMISIÓN')) colMap['remision'] = index;
          }
        });

        // Convertir filas a datos de preview
        const preview: PreviewRow[] = [];
        dataRows.forEach((row: any[], index: number) => {
          if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) return;
          
          // Convertir fecha Excel a fecha legible
          let dateValue = row[colMap['fecha']];
          if (typeof dateValue === 'number') {
            const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
            dateValue = excelDate.toISOString().split('T')[0];
          } else if (dateValue) {
            dateValue = String(dateValue);
          }

          const folio = String(row[colMap['folio']] || '');
          const amount = Number(row[colMap['importe']]) || 0;

          // Verificar duplicados
          const isDuplicate = existingInvoices.some(inv => 
            inv.folio === folio || 
            (inv.supplier_name === supplierRow[0] && Number(inv.total) === amount && inv.date === dateValue)
          );

          if (folio || amount > 0) {
            preview.push({
              id: index,
              date: dateValue || new Date().toISOString().split('T')[0],
              folio,
              description: String(row[colMap['descripcion']] || ''),
              quantity: Number(row[colMap['cantidad']]) || 0,
              price: Number(row[colMap['precio']]) || 0,
              amount,
              supplier: String(row[colMap['maquilero']] || ''),
              order: String(row[colMap['orden']] || ''),
              remission: String(row[colMap['remision']] || ''),
              selected: !isDuplicate,
              isDuplicate
            });
          }
        });

        setPreviewData(preview);
      } catch (error) {
        console.error('Error processing Excel:', error);
        alert('Error al procesar el archivo Excel');
      }
    };

    reader.readAsArrayBuffer(file);
  }, [existingInvoices]);

  // Importar facturas seleccionadas del Excel
  const handleImportExcel = () => {
    const selected = previewData.filter(row => row.selected);
    if (selected.length === 0) {
      alert('Selecciona al menos una factura para importar');
      return;
    }

    const invoices = selected.map(row => ({
      date: row.date,
      folio: row.folio,
      supplier_name: supplierName || 'Proveedor',
      insumo: row.description,
      amount_net: row.amount,
      iva: row.amount * 0.16,
      total: row.amount * 1.16,
      status: 'Pendiente',
      delivery_confirmed: false
    }));

    onImport(invoices);
    onClose();
  };

  // Manejar carga de PDFs
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPdfs: PDFFile[] = files.map(file => ({
      file,
      status: 'pending'
    }));
    setPdfFiles(prev => [...prev, ...newPdfs]);
  };

  // Procesar todos los PDFs con IA
  const processPdfs = async () => {
    setProcessingPdfs(true);
    
    for (let i = 0; i < pdfFiles.length; i++) {
      if (pdfFiles[i].status !== 'pending') continue;
      
      setPdfFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' } : f
      ));

      try {
        const result = await aiService.extractInvoiceData(pdfFiles[i].file);
        
        setPdfFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: result.success ? 'success' : 'error',
            result: result.data,
            error: result.error
          } : f
        ));
      } catch (error: any) {
        setPdfFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', error: error.message } : f
        ));
      }
    }
    
    setProcessingPdfs(false);
  };

  // Importar PDFs procesados
  const handleImportPdfs = () => {
    const successful = pdfFiles.filter(f => f.status === 'success' && f.result);
    if (successful.length === 0) {
      alert('No hay facturas procesadas para importar');
      return;
    }

    const invoices = successful.map(f => ({
      uuid: f.result.uuid,
      rfc_emisor: f.result.rfc_emisor,
      folio: f.result.folio,
      serie: f.result.serie,
      date: f.result.fecha_emision || new Date().toISOString().split('T')[0],
      supplier_name: f.result.nombre_emisor || 'Proveedor',
      insumo: f.result.conceptos?.[0]?.descripcion || 'General',
      amount_net: f.result.subtotal || 0,
      iva: f.result.iva || 0,
      total: f.result.total || 0,
      payment_method: f.result.metodo_pago || 'PUE',
      cfdi_use: f.result.uso_cfdi || 'G03',
      delivery_confirmed: f.result.tiene_firma_recepcion || false,
      status: 'Pendiente',
      is_fiscal_valid: f.result.es_valido_fiscalmente ?? true
    }));

    onImport(invoices);
    onClose();
  };

  // Descargar plantilla Excel
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    const data = [
      ['NOMBRE DEL PROVEEDOR S.A. DE C.V.'],
      ['PERIODO: DEL __ AL __ DE _______ DE 2026'],
      [],
      ['FECHA', 'FACTURA', 'DESCRIPCIÓN', 'CANTIDAD', 'PRECIO', 'IMPORTE', 'MAQUILERO', 'ORDEN', 'REMISION'],
      ['2026-01-15', '12345', 'Producto ejemplo', 100, 15.50, 1550.00, 'Ubicación', '001', 'R001'],
      ['2026-01-16', '12346', 'Otro producto', 200, 10.00, 2000.00, 'Ubicación', '002', 'R002'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Estilos de columnas
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, 'Plantilla_Facturas_Logan.xlsx');
  };

  const removePdf = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRow = (id: number) => {
    setPreviewData(prev => prev.map(row => 
      row.id === id ? { ...row, selected: !row.selected } : row
    ));
  };

  const selectAll = () => {
    const allSelected = previewData.filter(r => !r.isDuplicate).every(r => r.selected);
    setPreviewData(prev => prev.map(row => ({
      ...row,
      selected: row.isDuplicate ? false : !allSelected
    })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-500 to-indigo-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Carga Masiva de Facturas</h2>
                <p className="text-blue-100 text-sm">Importa desde Excel o múltiples PDFs</p>
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

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-all ${
              activeTab === 'excel'
                ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            Importar desde Excel
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-all ${
              activeTab === 'pdf'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-5 h-5" />
            Cargar múltiples PDFs
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'excel' ? (
            <div className="space-y-6">
              {/* Upload area */}
              {previewData.length === 0 ? (
                <div className="space-y-4">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition-all">
                    <FileSpreadsheet className="w-12 h-12 text-emerald-400 mb-3" />
                    <p className="text-lg font-bold text-emerald-600">Arrastra tu archivo Excel aquí</p>
                    <p className="text-sm text-emerald-500">o haz clic para seleccionar</p>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                  </label>
                  
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                    >
                      <Download className="w-5 h-5" />
                      Descargar plantilla de ejemplo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Info del archivo */}
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <div>
                      <p className="font-bold text-emerald-800">{supplierName || 'Proveedor'}</p>
                      <p className="text-sm text-emerald-600">{period}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-emerald-600">
                        {previewData.filter(r => r.selected).length} de {previewData.length} seleccionadas
                      </p>
                      <button
                        onClick={() => { setPreviewData([]); setSupplierName(''); setPeriod(''); }}
                        className="text-xs text-emerald-500 hover:text-emerald-700"
                      >
                        Cargar otro archivo
                      </button>
                    </div>
                  </div>

                  {/* Tabla de preview */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                      <button
                        onClick={selectAll}
                        className="text-sm text-slate-600 hover:text-slate-800 font-medium"
                      >
                        {previewData.filter(r => !r.isDuplicate).every(r => r.selected) ? 'Deseleccionar todo' : 'Seleccionar todo'}
                      </button>
                      <span className="text-xs text-slate-400">
                        {previewData.filter(r => r.isDuplicate).length} duplicados detectados
                      </span>
                    </div>
                    <div className="max-h-80 overflow-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-slate-100">
                          <tr>
                            <th className="w-10 px-3 py-2"></th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-500">Fecha</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-500">Folio</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-500">Descripción</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-slate-500">Cantidad</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-slate-500">Importe</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-500">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewData.map(row => (
                            <tr 
                              key={row.id} 
                              className={`${row.isDuplicate ? 'bg-amber-50' : row.selected ? 'bg-emerald-50' : ''} hover:bg-slate-50 transition-colors`}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={row.selected}
                                  onChange={() => toggleRow(row.id)}
                                  disabled={row.isDuplicate}
                                  className="rounded border-slate-300"
                                />
                              </td>
                              <td className="px-3 py-2 text-sm">{row.date}</td>
                              <td className="px-3 py-2 text-sm font-mono">{row.folio}</td>
                              <td className="px-3 py-2 text-sm truncate max-w-[200px]">{row.description}</td>
                              <td className="px-3 py-2 text-sm text-right">{row.quantity.toLocaleString()}</td>
                              <td className="px-3 py-2 text-sm text-right font-medium">
                                ${row.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2">
                                {row.isDuplicate ? (
                                  <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                                    Duplicado
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">
                                    Nuevo
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upload PDFs */}
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-2xl bg-blue-50 hover:bg-blue-100 cursor-pointer transition-all">
                <FileText className="w-10 h-10 text-blue-400 mb-2" />
                <p className="text-lg font-bold text-blue-600">Arrastra tus PDFs aquí</p>
                <p className="text-sm text-blue-500">Puedes seleccionar múltiples archivos</p>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </label>

              {/* Lista de PDFs */}
              {pdfFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-700">{pdfFiles.length} archivos</p>
                    {!processingPdfs && pdfFiles.some(f => f.status === 'pending') && (
                      <button
                        onClick={processPdfs}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
                      >
                        <Loader2 className="w-4 h-4" />
                        Procesar con IA
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-auto">
                    {pdfFiles.map((pdf, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          pdf.status === 'success' ? 'bg-emerald-50 border-emerald-200' :
                          pdf.status === 'error' ? 'bg-rose-50 border-rose-200' :
                          pdf.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                          'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className={`w-5 h-5 ${
                            pdf.status === 'success' ? 'text-emerald-500' :
                            pdf.status === 'error' ? 'text-rose-500' :
                            'text-slate-400'
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                              {pdf.file.name}
                            </p>
                            {pdf.status === 'success' && pdf.result && (
                              <p className="text-xs text-emerald-600">
                                {pdf.result.nombre_emisor} - ${pdf.result.total?.toLocaleString()}
                              </p>
                            )}
                            {pdf.status === 'error' && (
                              <p className="text-xs text-rose-600">{pdf.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pdf.status === 'pending' && (
                            <span className="text-xs text-slate-400">Pendiente</span>
                          )}
                          {pdf.status === 'processing' && (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          )}
                          {pdf.status === 'success' && (
                            <Check className="w-5 h-5 text-emerald-500" />
                          )}
                          {pdf.status === 'error' && (
                            <AlertCircle className="w-5 h-5 text-rose-500" />
                          )}
                          <button
                            onClick={() => removePdf(index)}
                            className="p-1 hover:bg-slate-200 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          
          {activeTab === 'excel' && previewData.length > 0 && (
            <button
              onClick={handleImportExcel}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              <Check className="w-5 h-5" />
              Importar {previewData.filter(r => r.selected).length} facturas
            </button>
          )}
          
          {activeTab === 'pdf' && pdfFiles.some(f => f.status === 'success') && (
            <button
              onClick={handleImportPdfs}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              <Check className="w-5 h-5" />
              Importar {pdfFiles.filter(f => f.status === 'success').length} facturas
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploader;
