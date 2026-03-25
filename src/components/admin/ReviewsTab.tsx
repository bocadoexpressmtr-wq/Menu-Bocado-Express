import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Star } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Review } from '../../types';

export default function ReviewsTab({ reviews }: { reviews: Review[] }) {
  const [editingReview, setEditingReview] = useState<Partial<Review> | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview?.customerName || !editingReview?.text || !editingReview?.rating) {
      alert("Por favor completa todos los campos.");
      return;
    }

    try {
      if (isAdding) {
        await addDoc(collection(db, 'reviews'), {
          customerName: editingReview.customerName,
          text: editingReview.text,
          rating: Number(editingReview.rating),
          isVisible: editingReview.isVisible ?? true,
          createdAt: new Date().toISOString()
        });
      } else if (editingReview.id) {
        await updateDoc(doc(db, 'reviews', editingReview.id), {
          customerName: editingReview.customerName,
          text: editingReview.text,
          rating: Number(editingReview.rating),
          isVisible: editingReview.isVisible ?? true,
        });
      }
      setEditingReview(null);
      setIsAdding(false);
    } catch (error) {
      console.error("Error saving review", error);
      alert("Error al guardar la reseña");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta reseña?")) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
    } catch (error) {
      console.error("Error deleting review", error);
      alert("Error al eliminar la reseña");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Reseñas</h2>
        <button onClick={() => { setIsAdding(true); setEditingReview({ rating: 5, isVisible: true }); }} className="bg-stone-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-stone-800 text-sm font-medium shadow-sm">
          <Plus size={16} /> Nueva Reseña
        </button>
      </div>

      {(isAdding || editingReview) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{isAdding ? 'Nueva Reseña' : 'Editar Reseña'}</h3>
            <button onClick={() => { setEditingReview(null); setIsAdding(false); }} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nombre del Cliente</label>
                <input required type="text" value={editingReview?.customerName || ''} onChange={e => setEditingReview({...editingReview, customerName: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Calificación (1-5)</label>
                <input required type="number" min="1" max="5" value={editingReview?.rating || ''} onChange={e => setEditingReview({...editingReview, rating: Number(e.target.value)})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Comentario</label>
                <textarea required value={editingReview?.text || ''} onChange={e => setEditingReview({...editingReview, text: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none" rows={3} />
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 cursor-pointer">
                <input type="checkbox" checked={editingReview?.isVisible ?? true} onChange={e => setEditingReview({...editingReview, isVisible: e.target.checked})} className="rounded text-stone-900 focus:ring-stone-900" />
                Visible en el menú
              </label>
            </div>
            <div className="flex justify-end pt-4 border-t border-stone-100">
              <button type="submit" className="bg-stone-900 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-stone-800 font-medium">
                <Save size={16} /> Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
            <tr>
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">Calificación</th>
              <th className="px-6 py-4 font-medium">Comentario</th>
              <th className="px-6 py-4 font-medium">Estado</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {reviews.map(review => (
              <tr key={review.id} className="hover:bg-stone-50">
                <td className="px-6 py-4 font-medium text-stone-900">{review.customerName}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className={i < review.rating ? "text-[#FDE047] fill-[#FDE047]" : "text-stone-300"} />
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-stone-600 max-w-xs truncate" title={review.text}>{review.text}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${review.isVisible ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-700'}`}>
                    {review.isVisible ? 'Visible' : 'Oculto'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => { setIsAdding(false); setEditingReview(review); }} className="text-stone-400 hover:text-blue-600 p-1"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(review.id!)} className="text-stone-400 hover:text-red-600 p-1 ml-2"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-stone-500">No hay reseñas. Agrega una nueva.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
