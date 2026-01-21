// ============================================
// NETLIFY FUNCTION - CLAUDE API HANDLER
// ============================================

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Prompt del sistema para extracción de facturas
const INVOICE_EXTRACTION_PROMPT = `Eres un experto contador fiscal mexicano especializado en análisis de CFDI (Comprobantes Fiscales Digitales por Internet).

Tu tarea es analizar documentos fiscales mexicanos (facturas CFDI, remisiones, notas de venta) y extraer TODA la información relevante con precisión absoluta.

CAMPOS CRÍTICOS A EXTRAER:

1. IDENTIFICADORES ÚNICOS (MUY IMPORTANTE para evitar duplicados):
   - uuid: Folio Fiscal del SAT (36 caracteres formato XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
   - rfc_emisor: RFC del emisor (12-13 caracteres)
   - folio: Número de folio interno
   - serie: Serie de la factura (A, B, etc.)

2. DATOS DEL EMISOR:
   - nombre_emisor: Razón social completa
   - regimen_fiscal_emisor: Régimen fiscal

3. DATOS DEL RECEPTOR:
   - rfc_receptor: RFC del receptor
   - nombre_receptor: Nombre o razón social
   - uso_cfdi: Uso del CFDI (G01, G03, etc.)

4. FECHAS:
   - fecha_emision: Fecha de emisión
   - fecha_timbrado: Fecha/hora del timbrado

5. CONCEPTOS (lista detallada de productos/servicios):
   - descripcion
   - cantidad
   - unidad
   - valor_unitario
   - importe

6. TOTALES:
   - subtotal
   - descuento (si aplica)
   - iva (debe ser 16% para facturas)
   - isr_retenido (si aplica)
   - iva_retenido (si aplica)
   - total

7. MÉTODO DE PAGO:
   - forma_pago: Código (01=Efectivo, 03=Transferencia, etc.)
   - metodo_pago: PUE (Pago en Una sola Exhibición) o PPD (Pago en Parcialidades)
   - condiciones_pago: Términos de pago

8. ENTREGA/RECEPCIÓN:
   - tiene_firma_recepcion: ¿Hay firma autógrafa o sello de recibido?
   - fecha_recepcion: Si está visible
   - nombre_receptor_entrega: Nombre de quien recibió

9. TIPO DE DOCUMENTO:
   - Si tiene IVA y UUID → es FACTURA (CFDI)
   - Si NO tiene IVA ni UUID → es REMISIÓN/Nota de venta

REGLAS DE VALIDACIÓN:
- El IVA en México es 16% del subtotal
- Verifica que total = subtotal + IVA - retenciones
- Busca el UUID cerca de "Folio Fiscal", en el timbre digital, o código QR
- Las firmas autógrafas pueden estar en cualquier parte del documento

Responde ÚNICAMENTE con un objeto JSON válido. No incluyas explicaciones adicionales.`;

// Prompt del sistema para el chatbot
const CHATBOT_SYSTEM_PROMPT = `Eres el asistente financiero inteligente de FinanzAI Hub, una plataforma de gestión fiscal para empresas mexicanas.

Tu rol es ayudar a los usuarios a consultar información sobre sus facturas, remisiones, proveedores y estado de pagos.

CAPACIDADES:
- Responder preguntas sobre facturas específicas
- Informar sobre entregas y recepciones de mercancía
- Calcular saldos por proveedor
- Identificar facturas pendientes de pago
- Buscar facturas por código, proveedor, fecha o monto
- Analizar datos extraídos de los documentos

FORMATO DE RESPUESTAS:
- Sé preciso y directo
- Incluye montos en formato $X,XXX.XX
- Menciona fechas en formato legible
- Si hay información extraída por IA de los documentos, úsala para dar respuestas más completas
- Si no tienes información suficiente, indícalo claramente

EJEMPLOS DE PREGUNTAS QUE PUEDES RESPONDER:
- "¿Se entregó el pedido con código ABC123?"
- "¿Cuánto le debo a Proveedor X?"
- "¿Qué facturas vencen esta semana?"
- "Muéstrame las facturas de enero"
- "¿Cuántas unidades de producto Y compramos?"

Siempre basa tus respuestas en los datos proporcionados en el contexto.`;

export async function handler(event) {
  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { action, data } = JSON.parse(event.body || '{}');

    if (action === 'extract_invoice') {
      return await handleInvoiceExtraction(data);
    } else if (action === 'chat') {
      return await handleChat(data);
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid action' })
      };
    }
  } catch (error) {
    console.error('Error in Claude API handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      })
    };
  }
}

