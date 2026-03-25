import React, { useState } from 'react';
import { Save, Store, Shield, Trash2, AlertTriangle, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { StoreSettings } from '../../types';
import { cn } from '../../lib/utils';

export default function SettingsTab({ settings }: { settings: StoreSettings }) {
  const [editingSettings, setEditingSettings] = useState<StoreSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        isStoreOpen: editingSettings.isStoreOpen,
        adminPin: editingSettings.adminPin || '021403',
        whatsappMessageHeader: editingSettings.whatsappMessageHeader,
        whatsappMessageFooter: editingSettings.whatsappMessageFooter,
        shareText: editingSettings.shareText
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings", error);
      alert("Error al guardar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">Configuración General</h2>
          <p className="text-stone-500 text-sm">Personaliza el funcionamiento de tu restaurante</p>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
            <CheckCircle size={16} />
            <span className="text-xs font-black uppercase tracking-wider">Guardado con éxito</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Store Status Card */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden relative group">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
                <Store size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">Estado del Local</h3>
                <p className="text-stone-400 text-xs font-medium">Controla si el restaurante está aceptando pedidos</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setEditingSettings({...editingSettings, isStoreOpen: !editingSettings.isStoreOpen})}
            className={cn(
              "p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between group/toggle",
              editingSettings.isStoreOpen 
                ? "bg-emerald-50/50 border-emerald-100 hover:border-emerald-200" 
                : "bg-red-50/50 border-red-100 hover:border-red-200"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-4 h-4 rounded-full animate-pulse",
                editingSettings.isStoreOpen ? "bg-emerald-500" : "bg-red-500"
              )} />
              <div>
                <p className={cn(
                  "text-sm font-black uppercase tracking-widest",
                  editingSettings.isStoreOpen ? "text-emerald-700" : "text-red-700"
                )}>
                  {editingSettings.isStoreOpen ? 'Abierto' : 'Cerrado'}
                </p>
                <p className="text-xs text-stone-500 font-medium">
                  {editingSettings.isStoreOpen ? 'Los clientes pueden realizar pedidos normalmente.' : 'Los clientes verán un aviso de local cerrado.'}
                </p>
              </div>
            </div>
            
            <div className={cn(
              "w-14 h-8 rounded-full p-1 transition-all duration-300",
              editingSettings.isStoreOpen ? "bg-emerald-500" : "bg-stone-200"
            )}>
              <div className={cn(
                "w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300",
                editingSettings.isStoreOpen ? "translate-x-6" : "translate-x-0"
              )} />
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100 group">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-stone-900">Seguridad del Panel</h3>
              <p className="text-stone-400 text-xs font-medium">Protege el acceso a la administración</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">PIN de Acceso (6 Dígitos)</label>
            <div className="relative max-w-xs">
              <input 
                required 
                type="text" 
                maxLength={6}
                value={editingSettings.adminPin || ''} 
                onChange={e => setEditingSettings({...editingSettings, adminPin: e.target.value})} 
                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-black text-2xl tracking-[0.5em] text-center" 
                placeholder="000000"
              />
            </div>
            <p className="text-xs text-stone-400 font-medium leading-relaxed">Este PIN se solicitará cada vez que intentes ingresar al panel desde un nuevo dispositivo.</p>
          </div>
        </div>

        {/* Custom Messages Card */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100 group">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-stone-900">Mensajes Personalizados</h3>
              <p className="text-stone-400 text-xs font-medium">Personaliza los textos que ven tus clientes</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Encabezado WhatsApp</label>
              <input 
                type="text" 
                value={editingSettings.whatsappMessageHeader || ''} 
                onChange={e => setEditingSettings({...editingSettings, whatsappMessageHeader: e.target.value})} 
                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium text-sm" 
                placeholder="🥪 *NUEVO PEDIDO - BOCADO EXPRESS*"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Pie de Mensaje WhatsApp</label>
              <input 
                type="text" 
                value={editingSettings.whatsappMessageFooter || ''} 
                onChange={e => setEditingSettings({...editingSettings, whatsappMessageFooter: e.target.value})} 
                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium text-sm" 
                placeholder="Vengo de Menú Digital Bocado Express"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Texto de Compartir</label>
              <textarea 
                rows={2}
                value={editingSettings.shareText || ''} 
                onChange={e => setEditingSettings({...editingSettings, shareText: e.target.value})} 
                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium text-sm resize-none" 
                placeholder="Los mejores cubanos y suizos de la ciudad"
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50/30 p-8 rounded-[2rem] border border-red-100 group">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-red-900">Zona de Peligro</h3>
              <p className="text-red-400 text-xs font-medium">Acciones irreversibles de mantenimiento</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-white rounded-3xl border border-red-100">
            <div>
              <p className="text-sm font-black text-stone-900 mb-1 uppercase tracking-tight">Limpieza de Historial</p>
              <p className="text-xs text-stone-500 font-medium">Elimina pedidos completados con más de 30 días.</p>
            </div>
            <button 
              type="button"
              onClick={async () => {
                if (!window.confirm("¿Estás seguro de que deseas eliminar TODOS los pedidos entregados con más de 30 días?")) return;
                alert("Estrategia de limpieza: En producción, esto ejecutaría una consulta para buscar pedidos con status 'completed' y createdAt < (Date.now() - 30 días) y los eliminaría.");
              }}
              className="w-full md:w-auto bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Ejecutar Limpieza
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-24 right-6 md:relative md:bottom-0 md:right-0 md:flex md:justify-end z-10">
          <button 
            type="submit" 
            disabled={isSaving}
            className="bg-stone-900 text-white px-10 py-4 rounded-2xl flex items-center gap-3 hover:bg-stone-800 font-black uppercase tracking-widest text-xs shadow-2xl shadow-stone-400 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
