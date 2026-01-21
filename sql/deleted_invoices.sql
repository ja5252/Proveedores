-- ============================================
-- TABLA DE FACTURAS ELIMINADAS
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Crear tabla para historial de eliminados
CREATE TABLE IF NOT EXISTS public.deleted_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  
  -- Datos de la factura original
  folio TEXT,
  supplier_name TEXT NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  
  -- Datos de eliminación
  deleted_by UUID NOT NULL,
  deleted_by_name TEXT,
  deletion_reason TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Copia completa de la factura original para restaurar
  original_data JSONB NOT NULL
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_deleted_invoices_company ON public.deleted_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_deleted_invoices_deleted_at ON public.deleted_invoices(deleted_at);

-- Habilitar RLS (opcional - deshabilitado por ahora para evitar problemas)
-- ALTER TABLE public.deleted_invoices ENABLE ROW LEVEL SECURITY;

-- Comentarios
COMMENT ON TABLE public.deleted_invoices IS 'Historial de facturas eliminadas con motivo y datos para restaurar';
