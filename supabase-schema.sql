-- ===========================================
-- FINANZAI HUB - ESQUEMA DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor
-- ===========================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- TABLA: companies (Empresas)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    rfc VARCHAR(13) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_companies_rfc ON public.companies(rfc);

-- ===========================================
-- TABLA: users (Usuarios vinculados a Auth)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_company ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ===========================================
-- TABLA: suppliers (Proveedores)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rfc VARCHAR(13),
    insumo VARCHAR(255) NOT NULL,
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    clabe VARCHAR(18),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_rfc ON public.suppliers(rfc);

-- ===========================================
-- TABLA: invoices (Facturas CFDI)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Identificadores fiscales únicos
    uuid VARCHAR(36),                    -- UUID Fiscal del SAT (Folio Fiscal)
    rfc_emisor VARCHAR(13),              -- RFC del emisor
    folio VARCHAR(50),                   -- Folio interno de la factura
    serie VARCHAR(10),                   -- Serie de la factura
    
    -- Datos del documento
    date DATE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id),
    supplier_name VARCHAR(255) NOT NULL,
    insumo VARCHAR(255) NOT NULL,
    
    -- Montos
    amount_net DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva DECIMAL(15,2) NOT NULL DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Términos y métodos
    payment_term VARCHAR(100) DEFAULT '30 días',
    payment_method VARCHAR(10) DEFAULT 'PUE',      -- PUE o PPD
    cfdi_use VARCHAR(10) DEFAULT 'G03',            -- Uso del CFDI
    
    -- Estados
    delivery_confirmed BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pagado', 'Pendiente')),
    payment_date DATE,
    is_fiscal_valid BOOLEAN DEFAULT TRUE,
    
    -- Archivo adjunto
    file_url TEXT,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    
    -- Datos extraídos por IA (JSONB para flexibilidad)
    ai_extracted_data JSONB,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas y detección de duplicados
CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_uuid ON public.invoices(uuid);
CREATE INDEX IF NOT EXISTS idx_invoices_rfc_folio ON public.invoices(rfc_emisor, folio, serie);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON public.invoices(supplier_name);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_total ON public.invoices(total);

-- Índice único para prevenir duplicados por UUID
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_uuid 
    ON public.invoices(company_id, uuid) 
    WHERE uuid IS NOT NULL AND uuid != '';

-- ===========================================
-- TABLA: remissions (Remisiones/Notas de venta)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.remissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id),
    supplier_name VARCHAR(255) NOT NULL,
    commodity_type VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    status VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pagado', 'Pendiente')),
    payment_date DATE,
    reception_confirmed BOOLEAN DEFAULT FALSE,
    
    file_url TEXT,
    file_name VARCHAR(255),
    ai_extracted_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_remissions_company ON public.remissions(company_id);
CREATE INDEX IF NOT EXISTS idx_remissions_supplier ON public.remissions(supplier_name);
CREATE INDEX IF NOT EXISTS idx_remissions_date ON public.remissions(date);

-- ===========================================
-- STORAGE: Bucket para archivos de facturas
-- ===========================================
-- Ejecutar en la sección Storage de Supabase o via SQL:

INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso al storage
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Allow authenticated downloads" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'invoices');

CREATE POLICY "Allow authenticated deletes" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'invoices');

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remissions ENABLE ROW LEVEL SECURITY;

-- Políticas para companies
CREATE POLICY "Users can view their company" ON public.companies
    FOR SELECT USING (
        id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

-- Políticas para users
CREATE POLICY "Users can view users in their company" ON public.users
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin' AND company_id = NEW.company_id
        )
    );

CREATE POLICY "Admins can update users in their company" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin' AND company_id = users.company_id
        )
    );

CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin' AND company_id = users.company_id
        ) AND id != auth.uid()
    );

-- Políticas para suppliers
CREATE POLICY "Users can view suppliers in their company" ON public.suppliers
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Editors and admins can manage suppliers" ON public.suppliers
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Políticas para invoices
CREATE POLICY "Users can view invoices in their company" ON public.invoices
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Editors and admins can manage invoices" ON public.invoices
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Políticas para remissions
CREATE POLICY "Users can view remissions in their company" ON public.remissions
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Editors and admins can manage remissions" ON public.remissions
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- ===========================================
-- FUNCIONES Y TRIGGERS
-- ===========================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remissions_updated_at
    BEFORE UPDATE ON public.remissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- FUNCIÓN: Crear usuario después de signup
-- ===========================================
-- Esta función se activa automáticamente cuando un usuario se registra
-- Nota: La empresa y usuario admin se crean desde el código de la aplicación

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el usuario ya existe en public.users, no hacer nada
    IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;
    
    -- Si hay metadata con company_id (invitación), crear el usuario
    IF NEW.raw_user_meta_data->>'company_id' IS NOT NULL THEN
        INSERT INTO public.users (id, email, full_name, role, company_id)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
            (NEW.raw_user_meta_data->>'company_id')::UUID
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- DATOS DE PRUEBA (OPCIONAL)
-- ===========================================
-- Descomentar para crear datos de ejemplo

/*
-- Crear empresa de prueba
INSERT INTO public.companies (id, name, rfc)
VALUES ('00000000-0000-0000-0000-000000000001', 'Empresa Demo SA de CV', 'EDE123456789');

-- Crear proveedores de prueba
INSERT INTO public.suppliers (company_id, name, rfc, insumo, bank_name, bank_account)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Proveedor Materiales SA', 'PMT123456789', 'Materiales de construcción', 'BBVA', '0123456789'),
    ('00000000-0000-0000-0000-000000000001', 'Servicios Logísticos MX', 'SLM987654321', 'Transporte y logística', 'Banorte', '9876543210');
*/

-- ===========================================
-- FIN DEL SCRIPT
-- ===========================================
