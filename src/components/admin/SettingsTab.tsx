import React, { useState } from 'react';
import { Save, Store, Shield, Trash2, AlertTriangle, CheckCircle, Loader2, MessageSquare, Share2, Plus, Globe, Instagram, Facebook, Music2, MessageCircle, Youtube, Twitter, Image } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { StoreSettings, SocialLink } from '../../types';
import { cn } from '../../lib/utils';
import { useDialog } from '../../context/DialogContext';

export default function SettingsTab({ settings }: { settings: StoreSettings }) {
  const { showAlert, showConfirm } = useDialog();
  const [editingSettings, setEditingSettings] = useState<StoreSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  React.useEffect(() => {
    setEditingSettings(settings);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'store'), {
        isStoreOpen: editingSettings.isStoreOpen,
        storeStatusMode: editingSettings.storeStatusMode || 'manual',
        autoOpenTime: editingSettings.autoOpenTime || '12:00',
        autoCloseTime: editingSettings.autoCloseTime || '22:00',
        whatsappNumber: editingSettings.whatsappNumber,
        nequiNumber: editingSettings.nequiNumber,
        whatsappMessageHeader: editingSettings.whatsappMessageHeader,
        whatsappMessageFooter: editingSettings.whatsappMessageFooter,
        shareText: editingSettings.shareText,
        socialLinks: editingSettings.socialLinks || [],
        cloudinaryCloudName: editingSettings.cloudinaryCloudName || '',
        cloudinaryUploadPreset: editingSettings.cloudinaryUploadPreset || ''
      }, { merge: true });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings", error);
      showAlert("Error", "Error al guardar la configuración", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addSocialLink = () => {
    const newLink: SocialLink = {
      id: Math.random().toString(36).substr(2, 9),
      platform: 'Instagram',
      url: '',
      icon: 'Instagram'
    };
    setEditingSettings({
      ...editingSettings,
      socialLinks: [...(editingSettings.socialLinks || []), newLink]
    });
  };

  const removeSocialLink = (id: string) => {
    setEditingSettings({
      ...editingSettings,
      socialLinks: (editingSettings.socialLinks || []).filter(link => link.id !== id)
    });
  };

  const updateSocialLink = (id: string, updates: Partial<SocialLink>) => {
    setEditingSettings({
      ...editingSettings,
      socialLinks: (editingSettings.socialLinks || []).map(link => 
        link.id === id ? { ...link, ...updates } : link
      )
    });
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Instagram': return <Instagram size={18} />;
      case 'Facebook': return <Facebook size={18} />;
      case 'Music2': return <Music2 size={18} />;
      case 'MessageCircle': return <MessageCircle size={18} />;
      case 'Youtube': return <Youtube size={18} />;
      case 'Twitter': return <Twitter size={18} />;
      default: return <Globe size={18} />;
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Configuración General</h2>
          <p className="text-stone-500 text-xs">Personaliza el funcionamiento de tu restaurante</p>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
            <CheckCircle size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">Guardado con éxito</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Status Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 overflow-hidden relative group">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
                <Store size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900">Estado del Local</h3>
                <p className="text-stone-400 text-[10px] font-medium">Controla si el restaurante está aceptando pedidos</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditingSettings({...editingSettings, storeStatusMode: 'manual'})}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all",
                  (!editingSettings.storeStatusMode || editingSettings.storeStatusMode === 'manual')
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                )}
              >
                Control Manual
              </button>
              <button
                type="button"
                onClick={() => setEditingSettings({...editingSettings, storeStatusMode: 'auto'})}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all",
                  editingSettings.storeStatusMode === 'auto'
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                )}
              >
                Horario Automático
              </button>
            </div>

            {(!editingSettings.storeStatusMode || editingSettings.storeStatusMode === 'manual') ? (
              <div 
                onClick={() => setEditingSettings({...editingSettings, isStoreOpen: !editingSettings.isStoreOpen})}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group/toggle",
                  editingSettings.isStoreOpen 
                    ? "bg-emerald-50/50 border-emerald-100 hover:border-emerald-200" 
                    : "bg-red-50/50 border-red-100 hover:border-red-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full animate-pulse",
                    editingSettings.isStoreOpen ? "bg-emerald-500" : "bg-red-500"
                  )} />
                  <div>
                    <p className={cn(
                      "text-xs font-black uppercase tracking-widest",
                      editingSettings.isStoreOpen ? "text-emerald-700" : "text-red-700"
                    )}>
                      {editingSettings.isStoreOpen ? 'Abierto' : 'Cerrado'}
                    </p>
                    <p className="text-[10px] text-stone-500 font-medium">
                      {editingSettings.isStoreOpen ? 'Los clientes pueden realizar pedidos normalmente.' : 'Los clientes verán un aviso de local cerrado.'}
                    </p>
                  </div>
                </div>
                
                <div className={cn(
                  "w-10 h-6 rounded-full p-1 transition-all duration-300",
                  editingSettings.isStoreOpen ? "bg-emerald-500" : "bg-stone-200"
                )}>
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                    editingSettings.isStoreOpen ? "translate-x-4" : "translate-x-0"
                  )} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4 bg-stone-50 rounded-xl border border-stone-100">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Hora de Apertura</label>
                  <input 
                    type="time" 
                    value={editingSettings.autoOpenTime || '12:00'} 
                    onChange={e => setEditingSettings({...editingSettings, autoOpenTime: e.target.value})} 
                    className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium text-xs" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Hora de Cierre</label>
                  <input 
                    type="time" 
                    value={editingSettings.autoCloseTime || '22:00'} 
                    onChange={e => setEditingSettings({...editingSettings, autoCloseTime: e.target.value})} 
                    className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium text-xs" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Custom Messages Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 group">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">Mensajes Personalizados</h3>
              <p className="text-stone-400 text-[10px] font-medium">Personaliza los textos que ven tus clientes</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Número de WhatsApp (con código de país, ej: 573000000000)</label>
              <input 
                type="text" 
                value={editingSettings.whatsappNumber || ''} 
                onChange={e => setEditingSettings({...editingSettings, whatsappNumber: e.target.value})} 
                className="w-full px-4 py-2 bg-stone-50 border border-stone-100 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium text-xs" 
                placeholder="573144052399"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Número de Nequi / Transferencia</label>
              <input 
                type="text" 
                value={editingSettings.nequiNumber || ''} 
                onChange={e => setEditingSettings({...editingSettings, nequiNumber: e.target.value})} 
                className="w-full px-4 py-2 bg-stone-50 border border-stone-100 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium text-xs" 
                placeholder="3124726152"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Encabezado WhatsApp</label>
              <input 
                type="text" 
                value={editingSettings.whatsappMessageHeader || ''} 
                onChange={e => setEditingSettings({...editingSettings, whatsappMessageHeader: e.target.value})} 
                className="w-full px-4 py-2 bg-stone-50 border border-stone-100 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium text-xs" 
                placeholder="🥪 *NUEVO PEDIDO - BOCADO EXPRESS*"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Pie de Mensaje WhatsApp</label>
              <input 
                type="text" 
                value={editingSettings.whatsappMessageFooter || ''} 
                onChange={e => setEditingSettings({...editingSettings, whatsappMessageFooter: e.target.value})} 
                className="w-full px-4 py-2 bg-stone-50 border border-stone-100 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium text-xs" 
                placeholder="Vengo de Menú Digital Bocado Express"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Texto de Compartir</label>
              <textarea 
                rows={2}
                value={editingSettings.shareText || ''} 
                onChange={e => setEditingSettings({...editingSettings, shareText: e.target.value})} 
                className="w-full px-4 py-2 bg-stone-50 border border-stone-100 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium text-xs resize-none" 
                placeholder="Los mejores cubanos y suizos de la ciudad"
              />
            </div>
          </div>
        </div>

        {/* Social Links Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
                <Share2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900">Redes Sociales</h3>
                <p className="text-stone-400 text-[10px] font-medium">Configura los enlaces de tu pie de página</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={addSocialLink}
              className="flex items-center gap-1.5 bg-stone-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-stone-800 transition-all active:scale-95"
            >
              <Plus size={12} />
              Agregar Red
            </button>
          </div>

          <div className="space-y-3">
            {(editingSettings.socialLinks || []).map((link) => (
              <div key={link.id} className="flex flex-col md:flex-row items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-100 group/link">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-stone-900 shadow-sm">
                    {getIcon(link.icon)}
                  </div>
                  <select 
                    value={link.platform}
                    onChange={e => {
                      const platform = e.target.value;
                      let icon = 'Globe';
                      if (platform === 'Instagram') icon = 'Instagram';
                      if (platform === 'Facebook') icon = 'Facebook';
                      if (platform === 'TikTok') icon = 'Music2';
                      if (platform === 'WhatsApp') icon = 'MessageCircle';
                      if (platform === 'YouTube') icon = 'Youtube';
                      if (platform === 'Twitter') icon = 'Twitter';
                      updateSocialLink(link.id, { platform, icon });
                    }}
                    className="bg-transparent font-black text-[10px] uppercase tracking-widest outline-none cursor-pointer"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="TikTok">TikTok</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Twitter">Twitter/X</option>
                    <option value="Web">Sitio Web</option>
                  </select>
                </div>
                
                <input 
                  type="url" 
                  value={link.url}
                  onChange={e => updateSocialLink(link.id, { url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 w-full px-3 py-1.5 bg-white border border-stone-100 rounded-lg text-xs font-medium focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                />

                <button 
                  type="button"
                  onClick={() => removeSocialLink(link.id)}
                  className="p-1.5 text-stone-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {(editingSettings.socialLinks || []).length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-stone-100 rounded-xl">
                <p className="text-stone-400 text-xs font-medium">No has configurado redes sociales aún.</p>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50/30 p-6 rounded-2xl border border-red-100 group">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-500">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-red-900">Zona de Peligro</h3>
              <p className="text-red-400 text-[10px] font-medium">Acciones irreversibles de mantenimiento</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-red-100">
            <div>
              <p className="text-xs font-black text-stone-900 mb-0.5 uppercase tracking-tight">Limpieza de Historial</p>
              <p className="text-[10px] text-stone-500 font-medium">Elimina pedidos completados con más de 30 días.</p>
            </div>
            <button 
              type="button"
              onClick={async () => {
                showConfirm(
                  "¿Limpiar Historial?",
                  "¿Estás seguro de que deseas eliminar TODOS los pedidos entregados con más de 30 días?",
                  () => {
                    showAlert("Información", "Estrategia de limpieza: En producción, esto ejecutaría una consulta para buscar pedidos con status 'completed' y createdAt < (Date.now() - 30 días) y los eliminaría.");
                  }
                );
              }}
              className="w-full md:w-auto bg-red-50 text-red-600 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 size={14} />
              Ejecutar Limpieza
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-24 right-6 md:relative md:bottom-0 md:right-0 md:flex md:justify-end z-10">
          <button 
            type="submit" 
            disabled={isSaving}
            className="bg-stone-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-stone-800 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-stone-400 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
