import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Category } from '../../types';
import { useDialog } from '../../context/DialogContext';

export default function CategoriesTab() {
  const { showAlert, showConfirm } = useDialog();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'categories'), orderBy('order')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const [isAdding, setIsAdding] = useState(false);

  const closeForm = () => {
    setEditingCategory(null);
    setIsAdding(false);
  };

  if (loading && categories.length === 0) return <div className="p-8 text-center text-stone-500 font-medium">Cargando categorías...</div>;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) {
      showAlert("Campo incompleto", "Por favor completa el nombre.");
      return;
    }

    try {
      if (isAdding) {
        await addDoc(collection(db, 'categories'), {
          name: editingCategory.name,
          order: Number(editingCategory.order || 0)
        });
      } else if (editingCategory.id) {
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          name: editingCategory.name,
          order: Number(editingCategory.order || 0)
        });
      }
      setEditingCategory(null);
      setIsAdding(false);
    } catch (error) {
      console.error("Error saving category", error);
      showAlert("Error", "Error al guardar la categoría", 'error');
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm(
      "¿Eliminar Categoría?",
      "¿Seguro que deseas eliminar esta categoría? Los productos asociados quedarán sin categoría visible.",
      async () => {
        try {
          await deleteDoc(doc(db, 'categories', id));
          showAlert("Eliminada", "Categoría eliminada", 'success');
        } catch (error) {
          console.error("Error deleting category", error);
          showAlert("Error", "Error al eliminar la categoría: Permiso denegado", 'error');
        }
      }
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Categorías</h2>
        <button onClick={() => { setIsAdding(true); setEditingCategory({ order: categories.length + 1 }); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full sm:w-auto bg-stone-900 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-stone-800 text-sm font-medium shadow-sm">
          <Plus size={16} /> Nueva Categoría
        </button>
      </div>

      {(isAdding || editingCategory) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-stone-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-stone-900">{isAdding ? 'Nueva Categoría' : 'Editar Categoría'}</h3>
              <button onClick={closeForm} className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 text-stone-400 hover:text-stone-600 transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Nombre de la Categoría</label>
                  <input required type="text" value={editingCategory?.name || ''} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium" placeholder="Ej: Suizos" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Orden de Visualización</label>
                  <input required type="number" value={editingCategory?.order || ''} onChange={e => setEditingCategory({...editingCategory, order: Number(e.target.value)})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-bold" placeholder="Ej: 1" />
                </div>
              </div>
              
              <div className="flex justify-end pt-6 border-t border-stone-50 gap-3">
                <button type="button" onClick={closeForm} className="px-6 py-3 rounded-2xl text-stone-400 font-black uppercase tracking-wider text-xs hover:text-stone-600 transition-colors">Cancelar</button>
                <button type="submit" className="bg-stone-900 text-white px-8 py-3 rounded-2xl flex items-center gap-2 hover:bg-stone-800 font-black uppercase tracking-wider text-xs shadow-lg shadow-stone-200 transition-all active:scale-95">
                  <Save size={18} /> Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
            <tr>
              <th className="px-6 py-4 font-medium">Orden</th>
              <th className="px-6 py-4 font-medium">Nombre</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {categories.map(category => (
              <tr key={category.id} className="hover:bg-stone-50">
                <td className="px-6 py-4 text-stone-500">{category.order}</td>
                <td className="px-6 py-4 font-medium text-stone-900">{category.name}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => { setIsAdding(false); setEditingCategory(category); }} className="text-stone-400 hover:text-stone-900 p-2 transition-colors"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(category.id)} className="text-stone-400 hover:text-red-600 p-2 ml-2 transition-colors"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-stone-500">No hay categorías. Agrega una nueva.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile List */}
      <div className="md:hidden space-y-3">
        {categories.map(category => (
          <div key={category.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center text-stone-500 text-xs font-bold">
                {category.order}
              </span>
              <span className="font-medium text-stone-900">{category.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setIsAdding(false); setEditingCategory(category); }} className="p-3 text-stone-400 hover:text-stone-900 transition-all active:scale-90">
                <Edit2 size={20} />
              </button>
              <button onClick={() => handleDelete(category.id)} className="p-3 text-stone-400 hover:text-red-600 transition-all active:scale-90">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="p-8 text-center text-stone-500 bg-white rounded-xl border border-stone-200">
            No hay categorías. Agrega una nueva.
          </div>
        )}
      </div>
    </div>
  );
}
