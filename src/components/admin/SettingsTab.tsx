import React, { useState } from 'react';
import { Save, Store } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { StoreSettings } from '../../types';

export default function SettingsTab({ settings }: { settings: StoreSettings }) {
  const [editingSettings, setEditingSettings] = useState<StoreSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        isStoreOpen: editingSettings.isStoreOpen,
        adminPin: editingSettings.adminPin || '021403'
      });
      alert("Configuración guardada exitosamente");
    } catch (error) {
      console.error("Error saving settings", error);
      alert("Error al guardar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Configuración de la Tienda</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Store size={20} className="text-stone-500" />
            Estado de la Tienda
          </h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 cursor-pointer">
              <input 
                type="checkbox" 
                checked={editingSettings.isStoreOpen} 
                onChange={e => setEditingSettings({...editingSettings, isStoreOpen: e.target.checked})} 
                className="rounded text-stone-900 focus:ring-stone-900 w-5 h-5" 
              />
              <span className={editingSettings.isStoreOpen ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                {editingSettings.isStoreOpen ? 'Abierto (Aceptando pedidos)' : 'Cerrado (No se aceptan pedidos)'}
              </span>
            </label>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold mb-4">Seguridad</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">PIN de Administrador (6 dígitos)</label>
              <input 
                required 
                type="text" 
                maxLength={6}
                value={editingSettings.adminPin || ''} 
                onChange={e => setEditingSettings({...editingSettings, adminPin: e.target.value})} 
                className="w-full md:w-1/2 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none tracking-widest" 
              />
              <p className="text-xs text-stone-500 mt-1">Este PIN se requiere para ingresar al Panel de Administración.</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold mb-4 text-red-600">Zona de Peligro</h3>
          <p className="text-sm text-stone-500 mb-4">Acciones irreversibles para el mantenimiento de la base de datos.</p>
          <button 
            type="button"
            onClick={async () => {
              if (!window.confirm("¿Estás seguro de que deseas eliminar TODOS los pedidos entregados con más de 30 días de antigüedad? Esta acción no se puede deshacer.")) return;
              try {
                // In a real app, this should be a cloud function or a batched delete.
                // For this prototype, we'll just show an alert explaining the strategy.
                alert("Estrategia de limpieza: En producción, esto ejecutaría una consulta para buscar pedidos con status 'completed' y createdAt < (Date.now() - 30 días) y los eliminaría en lotes.");
              } catch (e) {
                console.error(e);
              }
            }}
            className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors text-sm"
          >
            Eliminar Pedidos Antiguos (30+ días)
          </button>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isSaving}
            className="bg-stone-900 text-white px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-stone-800 font-medium disabled:opacity-50"
          >
            <Save size={20} /> {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
