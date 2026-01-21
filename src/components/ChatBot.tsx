// ============================================
// CHATBOT COMPONENT - ASISTENTE FINANCIERO
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { Invoice, Remission, Supplier, ChatMessage as ChatMessageType } from '../types';
import { aiService } from '../services/aiService';
import { 
  Send, Bot, User, Loader2, Sparkles, FileText, 
  DollarSign, Calendar, Package, RefreshCw 
} from 'lucide-react';

interface Props {
  invoices: Invoice[];
  remissions: Remission[];
  suppliers: Supplier[];
}

const ChatBot: React.FC<Props> = ({ invoices, remissions, suppliers }) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente financiero de FinanzAI. Puedo ayudarte a consultar información sobre tus facturas, remisiones, entregas y saldos. ¿En qué puedo ayudarte?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Quick action suggestions
  const quickActions = [
    { icon: <DollarSign className="w-4 h-4" />, text: '¿Cuánto debo en total?', query: '¿Cuál es el saldo pendiente total?' },
    { icon: <Calendar className="w-4 h-4" />, text: 'Facturas del mes', query: '¿Qué facturas tengo de este mes?' },
    { icon: <Package className="w-4 h-4" />, text: 'Entregas pendientes', query: '¿Cuáles entregas están pendientes de confirmar?' },
    { icon: <FileText className="w-4 h-4" />, text: 'Resumen por proveedor', query: 'Dame un resumen de saldos por proveedor' }
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiService.chat(
        input.trim(),
        invoices,
        remissions,
        suppliers,
        messages
      );

      if (response.success && response.message) {
        const assistantMessage: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
          sources: response.sources
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (query: string) => {
    setInput(query);
    // Trigger send after setting input
    setTimeout(() => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      document.querySelector('input')?.dispatchEvent(event);
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: '¡Chat reiniciado! ¿En qué puedo ayudarte?',
      timestamp: new Date().toISOString()
    }]);
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-indigo-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Asistente Financiero</h2>
              <p className="text-indigo-200 text-sm">
                Consulta sobre {invoices.length} facturas y {remissions.length} remisiones
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            title="Reiniciar chat"
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Consultas rápidas</p>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(action.query)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
            >
              {action.icon}
              {action.text}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1 bg-slate-50 rounded-2xl rounded-tl-none p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analizando datos...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta sobre tus facturas, entregas, saldos..."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all pr-12"
              disabled={isLoading}
            />
            <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Powered by Claude AI • Los datos se procesan de forma segura
        </p>
      </div>
    </div>
  );
};

// Chat Message Component
const ChatMessage: React.FC<{ message: ChatMessageType }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-indigo-600' : 'bg-indigo-100'
      }`}>
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-indigo-600" />
        )}
      </div>
      
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-2xl p-4 ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-tr-none' 
            : 'bg-slate-50 text-slate-700 rounded-tl-none'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Facturas relacionadas
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium"
                >
                  <FileText className="w-3 h-3" />
                  {source.supplier_name} - ${source.total.toLocaleString('es-MX')}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className={`text-[10px] text-slate-400 mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString('es-MX', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
    </div>
  );
};

export default ChatBot;
