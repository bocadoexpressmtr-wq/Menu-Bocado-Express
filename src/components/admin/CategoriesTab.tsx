import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Category } from '../../types';

export default function CategoriesTab() {
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

  if (loading && categories.length === 0) return <div className="p-8 text-center text-stone-500 font-medium">Cargando categorías...</div>;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) {
      alert("Por favor completa el nombre.");
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
      alert("Error al guardar la categoría");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta categoría? Los productos asociados quedarán sin categoría visible.")) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      alert("Categoría eliminada");
    } catch (error) {
      console.error("Error deleting category", error);
      alert("Error al eliminar la categoría: Permiso denegado");
    }
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{isAdding ? 'Nueva Categoría' : 'Editar Categoría'}</h3>
            <button onClick={() => { setEditingCategory(null); setIsAdding(false); }} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nombre</label>
                <input required type="text" value={editingCategory?.name || ''} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Orden (Número)</label>
                <input required type="number" value={editingCategory?.order || ''} onChange={e => setEditingCategory({...editingCategory, order: Number(e.target.value)})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none" />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-stone-100">
              <button type="submit" className="bg-stone-900 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-stone-800 font-medium">
                <Save size={16} /> Guardar
              </button>
            </div>
          </form>
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
                  <button onClick={() => { setIsAdding(false); setEditingCategory(category); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-stone-400 hover:text-blue-600 p-1"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(category.id)} className="text-stone-400 hover:text-red-600 p-1 ml-2"><Trash2 size={16} /></button>
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
            <div className="flex items-center gap-2">
              <button onClick={() => { setIsAdding(false); setEditingCategory(category); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-stone-400 hover:text-blue-600">
                <Edit2 size={18} />
              </button>
              <button onClick={() => handleDelete(category.id)} className="p-2 text-stone-400 hover:text-red-600">
                <Trash2 size={18} />
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
