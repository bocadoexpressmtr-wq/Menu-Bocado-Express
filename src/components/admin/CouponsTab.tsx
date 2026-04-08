import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Coupon } from '../../types';
import { Plus, Edit2, Trash2, X, Check, Tag } from 'lucide-react';
import { useDialog } from '../../context/DialogContext';

export default function CouponsTab() {
  const { showAlert, showConfirm } = useDialog();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Coupon>({
    code: '',
    discountType: 'percentage',
    discountValue: 0,
    minOrderValue: 0,
    isActive: true,
    expiryDate: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'coupons'), orderBy('code'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newCoupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
      setCoupons(newCoupons);
    }, (err) => {
      console.error("Coupons Error:", err);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        code: formData.code.toUpperCase().trim()
      };

      if (editingId) {
        await updateDoc(doc(db, 'coupons', editingId), dataToSave);
      } else {
        await addDoc(collection(db, 'coupons'), dataToSave);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving coupon:", error);
      showAlert("Error", "Error al guardar el cupón", 'error');
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm(
      "¿Eliminar Cupón?",
      "¿Seguro que deseas eliminar este cupón?",
      async () => {
        try {
          await deleteDoc(doc(db, 'coupons', id));
          showAlert("Eliminado", "Cupón eliminado", 'success');
        } catch (error) {
          console.error("Error deleting coupon", error);
          showAlert("Error", "Error al eliminar el cupón: Permiso denegado", 'error');
        }
      }
    );
  };

  const toggleActive = async (coupon: Coupon) => {
    if (!coupon.id) return;
    try {
      await updateDoc(doc(db, 'coupons', coupon.id), { isActive: !coupon.isActive });
    } catch (error) {
      console.error("Error updating coupon:", error);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      code: '',
      discountType: 'percentage',
      discountValue: 0,
      minOrderValue: 0,
      isActive: true,
      expiryDate: ''
    });
  };

  const editCoupon = (coupon: Coupon) => {
    setFormData({
      ...coupon,
      expiryDate: coupon.expiryDate || ''
    });
    setEditingId(coupon.id!);
    setIsAdding(true);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-stone-800">Cupones de Descuento</h2>
        {!isAdding && (
          <button
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl hover:bg-stone-800 transition-colors"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nuevo Cupón</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl border border-stone-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-stone-50 flex justify-between items-center z-10">
              <h3 className="text-xl font-black text-stone-900">
                {editingId ? 'Editar Cupón' : 'Nuevo Cupón'}
              </h3>
              <button onClick={resetForm} className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 text-stone-400 hover:text-stone-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Código del Cupón</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-bold uppercase"
                    placeholder="EJ: BOCADO10"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Tipo de Descuento</label>
                  <select
                    value={formData.discountType}
                    onChange={e => setFormData({...formData, discountType: e.target.value as 'percentage' | 'fixed'})}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-bold appearance-none"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo ($)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">
                    Valor del Descuento {formData.discountType === 'percentage' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={formData.discountType === 'percentage' ? "100" : undefined}
                    value={formData.discountValue || ''}
                    onChange={e => setFormData({...formData, discountValue: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Compra Mínima ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.minOrderValue || ''}
                    onChange={e => setFormData({...formData, minOrderValue: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Fecha de Vencimiento (Opcional)</label>
                  <input
                    type="date"
                    value={formData.expiryDate || ''}
                    onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="w-5 h-5 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-stone-600 uppercase tracking-tight cursor-pointer">
                  Cupón Activo
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-stone-50">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 text-stone-400 font-black uppercase tracking-wider text-xs hover:text-stone-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-stone-900 text-white px-8 py-3 rounded-2xl flex items-center gap-2 hover:bg-stone-800 font-black uppercase tracking-wider text-xs shadow-lg shadow-stone-200 transition-all active:scale-95"
                >
                  {editingId ? 'Actualizar Cupón' : 'Guardar Cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="p-4 font-semibold text-stone-600">Código</th>
                <th className="p-4 font-semibold text-stone-600">Descuento</th>
                <th className="p-4 font-semibold text-stone-600">Compra Mín.</th>
                <th className="p-4 font-semibold text-stone-600">Vence</th>
                <th className="p-4 font-semibold text-stone-600">Estado</th>
                <th className="p-4 font-semibold text-stone-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(coupon => (
                <tr key={coupon.id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-stone-400" />
                      <span className="font-bold text-stone-800">{coupon.code}</span>
                    </div>
                  </td>
                  <td className="p-4 text-stone-600">
                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue.toLocaleString()}`}
                  </td>
                  <td className="p-4 text-stone-600">
                    ${coupon.minOrderValue.toLocaleString()}
                  </td>
                  <td className="p-4 text-stone-600 text-xs">
                    {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : 'Nunca'}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(coupon)}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        coupon.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {coupon.isActive ? 'ACTIVO' : 'INACTIVO'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => editCoupon(coupon)}
                        className="p-2.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all active:scale-90"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id!)}
                        className="p-2.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-500">
                    No hay cupones registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
