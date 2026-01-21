// ============================================
// CARGA DE REMISIONES CON GENERACIÓN DE PDF
// ============================================

import { useState } from 'react';
import {
  FileText, X, Check, Loader2, Download, Eye, Image, 
  Calendar, Building2, Phone, Hash
} from 'lucide-react';

interface RemissionItem {
  cantidad: number;
  producto: string;
  tamaño: string;
  codigo: string;
  orden: string;
  precio: number;
  total: number;
}

interface RemissionData {
  proveedor: string;
  direccion: string;
  telefono: string;
  nota_numero: string;
  fecha: string;
  items: RemissionItem[];
  total: number;
  total_letra: string;
  receptor_nombre: string;
  receptor_rfc: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

const RemissionUploader: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<RemissionData | null>(null);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setExtractedData(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const extractData = async () => {
    if (!file) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      // Call AI service with custom prompt for remissions
      const response = await fetch('/.netlify/functions/claude-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract_remission',
          data: {
            file_base64: base64,
            file_type: file.type,
            file_name: file.name
          }
        })
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        setExtractedData(result.data);
      } else {
        setError(result.error || 'Error al extraer datos');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!extractedData) return;

    // Create HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
          body { padding: 20px; font-size: 11px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .logo { font-size: 18px; font-weight: bold; }
          .company { font-size: 14px; }
          .info-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .info-row { display: flex; margin-bottom: 5px; }
          .info-label { font-weight: bold; width: 80px; }
          .nota-info { text-align: right; }
          .nota-info .numero { font-size: 24px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row { font-weight: bold; background: #f9f9f9; }
          .total-letra { margin-top: 20px; padding: 10px; border: 1px solid #000; font-style: italic; }
          .footer { margin-top: 30px; font-size: 9px; text-align: center; border-top: 1px solid #ccc; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">LOGAN & MASON</div>
            <div class="company">Logan & Mason Textile Company SA de CV</div>
          </div>
          <div class="nota-info">
            <div>Nota #</div>
            <div class="numero">${extractedData.nota_numero || '-'}</div>
            <div>Fecha: ${extractedData.fecha || '-'}</div>
          </div>
        </div>
        
        <div class="info-box">
          <div class="info-row"><span class="info-label">Proveedor:</span> ${extractedData.proveedor || '-'}</div>
          <div class="info-row"><span class="info-label">Dirección:</span> ${extractedData.direccion || '-'}</div>
          <div class="info-row"><span class="info-label">Teléfono:</span> ${extractedData.telefono || '-'}</div>
        </div>
        
        <h3>Nota de Movimiento</h3>
        
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width:60px">Cantidad</th>
              <th>Producto</th>
              <th class="text-center" style="width:70px">Tamaño</th>
              <th class="text-center" style="width:70px">Código</th>
              <th class="text-center" style="width:60px">Orden</th>
              <th class="text-right" style="width:70px">Precio</th>
              <th class="text-right" style="width:90px">Total</th>
            </tr>
          </thead>
          <tbody>
            ${extractedData.items?.map(item => `
              <tr>
                <td class="text-center">${item.cantidad}</td>
                <td>${item.producto}</td>
                <td class="text-center">${item.tamaño || '-'}</td>
                <td class="text-center">${item.codigo}</td>
                <td class="text-center">${item.orden || '-'}</td>
                <td class="text-right">$${item.precio?.toFixed(2) || '0.00'}</td>
                <td class="text-right">$${item.total?.toFixed(2) || '0.00'}</td>
              </tr>
            `).join('') || ''}
            <tr class="total-row">
              <td colspan="6" class="text-right">TOTAL:</td>
              <td class="text-right">$${extractedData.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</td>
            </tr>
          </tbody>
        </table>
        
        ${extractedData.total_letra ? `
          <div class="total-letra">
            (${extractedData.total_letra})
          </div>
        ` : ''}
        
        <div class="footer">
          ${extractedData.receptor_nombre || 'LOGAN & MASON TEXTILE COMPANY SA DE CV'} - RFC: ${extractedData.receptor_rfc || 'LAM111118JNA'}
        </div>
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleSave = () => {
    if (!extractedData) return;
    
    onSave({
      date: extractedData.fecha,
      supplier_name: extractedData.proveedor,
      commodity_type: extractedData.items?.[0]?.producto || 'General',
      amount: extractedData.total,
      nota_numero: extractedData.nota_numero,
      ai_extracted_data: extractedData
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-teal-500 to-emerald-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl">
                <Image className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Cargar Remisión desde Imagen</h2>
                <p className="text-teal-100 text-sm">Extrae datos y genera PDF</p>
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
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Image upload */}
            <div>
              {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-teal-300 rounded-2xl bg-teal-50 hover:bg-teal-100 cursor-pointer transition-all">
                  <Image className="w-12 h-12 text-teal-400 mb-3" />
                  <p className="text-lg font-bold text-teal-600">Arrastra tu imagen aquí</p>
                  <p className="text-sm text-teal-500">JPG, PNG o PDF</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="w-full h-64 object-contain bg-slate-100"
                    />
                    <button
                      onClick={() => { setFile(null); setPreview(''); setExtractedData(null); }}
                      className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white rounded-lg shadow"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {!extractedData && (
                    <button
                      onClick={extractData}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Extrayendo datos...
                        </>
                      ) : (
                        <>
                          <Eye className="w-5 h-5" />
                          Extraer Datos con IA
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Right: Extracted data */}
            <div>
              {extractedData ? (
                <div className="space-y-4">
                  {/* Header info */}
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-slate-400" />
                      <span className="font-bold text-slate-800">{extractedData.proveedor}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Hash className="w-4 h-4" />
                        Nota: {extractedData.nota_numero}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        {extractedData.fecha}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 col-span-2">
                        <Phone className="w-4 h-4" />
                        {extractedData.telefono || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="max-h-48 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-500">Cant</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-500">Producto</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-slate-500">Precio</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-slate-500">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {extractedData.items?.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-center">{item.cantidad}</td>
                              <td className="px-3 py-2 truncate max-w-[120px]">{item.producto}</td>
                              <td className="px-3 py-2 text-right">${item.precio?.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right font-medium">${item.total?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700">TOTAL:</span>
                      <span className="text-2xl font-black text-emerald-700">
                        ${extractedData.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {extractedData.total_letra && (
                      <p className="text-xs text-emerald-600 mt-1 italic">
                        ({extractedData.total_letra})
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={generatePDF}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 transition-all"
                    >
                      <Download className="w-5 h-5" />
                      Generar PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Carga una imagen para extraer los datos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all"
          >
            Cancelar
          </button>
          {extractedData && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              <Check className="w-5 h-5" />
              Guardar Remisión
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemissionUploader;
