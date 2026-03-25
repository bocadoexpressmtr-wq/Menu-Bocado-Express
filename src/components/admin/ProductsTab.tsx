import React, { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, DatabaseZap, X, Save, Upload, Loader2 } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { Product, Category } from '../../types';

export default function ProductsTab({ products, categories }: { products: Product[], categories: Category[] }) {
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Por favor selecciona un archivo de imagen válido.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload error:", error);
        alert("Error al subir la imagen. Verifica los permisos de Firebase Storage.");
        setIsUploading(false);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setEditingProduct(prev => ({ ...prev, imageUrl: downloadURL }));
        setIsUploading(false);
        setUploadProgress(0);
      }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.price || !editingProduct?.categoryId) {
      alert("Por favor completa los campos requeridos.");
      return;
    }

    try {
      if (isAdding) {
        await addDoc(collection(db, 'products'), {
          ...editingProduct,
          price: Number(editingProduct.price),
          isAvailable: editingProduct.isAvailable ?? true,
          isPopular: editingProduct.isPopular ?? false,
          isDailyOffer: editingProduct.isDailyOffer ?? false,
          isUpsell: editingProduct.isUpsell ?? false,
        });
      } else if (editingProduct.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...editingProduct,
          price: Number(editingProduct.price)
        });
      }
      setEditingProduct(null);
      setIsAdding(false);
    } catch (error) {
      console.error("Error saving product", error);
      alert("Error al guardar el producto");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este producto?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      console.error("Error deleting product", error);
      alert("Error al eliminar el producto");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Productos</h2>
        <div className="flex gap-2">
          <button onClick={() => { setIsAdding(true); setEditingProduct({ isAvailable: true }); }} className="bg-stone-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-stone-800 text-sm font-medium shadow-sm">
            <Plus size={16} /> Nuevo Producto
          </button>
        </div>
      </div>

      {(isAdding || editingProduct) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{isAdding ? 'Nuevo Producto' : 'Editar Producto'}</h3>
            <button onClick={() => { setEditingProduct(null); setIsAdding(false); }} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nombre</label>
                <input required type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Precio</label>
                <input required type="number" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Descripción</label>
                <textarea value={editingProduct?.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Categoría</label>
                <select required value={editingProduct?.categoryId || ''} onChange={e => setEditingProduct({...editingProduct, categoryId: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none">
                  <option value="">Selecciona una categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Imagen del Producto</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="URL de imagen"
                    value={editingProduct?.imageUrl || ''} 
                    onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} 
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none text-sm" 
                  />
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden" 
                    accept="image/*"
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-stone-100 text-stone-700 px-3 py-2 rounded-lg hover:bg-stone-200 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {isUploading ? `${Math.round(uploadProgress)}%` : 'Subir'}
                  </button>
                </div>
                {editingProduct?.imageUrl && (
                  <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-stone-200">
                    <img src={editingProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setEditingProduct({...editingProduct, imageUrl: ''})}
                      className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 cursor-pointer">
                <input type="checkbox" checked={editingProduct?.isAvailable ?? true} onChange={e => setEditingProduct({...editingProduct, isAvailable: e.target.checked})} className="rounded text-stone-900 focus:ring-stone-900" />
                Disponible
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 cursor-pointer">
                <input type="checkbox" checked={editingProduct?.isPopular ?? false} onChange={e => setEditingProduct({...editingProduct, isPopular: e.target.checked})} className="rounded text-stone-900 focus:ring-stone-900" />
                Popular
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 cursor-pointer">
                <input type="checkbox" checked={editingProduct?.isDailyOffer ?? false} onChange={e => setEditingProduct({...editingProduct, isDailyOffer: e.target.checked})} className="rounded text-stone-900 focus:ring-stone-900" />
                Oferta del Día
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 cursor-pointer">
                <input type="checkbox" checked={editingProduct?.isUpsell ?? false} onChange={e => setEditingProduct({...editingProduct, isUpsell: e.target.checked})} className="rounded text-stone-900 focus:ring-stone-900" />
                Upsell (Carrito)
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
              <th className="px-6 py-4 font-medium">Nombre</th>
              <th className="px-6 py-4 font-medium">Precio</th>
              <th className="px-6 py-4 font-medium">Categoría</th>
              <th className="px-6 py-4 font-medium">Estado</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-stone-50">
                <td className="px-6 py-4 font-medium text-stone-900">
                  {product.name}
                  {product.isDailyOffer && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Oferta</span>}
                  {product.isPopular && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Popular</span>}
                </td>
                <td className="px-6 py-4">${product.price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  {categories.find(c => c.id === product.categoryId)?.name || 'Desconocida'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {product.isAvailable ? 'Disponible' : 'Agotado'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => { setIsAdding(false); setEditingProduct(product); }} className="text-stone-400 hover:text-blue-600 p-1"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(product.id)} className="text-stone-400 hover:text-red-600 p-1 ml-2"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-stone-500">No hay productos. Agrega uno nuevo.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