async function handleInvoiceExtraction(data) {
  const { file_base64, file_type, file_name } = data;

  if (!file_base64) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'No file provided' })
    };
  }

  // Determinar el media type
  let mediaType = 'image/jpeg';
  if (file_type.includes('pdf')) {
    mediaType = 'application/pdf';
  } else if (file_type.includes('png')) {
    mediaType = 'image/png';
  } else if (file_type.includes('webp')) {
    mediaType = 'image/webp';
  } else if (file_type.includes('gif')) {
    mediaType = 'image/gif';
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: mediaType === 'application/pdf' ? 'document' : 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: file_base64
              }
            },
            {
              type: 'text',
              text: `Analiza este documento fiscal mexicano y extrae toda la información.
              
Nombre del archivo: ${file_name}

Responde con un JSON que tenga esta estructura:
{
  "type": "invoice" o "remission",
  "uuid": "...",
  "rfc_emisor": "...",
  "folio": "...",
  "serie": "...",
  "fecha_emision": "YYYY-MM-DD",
  "fecha_timbrado": "...",
  "nombre_emisor": "...",
  "regimen_fiscal_emisor": "...",
  "rfc_receptor": "...",
  "nombre_receptor": "...",
  "uso_cfdi": "...",
  "conceptos": [
    {
      "clave_prod_serv": "...",
      "descripcion": "...",
      "cantidad": 0,
      "unidad": "...",
      "valor_unitario": 0,
      "importe": 0
    }
  ],
  "subtotal": 0,
  "descuento": 0,
  "iva": 0,
  "isr_retenido": 0,
  "iva_retenido": 0,
  "total": 0,
  "forma_pago": "...",
  "metodo_pago": "...",
  "condiciones_pago": "...",
  "tiene_firma_recepcion": true/false,
  "fecha_recepcion": "...",
  "nombre_receptor_entrega": "...",
  "observaciones": "...",
  "es_valido_fiscalmente": true/false,
  "errores_detectados": []
}`
            }
          ]
        }
      ],
      system: INVOICE_EXTRACTION_PROMPT
    });

    // Extraer el JSON de la respuesta
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Intentar parsear el JSON
    let extractedData;
    try {
      // Buscar el JSON en la respuesta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          error: 'Error al parsear la respuesta de la IA',
          raw_response: responseText
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        type: extractedData.type || (extractedData.iva > 0 ? 'invoice' : 'remission'),
        data: extractedData
      })
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Error al procesar el documento'
      })
    };
  }
}

async function handleChat(data) {
  const { query, context, conversation_history } = data;

  if (!query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'No query provided' })
    };
  }

  try {
    // Construir el contexto de datos
    const dataContext = `
DATOS DE LA EMPRESA:

📊 RESUMEN:
- Total de facturas: ${context.summary.total_invoices}
- Total de remisiones: ${context.summary.total_remissions}
- Total de proveedores: ${context.summary.total_suppliers}
- Total facturado: $${context.summary.total_facturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- Total pagado: $${context.summary.total_pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
- Saldo pendiente: $${context.summary.total_pendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}

📋 FACTURAS:
${context.invoices.map(inv => `
- ID: ${inv.id}
  UUID: ${inv.uuid || 'N/A'}
  Folio: ${inv.serie || ''}${inv.folio || 'N/A'}
  Fecha: ${inv.date}
  Proveedor: ${inv.supplier_name}
  RFC: ${inv.rfc_emisor || 'N/A'}
  Insumo: ${inv.insumo}
  Neto: $${inv.amount_net.toFixed(2)}
  IVA: $${inv.iva.toFixed(2)}
  Total: $${inv.total.toFixed(2)}
  Estado: ${inv.status}
  Fecha de Pago: ${inv.payment_date || 'Pendiente'}
  Entrega Confirmada: ${inv.delivery_confirmed ? 'Sí' : 'No'}
  Método de Pago: ${inv.payment_method}
  ${inv.ai_extracted_data ? `Datos extraídos: ${JSON.stringify(inv.ai_extracted_data.conceptos || [])}` : ''}
`).join('\n')}

📦 REMISIONES:
${context.remissions.map(rem => `
- ID: ${rem.id}
  Fecha: ${rem.date}
  Proveedor: ${rem.supplier_name}
  Tipo: ${rem.commodity_type}
  Monto: $${rem.amount.toFixed(2)}
  Estado: ${rem.status}
  Recepción Confirmada: ${rem.reception_confirmed ? 'Sí' : 'No'}
  ${rem.ai_extracted_data ? `Datos extraídos: ${JSON.stringify(rem.ai_extracted_data)}` : ''}
`).join('\n')}

🏢 PROVEEDORES:
${context.suppliers.map(sup => `
- ${sup.name} (RFC: ${sup.rfc || 'N/A'}) - Insumo: ${sup.insumo}
`).join('\n')}
`;

    // Construir mensajes con historial
    const messages = [
      ...(conversation_history || []).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: `${dataContext}\n\n---\n\nPREGUNTA DEL USUARIO: ${query}`
      }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: CHATBOT_SYSTEM_PROMPT,
      messages: messages
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Identificar facturas mencionadas en la respuesta para referencias
    const sources = [];
    for (const inv of context.invoices) {
      if (responseText.toLowerCase().includes(inv.supplier_name.toLowerCase()) ||
          (inv.folio && responseText.includes(inv.folio)) ||
          (inv.uuid && responseText.includes(inv.uuid.slice(0, 8)))) {
        sources.push({
          invoice_id: inv.id,
          supplier_name: inv.supplier_name,
          date: inv.date,
          total: inv.total,
          relevance: 'Mencionada en la respuesta'
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: responseText,
        sources: sources.slice(0, 5) // Máximo 5 referencias
      })
    };
  } catch (error) {
    console.error('Chat error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Error al procesar la consulta'
      })
    };
  }
}
