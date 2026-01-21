// ============================================
// APP.TSX - APLICACIÓN PRINCIPAL
// ============================================

import { useState, useEffect } from 'react';
import { User, Company, Invoice, Remission, Supplier, PaymentStatus } from './types';
import { supabase } from './lib/supabase';
import { authService } from './services/authService';
import { invoiceService } from './services/invoiceService';
import { aiService } from './services/aiService';

// Components
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import InvoiceDashboard from './components/InvoiceDashboard';
import RemissionDashboard from './components/RemissionDashboard';
import SupplierDatabase from './components/SupplierDatabase';
import ChatBot from './components/ChatBot';
import AdminPanel from './components/AdminPanel';
import FileUploader from './components/FileUploader';
import NewSupplierModal from './components/NewSupplierModal';
import MissingFieldsForm from './components/MissingFieldsForm';
import PriceChangeAlert from './components/PriceChangeAlert';
import InvoicePreviewModal from './components/InvoicePreviewModal';
import UserManagement from './components/UserManagement';

import { Loader2, Bell, Users } from 'lucide-react';

type TabType = 'invoices' | 'remissions' | 'suppliers' | 'chat' | 'admin';

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  // Data state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [remissions, setRemissions] = useState<Remission[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>(['Iniciando...']);

  // Upload flow states
  const [pendingInvoiceData, setPendingInvoiceData] = useState<any>(null);
  const [pendingFileUrl, setPendingFileUrl] = useState<string>('');
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const [pendingFileType, setPendingFileType] = useState<string>('');
  const [pendingDocType, setPendingDocType] = useState<'invoice' | 'remission'>('invoice');
  
  // Modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false);
  const [showPriceChangeAlert, setShowPriceChangeAlert] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [detectedPriceChanges, setDetectedPriceChanges] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [missingFields, _setMissingFields] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log('[DEBUG]', msg);
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Check auth on mount
  useEffect(() => {
    addLog('useEffect iniciado');
    let isMounted = true;
    
    // Timeout de seguridad - si después de 10 segundos sigue cargando, mostrar login
    const timeout = setTimeout(() => {
      if (isLoading && isMounted) {
        addLog('TIMEOUT: Forzando fin de carga');
        setIsLoading(false);
      }
    }, 10000);
    
    checkAuth();
    
    // Solo escuchar SIGNED_OUT explícito, ignorar otros eventos
    // porque checkAuth ya maneja la carga inicial
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
      addLog(`Auth event: ${event}`);
      
      // Solo actuar en SIGNED_OUT real (no en TOKEN_REFRESHED u otros)
      if (event === 'SIGNED_OUT' && isMounted) {
        addLog('SIGNED_OUT detectado, reseteando...');
        resetState();
      }
      // Ignorar otros eventos - checkAuth ya maneja la carga inicial
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    addLog('checkAuth iniciado');
    setIsLoading(true);
    
    try {
      addLog('Obteniendo sesión...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        addLog(`Error sesión: ${sessionError.message}`);
        setIsLoading(false);
        return;
      }
      
      addLog(`Sesión: ${session ? 'existe' : 'no existe'}`);
      
      if (session?.user) {
        addLog(`Usuario Auth: ${session.user.email}`);
        addLog(`User ID: ${session.user.id.substring(0, 8)}...`);
        await loadUserData(session.user.id);
      } else {
        addLog('No hay sesión activa');
        setIsLoading(false);
      }
    } catch (error: any) {
      addLog(`ERROR en checkAuth: ${error.message}`);
      console.error('Auth check error:', error);
      setIsLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    addLog(`loadUserData: ${userId.substring(0, 8)}...`);
    
    try {
      // Obtener datos del auth primero (esto siempre funciona si hay sesión)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        addLog('No hay usuario autenticado');
        setIsLoading(false);
        return;
      }
      
      addLog(`Auth user: ${authUser.email}`);
      
      // 1. Buscar perfil
      addLog('Buscando perfil...');
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) {
        addLog(`Error buscando perfil: ${profileError.message}`);
      }
      
      let userProfile = profile;
      let companyId = profile?.company_id;
      
      // 2. Si no hay perfil, crear uno
      if (!userProfile) {
        addLog('Perfil no existe, creando...');
        
        // Buscar empresa existente
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id, name, rfc')
          .limit(1)
          .maybeSingle();
        
        companyId = existingCompany?.id;
        
        // Si no hay empresa, crear una
        if (!companyId) {
          addLog('Creando empresa...');
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({ name: 'Logan & Mason', rfc: 'LAM111118JNA' })
            .select()
            .single();
          
          if (companyError) {
            addLog(`Error creando empresa: ${companyError.message}`);
          }
          companyId = newCompany?.id;
        }
        
        if (companyId) {
          // Crear perfil
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: userId,
              email: authUser.email || 'usuario@logan.mx',
              full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
              role: 'admin',
              company_id: companyId
            })
            .select()
            .single();
          
          if (createError) {
            addLog(`Error creando perfil: ${createError.message}`);
          } else {
            userProfile = newProfile;
          }
        }
      }
      
      // 3. Crear usuario mínimo si no se pudo obtener de la BD
      if (!userProfile) {
        addLog('Usando datos mínimos del auth...');
        userProfile = {
          id: userId,
          email: authUser.email || 'usuario@logan.mx',
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
          role: 'admin' as const,
          company_id: companyId || '',
          created_at: new Date().toISOString()
        };
      }
      
      addLog(`✅ Usuario: ${userProfile.full_name || userProfile.email}`);
      setUser(userProfile as User);
      
      // 4. Cargar empresa si hay companyId
      if (userProfile.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userProfile.company_id)
          .maybeSingle();
        
        if (companyData) {
          setCompany(companyData);
          addLog(`✅ Empresa: ${companyData.name}`);
        } else {
          // Empresa por defecto
          setCompany({ id: userProfile.company_id, name: 'Mi Empresa', rfc: '', created_at: '' });
        }
        
        // 5. Cargar datos
        addLog('Cargando facturas...');
        await loadCompanyData(userProfile.company_id);
      }
      
      // 6. SIEMPRE autenticar si llegamos aquí
      addLog('✅ ¡Login completado!');
      setIsAuthenticated(true);
      
    } catch (error: any) {
      addLog(`❌ ERROR: ${error.message}`);
      console.error('loadUserData error:', error);
      
      // Aún así intentar autenticar con datos mínimos
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        addLog('Autenticando con datos mínimos...');
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.email?.split('@')[0] || 'Usuario',
          role: 'admin',
          company_id: '',
          created_at: new Date().toISOString()
        } as User);
        setIsAuthenticated(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanyData = async (companyId: string) => {
    if (!companyId) {
      addLog('⚠️ No hay company_id, saltando carga de datos');
      return;
    }
    
    try {
      // Cargar facturas (con timeout implícito por Supabase)
      try {
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        
        setInvoices((invoicesData || []) as Invoice[]);
        addLog(`✅ Facturas: ${invoicesData?.length || 0}`);
      } catch (e) {
        addLog('⚠️ Error cargando facturas');
      }

      // Cargar remisiones
      try {
        const { data: remissionsData } = await supabase
          .from('remissions')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        
        setRemissions((remissionsData || []) as Remission[]);
        addLog(`✅ Remisiones: ${remissionsData?.length || 0}`);
      } catch (e) {
        addLog('⚠️ Error cargando remisiones');
      }

      // Cargar proveedores
      try {
        const { data: suppliersData } = await supabase
          .from('suppliers')
          .select('*')
          .eq('company_id', companyId)
          .order('name');
        
        setSuppliers((suppliersData || []) as Supplier[]);
        addLog(`✅ Proveedores: ${suppliersData?.length || 0}`);
      } catch (e) {
        addLog('⚠️ Error cargando proveedores');
      }
      
    } catch (error: any) {
      addLog(`⚠️ Error general: ${error.message}`);
      console.error('Error loading company data:', error);
    }
  };

  const resetState = () => {
    setIsAuthenticated(false);
    setUser(null);
    setCompany(null);
    setInvoices([]);
    setRemissions([]);
    setSuppliers([]);
    // Limpiar estados de modales y datos pendientes
    setPendingInvoiceData(null);
    setPendingFileUrl('');
    setPendingFileName('');
    setPendingFileType('');
    setShowPreviewModal(false);
    setShowNewSupplierModal(false);
    setShowMissingFieldsModal(false);
    setShowPriceChangeAlert(false);
    setShowUserManagement(false);
  };

  const handleLogout = async () => {
    addLog('Iniciando logout...');
    try {
      // Primero resetear estado local
      resetState();
      
      // Cerrar sesión en Supabase
      await authService.signOut();
      addLog('Sesión cerrada correctamente');
      
      // Limpiar localStorage manualmente por si acaso
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Forzar recarga de la página para asegurar estado completamente limpio
      window.location.href = window.location.origin;
    } catch (error: any) {
      console.error('Logout error:', error);
      addLog(`Error en logout: ${error.message}`);
      
      // Incluso si hay error, forzar limpieza
      resetState();
      localStorage.clear(); // Limpieza agresiva
      window.location.href = window.location.origin;
    }
  };

  // Check if supplier exists
  const checkSupplierExists = (supplierName: string, rfcEmisor?: string): boolean => {
    if (!supplierName) return true;
    
    const normalizedName = supplierName.toLowerCase().trim();
    return suppliers.some(s => 
      s.name?.toLowerCase().trim() === normalizedName ||
      (rfcEmisor && s.rfc?.toUpperCase() === rfcEmisor.toUpperCase())
    );
  };

  // Check for price changes compared to historical data
  const checkPriceChanges = (newItems: any[], supplierName: string): any[] => {
    const priceChanges: any[] = [];
    
    // Get previous invoices from same supplier
    const supplierInvoices = invoices.filter(inv => 
      inv.supplier_name?.toLowerCase() === supplierName?.toLowerCase()
    );
    
    if (supplierInvoices.length === 0) return [];

    // Build price history from previous invoices
    const priceHistory: Record<string, { precio: number, fecha: string }> = {};
    
    supplierInvoices.forEach(inv => {
      const aiData = inv.ai_extracted_data as any;
      if (aiData?.conceptos) {
        aiData.conceptos.forEach((concepto: any) => {
          const codigo = concepto.codigo || concepto.clave_prod_serv || concepto.descripcion?.substring(0, 20);
          if (codigo && concepto.valor_unitario) {
            // Keep the most recent price
            if (!priceHistory[codigo] || inv.date > priceHistory[codigo].fecha) {
              priceHistory[codigo] = {
                precio: concepto.valor_unitario,
                fecha: inv.date
              };
            }
          }
        });
      }
    });

    // Compare new items with history
    if (newItems && Array.isArray(newItems)) {
      newItems.forEach(item => {
        const codigo = item.codigo || item.clave_prod_serv || item.descripcion?.substring(0, 20);
        if (codigo && priceHistory[codigo] && item.valor_unitario) {
          const oldPrice = priceHistory[codigo].precio;
          const newPrice = item.valor_unitario;
          
          if (Math.abs(oldPrice - newPrice) > 0.01) {
            const diferencia = newPrice - oldPrice;
            const porcentaje = ((newPrice - oldPrice) / oldPrice) * 100;
            
            priceChanges.push({
              codigo,
              producto: item.descripcion || codigo,
              precioAnterior: oldPrice,
              precioNuevo: newPrice,
              diferencia,
              porcentaje,
              fechaAnterior: priceHistory[codigo].fecha
            });
          }
        }
      });
    }

    return priceChanges;
  };

  // Save new supplier to database
  const handleSaveNewSupplier = async (supplierData: any) => {
    if (!company) return;
    
    try {
      // 1. Guardar el nuevo proveedor
      const { data: newSupplier, error } = await supabase
        .from('suppliers')
        .insert({
          company_id: company.id,
          name: supplierData.name,
          rfc: supplierData.rfc,
          insumo: supplierData.insumo,
          bank_name: supplierData.bank_name,
          bank_account: supplierData.bank_account,
          clabe: supplierData.clabe,
          contact_email: supplierData.contact_email,
          contact_phone: supplierData.contact_phone
        })
        .select()
        .single();

      if (error) throw error;
      
      setSuppliers(prev => [...prev, newSupplier as Supplier]);

      // 2. Ligar facturas existentes del mismo proveedor/RFC al nuevo supplier_id
      if (newSupplier && (supplierData.name || supplierData.rfc)) {
        try {
          // Buscar facturas que coincidan por nombre o RFC
          let query = supabase
            .from('invoices')
            .update({ supplier_id: newSupplier.id })
            .eq('company_id', company.id)
            .is('supplier_id', null); // Solo las que no tienen proveedor asignado

          // Filtrar por nombre o RFC
          if (supplierData.rfc) {
            query = query.or(`rfc_emisor.ilike.${supplierData.rfc},supplier_name.ilike.%${supplierData.name}%`);
          } else {
            query = query.ilike('supplier_name', `%${supplierData.name}%`);
          }

          const { error: updateError, count } = await query;
          
          if (!updateError && count && count > 0) {
            console.log(`✅ Se ligaron ${count} facturas existentes al proveedor ${supplierData.name}`);
          }
        } catch (linkError) {
          console.error('Error ligando facturas:', linkError);
          // No bloquear el flujo principal
        }
      }
      
      setShowNewSupplierModal(false);
      
      // 3. Continuar con el guardado de la factura actual
      if (pendingInvoiceData) {
        // Agregar supplier_id a los datos pendientes
        const dataWithSupplier = {
          ...pendingInvoiceData,
          supplier_id: newSupplier.id
        };
        await saveInvoiceOrRemission(dataWithSupplier);
      }
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      alert('Error al guardar proveedor: ' + error.message);
    }
  };

  // Handle missing fields form save
  const handleMissingFieldsSave = async (updatedData: any) => {
    setPendingInvoiceData(updatedData);
    setShowMissingFieldsModal(false);
    
    // Check if supplier exists now
    const supplierName = updatedData.nombre_emisor || updatedData.supplier_name;
    if (!checkSupplierExists(supplierName, updatedData.rfc_emisor)) {
      setShowNewSupplierModal(true);
    } else {
      await saveInvoiceOrRemission(updatedData);
    }
  };

  // Handle file upload with AI extraction
  const handleFileUpload = async (file: File) => {
    if (!user || !company) return;
    
    setIsProcessing(true);
    
    try {
      // 1. Extract data using Claude AI
      const extractionResult = await aiService.extractInvoiceData(file);
      
      if (!extractionResult.success || !extractionResult.data) {
        throw new Error(extractionResult.error || 'Error al extraer datos');
      }

      const extracted = extractionResult.data;
      const docType = extractionResult.type || (extracted.iva && extracted.iva > 0 ? 'invoice' : 'remission');

      // 2. Upload file to Supabase Storage
      const { url: fileUrl } = await invoiceService.uploadInvoiceFile(file, company.id);
      
      // 3. Store file info and extracted data
      setPendingFileUrl(fileUrl);
      setPendingFileName(file.name);
      setPendingFileType(file.type);
      setPendingInvoiceData(extracted);
      setPendingDocType(docType as 'invoice' | 'remission');

      // 4. Check for duplicates (only for invoices)
      if (docType === 'invoice') {
        const newInvoice: Partial<Invoice> = {
          uuid: extracted.uuid,
          rfc_emisor: extracted.rfc_emisor,
          folio: extracted.folio,
          supplier_name: extracted.nombre_emisor || 'Proveedor',
          total: extracted.total || 0,
          date: extracted.fecha_emision || new Date().toISOString().split('T')[0]
        };

        const duplicateCheck = invoiceService.checkDuplicate(newInvoice, invoices);
        
        if (duplicateCheck.is_duplicate) {
          if (duplicateCheck.match_type === 'uuid' || duplicateCheck.match_type === 'folio_rfc') {
            alert(duplicateCheck.message);
            setIsProcessing(false);
            return;
          } else if (duplicateCheck.match_type === 'proveedor_total_fecha') {
            if (!confirm(`${duplicateCheck.message}\n\n¿Desea registrarla de todas formas?`)) {
              setIsProcessing(false);
              return;
            }
          }
        }
      }

      // 5. SIEMPRE mostrar modal de preview para revisar/editar
      setShowPreviewModal(true);
      setIsProcessing(false);

    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Error: ${error.message || 'No se pudo procesar el documento'}`);
      setIsProcessing(false);
    }
  };

  // Handle preview confirmation - after user reviews and confirms data
  const handlePreviewConfirm = async (confirmedData: any) => {
    setShowPreviewModal(false);
    setPendingInvoiceData(confirmedData);

    const supplierName = confirmedData.nombre_emisor;
    const supplierRfc = confirmedData.rfc_emisor;

    // 1. Check for price changes (only for invoices with existing supplier)
    if (pendingDocType === 'invoice' && supplierName) {
      const priceChanges = checkPriceChanges(confirmedData.conceptos || [], supplierName);
      if (priceChanges.length > 0) {
        setDetectedPriceChanges(priceChanges);
        setShowPriceChangeAlert(true);
        return; // Wait for user to approve/reject price changes
      }
    }

    // 2. Check if supplier exists
    if (supplierName && !checkSupplierExists(supplierName, supplierRfc)) {
      // Supplier doesn't exist - show modal to add
      setShowNewSupplierModal(true);
    } else {
      // Supplier exists - save directly
      await saveInvoiceOrRemission(confirmedData);
    }
  };

  // Handle price change approval
  const handlePriceChangeApprove = async () => {
    setShowPriceChangeAlert(false);
    
    // Continue with supplier check
    const supplierName = pendingInvoiceData?.nombre_emisor;
    const supplierRfc = pendingInvoiceData?.rfc_emisor;
    
    if (supplierName && !checkSupplierExists(supplierName, supplierRfc)) {
      setShowNewSupplierModal(true);
    } else {
      await saveInvoiceOrRemission(pendingInvoiceData);
    }
  };

  // Handle price change rejection
  const handlePriceChangeReject = () => {
    setShowPriceChangeAlert(false);
    clearPendingData();
    alert('Factura cancelada. Verifica los precios con el proveedor.');
  };

  // Save invoice or remission after all validations
  const saveInvoiceOrRemission = async (data: any) => {
    if (!user || !company) return;

    try {
      // Buscar supplier_id si ya existe el proveedor
      let supplierId = data.supplier_id || null;
      if (!supplierId) {
        const supplierName = data.nombre_emisor || data.supplier_name;
        const supplierRfc = data.rfc_emisor;
        
        // Buscar por RFC primero (más confiable), luego por nombre
        const existingSupplier = suppliers.find(s => 
          (supplierRfc && s.rfc?.toUpperCase() === supplierRfc.toUpperCase()) ||
          s.name?.toLowerCase().trim() === supplierName?.toLowerCase().trim()
        );
        
        if (existingSupplier) {
          supplierId = existingSupplier.id;
        }
      }

      if (pendingDocType === 'invoice') {
        const { data: newInvoiceData, error } = await supabase
          .from('invoices')
          .insert({
            company_id: company.id,
            supplier_id: supplierId, // Ligar al proveedor si existe
            uuid: data.uuid,
            rfc_emisor: data.rfc_emisor,
            folio: data.folio,
            serie: data.serie,
            date: data.fecha_emision || data.date || new Date().toISOString().split('T')[0],
            supplier_name: data.nombre_emisor || data.supplier_name || 'Proveedor',
            insumo: data.conceptos?.[0]?.descripcion || data.insumo || 'General',
            amount_net: data.subtotal || data.amount_net || 0,
            iva: data.iva || 0,
            total: data.total || 0,
            payment_term: data.condiciones_pago || '30 días',
            payment_method: data.metodo_pago || data.payment_method || 'PUE',
            cfdi_use: data.uso_cfdi || data.cfdi_use || 'G03',
            delivery_confirmed: data.tiene_firma_recepcion || data.delivery_confirmed || false,
            status: PaymentStatus.PENDING,
            is_fiscal_valid: data.es_valido_fiscalmente ?? true,
            file_url: pendingFileUrl,
            file_name: pendingFileName,
            file_type: pendingFileType,
            ai_extracted_data: data,
            uploaded_by: user.id,
            uploaded_by_name: user.full_name
          })
          .select()
          .single();

        if (error) throw error;
        
        setInvoices(prev => [newInvoiceData as Invoice, ...prev]);
        alert(`✅ Factura de "${data.nombre_emisor || data.supplier_name}" registrada correctamente`);
      } else {
        // Create remission
        const { data: newRemissionData, error } = await supabase
          .from('remissions')
          .insert({
            company_id: company.id,
            supplier_id: supplierId,
            date: data.fecha_emision || new Date().toISOString().split('T')[0],
            supplier_name: data.nombre_emisor || 'Proveedor Desconocido',
            commodity_type: data.conceptos?.[0]?.descripcion || 'Mercancía',
            amount: data.subtotal || data.total || 0,
            status: PaymentStatus.PENDING,
            reception_confirmed: data.tiene_firma_recepcion || false,
            file_url: pendingFileUrl,
            file_name: pendingFileName,
            ai_extracted_data: data,
            uploaded_by: user.id,
            uploaded_by_name: user.full_name
          })
          .select()
          .single();

        if (error) throw error;
        
        setRemissions(prev => [newRemissionData as Remission, ...prev]);
        alert(`✅ Remisión de "${data.nombre_emisor}" registrada correctamente`);
      }

      // Clear pending data
      clearPendingData();
      
    } catch (error: any) {
      console.error('Error saving:', error);
      alert('Error al guardar: ' + error.message);
    }
  };

  // Clear all pending data
  const clearPendingData = () => {
    setPendingInvoiceData(null);
    setPendingFileUrl('');
    setPendingFileName('');
    setPendingFileType('');
  };

  // Download file handler
  const handleDownloadFile = async (item: Invoice | Remission) => {
    if (!item.file_url) {
      alert('Este documento no tiene archivo adjunto');
      return;
    }

    try {
      await invoiceService.downloadInvoiceFile(item.file_url, item.file_name || 'documento');
    } catch (error: any) {
      console.error('Download error:', error);
      // Try direct link as fallback
      window.open(item.file_url, '_blank');
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium mb-6">Cargando Portal Logan...</p>
          
          {/* Debug Log */}
          <div className="bg-slate-800 rounded-xl p-4 text-left mb-4 max-h-48 overflow-auto">
            <p className="text-xs text-slate-400 mb-2 font-bold">📋 Log de carga:</p>
            {debugLog.map((log, idx) => (
              <p key={idx} className={`text-xs font-mono ${log.includes('ERROR') ? 'text-red-400' : 'text-green-400'}`}>
                {log}
              </p>
            ))}
          </div>
          
          <button
            onClick={() => setIsLoading(false)}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Omitir y mostrar login
          </button>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated || !user) {
    return <Login onLogin={checkAuth} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent tracking-tight">
                {activeTab === 'invoices' && 'Facturas CFDI'}
                {activeTab === 'remissions' && 'Remisiones'}
                {activeTab === 'suppliers' && 'Proveedores'}
                {activeTab === 'chat' && 'Asistente Financiero'}
                {activeTab === 'admin' && 'Administración'}
              </h1>
              <p className="text-sm text-slate-500">
                {company?.name} • RFC: {company?.rfc}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Upload Buttons */}
              {(activeTab === 'invoices' || activeTab === 'remissions') && (
                <div className="flex items-center gap-2">
                  <FileUploader
                    onUpload={handleFileUpload}
                    isProcessing={isProcessing}
                  />
                </div>
              )}

              {/* Admin: User Management */}
              {user.role === 'admin' && (
                <button 
                  onClick={() => setShowUserManagement(true)}
                  className="relative p-2 hover:bg-indigo-100 rounded-xl transition-colors"
                  title="Administrar Usuarios"
                >
                  <Users className="w-5 h-5 text-indigo-500" />
                </button>
              )}

              {/* Notifications */}
              <button className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <Bell className="w-5 h-5 text-slate-400" />
                {invoices.filter(i => i.status === 'Pendiente').length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {activeTab === 'invoices' && (
            <InvoiceDashboard
              invoices={invoices}
              suppliers={suppliers}
              userRole={user.role}
              onUpdate={setInvoices}
              onDownloadFile={handleDownloadFile}
              companyId={company?.id || ''}
              userId={user.id}
              userName={user.full_name}
            />
          )}
          
          {activeTab === 'remissions' && (
            <RemissionDashboard
              remissions={remissions}
              onUpdate={setRemissions}
              onDownloadFile={handleDownloadFile}
              companyId={company?.id || ''}
            />
          )}
          
          {activeTab === 'suppliers' && (
            <SupplierDatabase
              suppliers={suppliers}
              invoices={invoices}
              onUpdate={setSuppliers}
              companyId={company?.id || ''}
            />
          )}
          
          {activeTab === 'chat' && (
            <ChatBot
              invoices={invoices}
              remissions={remissions}
              suppliers={suppliers}
            />
          )}
          
          {activeTab === 'admin' && user.role === 'admin' && (
            <AdminPanel
              currentUser={user}
              companyId={company?.id || ''}
            />
          )}
        </div>
      </main>

      {/* MODALES DE FLUJO DE CARGA */}
      
      {/* Modal: Campos Faltantes */}
      <MissingFieldsForm
        isOpen={showMissingFieldsModal}
        onClose={() => {
          setShowMissingFieldsModal(false);
          setPendingInvoiceData(null);
        }}
        onSave={handleMissingFieldsSave}
        initialData={pendingInvoiceData || {}}
        documentType="invoice"
        missingFields={missingFields}
        title="Completar Información de Factura"
      />

      {/* Modal: Preview/Edit Invoice before saving */}
      <InvoicePreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          clearPendingData();
        }}
        onConfirm={handlePreviewConfirm}
        extractedData={pendingInvoiceData}
        documentType={pendingDocType}
        fileName={pendingFileName}
      />

      {/* Modal: Nuevo Proveedor */}
      <NewSupplierModal
        isOpen={showNewSupplierModal}
        onClose={() => {
          setShowNewSupplierModal(false);
          // Continue saving without adding supplier
          if (pendingInvoiceData) {
            saveInvoiceOrRemission(pendingInvoiceData);
          }
        }}
        onSave={handleSaveNewSupplier}
        supplierName={pendingInvoiceData?.nombre_emisor || pendingInvoiceData?.supplier_name || ''}
        rfcEmisor={pendingInvoiceData?.rfc_emisor}
        insumo={pendingInvoiceData?.conceptos?.[0]?.descripcion || pendingInvoiceData?.insumo}
        extractedData={{
          telefono: pendingInvoiceData?.telefono_emisor || pendingInvoiceData?.telefono,
          email: pendingInvoiceData?.email_emisor || pendingInvoiceData?.email,
          direccion: pendingInvoiceData?.direccion_emisor || pendingInvoiceData?.direccion
        }}
      />

      {/* Modal: Alerta de Cambio de Precios */}
      <PriceChangeAlert
        isOpen={showPriceChangeAlert}
        onClose={() => setShowPriceChangeAlert(false)}
        onApprove={handlePriceChangeApprove}
        onReject={handlePriceChangeReject}
        priceChanges={detectedPriceChanges}
        supplierName={pendingInvoiceData?.nombre_emisor || ''}
      />

      {/* Modal: Administración de Usuarios (solo admins) */}
      {user && (
        <UserManagement
          isOpen={showUserManagement}
          onClose={() => setShowUserManagement(false)}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}

export default App;
