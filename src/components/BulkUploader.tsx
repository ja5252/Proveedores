// ============================================
// CARGA MASIVA DE FACTURAS (Excel + PDFs)
// CON SELECTOR DE PROVEEDOR - CORREGIDO
// ============================================

import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Invoice, Supplier } from '../types';
import { aiService } from '../services/aiService';
import {
  Upload, FileSpreadsheet, FileText, X, Check, AlertCircle,
  Loader2, Download, Trash2, Building2, ChevronDown, Users
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (invoices: any[]) => void;
  existingInvoices: Invoice[];
  suppliers?: Supplier[]; // Añadir proveedores
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

const BulkUploader: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onImport, 
  existingInvoices,
  suppliers = [] 
}) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'pdf'>('excel');
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [period, setPeriod] = useState('');
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [processingPdfs, setProcessingPdfs] = useState(false);
  
  // NUEVO: Estado para configuración masiva de PDFs
  const [showPdfConfig, setShowPdfConfig] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [bulkInsumo, setBulkInsumo] = useState<string>('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Limpiar estado cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setShowPdfConfig(false);
      setSelectedSupplier('');
      setBulkInsumo('');
      setPdfFiles([]);
      setPreviewData([]);
    }
  }, [isOpen]);

  // Procesar archivo Excel
  const handleExcelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        // Buscar nombre del proveedor y periodo
        let detectedSupplier = '';
        let detectedPeriod = '';
        
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (row) {
            const rowText = row.join(' ').toLowerCase();
            if (rowText.includes('proveedor') || rowText.includes('emisor')) {
              detectedSupplier = row[1] || row[2] || '';
            }
            if (rowText.includes('periodo') || rowText.includes('semana') || rowText.includes('mes')) {
              detectedPeriod = row[1] || row[2] || '';
            }
          }
        }

        // Buscar fila de encabezados
        let headerRow = -1;
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.some(cell => 
            String(cell).toLowerCase().includes('fecha') ||
            String(cell).toLowerCase().includes('folio') ||
            String(cell).toLowerCase().includes('importe')
          )) {
            headerRow = i;
            break;
          }
        }

        if (headerRow === -1) {
          alert('No se encontró una fila de encabezados válida');
          return;
        }

        // Procesar datos
        const rows: PreviewRow[] = [];
        for (let i = headerRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.every(cell => !cell)) continue;

          const date = row[0] || '';
          const folio = String(row[1] || '');
          const description = row[2] || '';
          const quantity = Number(row[3]) || 1;
          const price = Number(row[4]) || 0;
          const amount = Number(row[5]) || quantity * price;
          const supplier = row[6] || detectedSupplier || '';
          const order = row[7] || '';
          const remission = row[8] || '';

          // Verificar duplicados
          const isDuplicate = existingInvoices.some(inv => 
            inv.folio === folio && 
            inv.supplier_name?.toLowerCase() === supplier.toLowerCase()
          );

          rows.push({
            id: i,
            date: formatDate(date),
            folio,
            description,
            quantity,
            price,
            amount,
            supplier,
            order,
            remission,
            selected: !isDuplicate,
            isDuplicate
          });
        }

        setSupplierName(detectedSupplier);
        setPeriod(detectedPeriod);
        setPreviewData(rows);
      } catch (error) {
        console.error('Error processing Excel:', error);
        alert('Error al procesar el archivo Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [existingInvoices]);

  // Formatear fecha
  const formatDate = (date: any): string => {
    if (!date) return new Date().toISOString().split('T')[0];
    if (typeof date === 'number') {
      const excelDate = new Date((date - 25569) * 86400 * 1000);
      return excelDate.toISOString().split('T')[0];
    }
    return String(date);
  };

  // NUEVO: Manejar carga de PDFs
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPdfFiles: PDFFile[] = files.map(file => ({
      file,
      status: 'pending'
    }));
    setPdfFiles(prev => [...prev, ...newPdfFiles]);
    
    // Mostrar configuración si hay PDFs
    if (newPdfFiles.length > 0) {
      setShowPdfConfig(true);
    }
  };

  // Remover PDF de la lista
  const removePdf = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
    if (pdfFiles.length <= 1) {
      setShowPdfConfig(false);
    }
  };

  // NUEVO: Procesar PDFs con datos del proveedor seleccionado
  const processPdfs = async () => {
    setProcessingPdfs(true);
    
    // Obtener datos del proveedor seleccionado
    const selectedSupplierData = suppliers.find(s => s.id === selectedSupplier);
    
    for (let i = 0; i < pdfFiles.length; i++) {
      if (pdfFiles[i].status !== 'pending') continue;
      
      setPdfFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' } : f
      ));

      try {
        const result = await aiService.extractFromDocument(pdfFiles[i].file);
        
        // NUEVO: Aplicar datos del proveedor seleccionado
        if (selectedSupplierData) {
          result.nombre_emisor = selectedSupplierData.name;
          result.rfc_emisor = selectedSupplierData.rfc || result.rfc_emisor;
          result.supplier_id = selectedSupplierData.id;
        }
        
        // Aplicar insumo si se especificó
        if (bulkInsumo) {
          result.insumo = bulkInsumo;
          if (result.conceptos && result.conceptos.length > 0) {
            result.conceptos[0].descripcion = bulkInsumo;
          }
        }
        
        setPdfFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'success', result } : f
        ));
      } catch (error: any) {
        setPdfFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', error: error.message } : f
        ));
      }
    }
    
    setProcessingPdfs(false);
  };

  // Descargar plantilla
  const downloadTemplate = () => {
    const template = [
      ['PROVEEDOR:', '', 'PERIODO:', ''],
      [],
      ['FECHA', 'FOLIO', 'DESCRIPCIÓN', 'CANTIDAD', 'PRECIO UNIT.', 'IMPORTE', 'PROVEEDOR', 'ORDEN', 'REMISIÓN'],
      ['2024-01-15', 'F-001', 'Material de construcción', 10, 150.00, 1500.00, 'Proveedor XYZ', 'OC-123', 'R-456'],
      ['2024-01-16', 'F-002', 'Servicios de transporte', 1, 2500.00, 2500.00, 'Proveedor XYZ', 'OC-124', 'R-457'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(template);
    
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, 'plantilla_carga_masiva.xlsx');
  };

  // Importar desde Excel
  const handleImportExcel = () => {
    const selectedRows = previewData.filter(r => r.selected);
    const invoices = selectedRows.map(row => ({
      date: row.date,
      folio: row.folio,
      supplier_name: row.supplier || supplierName,
      insumo: row.description,
      total: row.amount,
      amount_net: row.amount / 1.16,
      iva: row.amount - (row.amount / 1.16),
      order_number: row.order,
      remission_number: row.remission
    }));
    onImport(invoices);
    setPreviewData([]);
    setSupplierName('');
    setPeriod('');
    onClose();
  };

  // MODIFICADO: Importar desde PDFs
  const handleImportPdfs = () => {
    const successfulPdfs = pdfFiles.filter(f => f.status === 'success');
    const invoices = successfulPdfs.map(pdf => ({
      ...pdf.result,
      // Asegurar que los datos del proveedor se mantienen
      supplier_name: pdf.result?.nombre_emisor || pdf.result?.supplier_name,
      supplier_id: pdf.result?.supplier_id
    }));
    onImport(invoices);
    setPdfFiles([]);
    setSelectedSupplier('');
    setBulkInsumo('');
    setShowPdfConfig(false);
    onClose();
  };

  // Toggle selección
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
    // FIX: Agregar overflow-y-auto al overlay
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col my-auto">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-500 to-indigo-500 flex-shrink-0">
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
          <div className="flex border-b border-slate-200 flex-shrink-0">
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

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
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
                          {previewData.filter(r => !r.isDuplicate).every(r => r.selected) ? 
                            'Deseleccionar todo' : 'Seleccionar todo'}
                        </button>
                      </div>
                      
                      {/* FIX: Contenedor de tabla con scroll horizontal mejorado */}
                      <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-sm min-w-[800px]">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="px-3 py-2 text-left w-10">
                                <input
                                  type="checkbox"
                                  checked={previewData.filter(r => !r.isDuplicate).every(r => r.selected)}
                                  onChange={selectAll}
                                  className="rounded"
                                />
                              </th>
                              <th className="px-3 py-2 text-left">Fecha</th>
                              <th className="px-3 py-2 text-left">Folio</th>
                              <th className="px-3 py-2 text-left">Descripción</th>
                              <th className="px-3 py-2 text-right">Importe</th>
                              <th className="px-3 py-2 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewData.map(row => (
                              <tr 
                                key={row.id}
                                className={`${row.isDuplicate ? 'bg-amber-50' : row.selected ? 'bg-emerald-50' : ''}`}
                              >
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={row.selected}
                                    onChange={() => toggleRow(row.id)}
                                    disabled={row.isDuplicate}
                                    className="rounded"
                                  />
                                </td>
                                <td className="px-3 py-2">{row.date}</td>
                                <td className="px-3 py-2 font-mono">{row.folio}</td>
                                <td className="px-3 py-2 max-w-[200px] truncate">{row.description}</td>
                                <td className="px-3 py-2 text-right font-medium">
                                  ${row.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-center">
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
                {/* NUEVO: Configuración de proveedor para PDFs */}
                {showPdfConfig && pdfFiles.length > 0 && (
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 space-y-4">
                    <div className="flex items-center gap-2 text-blue-700">
                      <Users className="w-5 h-5" />
                      <h3 className="font-bold">Configuración para todas las facturas</h3>
                    </div>
                    <p className="text-sm text-blue-600">
                      Selecciona un proveedor y/o insumo para aplicar a todas las facturas que se procesen
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Selector de proveedor */}
                      <div className="relative">
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                          <Building2 className="w-4 h-4 inline mr-1" />
                          Proveedor (opcional)
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-left flex items-center justify-between hover:border-blue-400 transition-all"
                          >
                            <span className={selectedSupplier ? 'text-slate-800' : 'text-slate-400'}>
                              {selectedSupplier 
                                ? suppliers.find(s => s.id === selectedSupplier)?.name 
                                : 'Seleccionar proveedor...'}
                            </span>
                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showSupplierDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {showSupplierDropdown && (
                            <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                              <button
                                onClick={() => {
                                  setSelectedSupplier('');
                                  setShowSupplierDropdown(false);
                                }}
                                className="w-full px-4 py-2 text-left text-slate-400 hover:bg-slate-50"
                              >
                                -- Sin seleccionar --
                              </button>
                              {suppliers.map(supplier => (
                                <button
                                  key={supplier.id}
                                  onClick={() => {
                                    setSelectedSupplier(supplier.id);
                                    setBulkInsumo(supplier.insumo || '');
                                    setShowSupplierDropdown(false);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-blue-50 flex flex-col"
                                >
                                  <span className="font-medium text-slate-800">{supplier.name}</span>
                                  <span className="text-xs text-slate-500">{supplier.rfc || 'Sin RFC'} • {supplier.insumo}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Insumo/descripción */}
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                          Insumo/Descripción (opcional)
                        </label>
                        <input
                          type="text"
                          value={bulkInsumo}
                          onChange={(e) => setBulkInsumo(e.target.value)}
                          placeholder="Descripción del producto o servicio..."
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

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

                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
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
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className={`w-5 h-5 flex-shrink-0 ${
                              pdf.status === 'success' ? 'text-emerald-500' :
                              pdf.status === 'error' ? 'text-rose-500' :
                              pdf.status === 'processing' ? 'text-blue-500' :
                              'text-slate-400'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-700 truncate">{pdf.file.name}</p>
                              {pdf.status === 'success' && pdf.result && (
                                <p className="text-xs text-emerald-600">
                                  {pdf.result.nombre_emisor || 'Proveedor'} - ${Number(pdf.result.total || 0).toLocaleString('es-MX')}
                                </p>
                              )}
                              {pdf.status === 'error' && (
                                <p className="text-xs text-rose-600">{pdf.error}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {pdf.status === 'processing' && (
                              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            )}
                            {pdf.status === 'success' && (
                              <Check className="w-5 h-5 text-emerald-500" />
                            )}
                            {pdf.status === 'error' && (
                              <AlertCircle className="w-5 h-5 text-rose-500" />
                            )}
                            {pdf.status !== 'processing' && (
                              <button
                                onClick={() => removePdf(index)}
                                className="p-1 hover:bg-slate-200 rounded"
                              >
                                <Trash2 className="w-4 h-4 text-slate-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - fixed at bottom */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
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
    </div>
  );
};

export default BulkUploader;
