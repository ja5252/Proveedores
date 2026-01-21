// ============================================
// FILE UPLOADER - CARGA DE DOCUMENTOS CON IA
// ============================================

import React, { useRef, useState } from 'react';
import { Upload, Loader2, FileText, Image, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  onUpload: (file: File) => Promise<void>;
  isProcessing?: boolean;
}

const FileUploader: React.FC<Props> = ({ onUpload, isProcessing = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState('');

  const handleFile = async (file: File) => {
    // Validar tipo de archivo
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Tipo de archivo no soportado. Use PDF, JPG, PNG o WebP.');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es muy grande. Máximo 10MB.');
      return;
    }

    setFileName(file.name);
    setUploadStatus('uploading');

    try {
      await onUpload(file);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const loading = isProcessing || uploadStatus === 'uploading';

  return (
    <>
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleChange}
        accept="application/pdf,image/jpeg,image/png,image/webp"
      />
      
      <div
        onClick={() => !loading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative cursor-pointer transition-all ${loading ? 'pointer-events-none' : ''}`}
      >
        <button
          disabled={loading}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
            isDragging
              ? 'bg-indigo-100 border-2 border-dashed border-indigo-400 text-indigo-600'
              : uploadStatus === 'success'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
              : uploadStatus === 'error'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-200'
              : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Procesando con AI...</span>
            </>
          ) : uploadStatus === 'success' ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>¡Documento cargado!</span>
            </>
          ) : uploadStatus === 'error' ? (
            <>
              <AlertCircle className="w-5 h-5" />
              <span>Error al procesar</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Cargar Factura</span>
            </>
          )}
        </button>
      </div>

      {/* Processing Modal */}
      {loading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Procesando con Claude AI
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              Analizando el documento para extraer datos fiscales...
            </p>

            {fileName && (
              <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl">
                {fileName.toLowerCase().endsWith('.pdf') ? (
                  <FileText className="w-5 h-5 text-rose-500" />
                ) : (
                  <Image className="w-5 h-5 text-indigo-500" />
                )}
                <span className="text-sm text-slate-600 truncate max-w-[200px]">
                  {fileName}
                </span>
              </div>
            )}

            <div className="mt-6 space-y-2 text-left text-xs text-slate-400">
              <ProcessingStep step="Leyendo documento" active />
              <ProcessingStep step="Extrayendo UUID fiscal" />
              <ProcessingStep step="Identificando conceptos" />
              <ProcessingStep step="Validando IVA 16%" />
              <ProcessingStep step="Detectando firma de recepción" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ProcessingStep: React.FC<{ step: string; active?: boolean }> = ({ step, active }) => (
  <div className={`flex items-center gap-2 ${active ? 'text-indigo-600' : ''}`}>
    {active ? (
      <Loader2 className="w-3 h-3 animate-spin" />
    ) : (
      <div className="w-3 h-3 rounded-full bg-slate-200" />
    )}
    <span>{step}</span>
  </div>
);

export default FileUploader;
