import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, DatabaseZap, X, Save, Upload, Loader2, Package } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { cn } from '../../lib/utils';
import { Product, Category } from '../../types';

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    let productsLoaded = false;
    let categoriesLoaded = false;

    const checkLoading = () => {
      if (productsLoaded && categoriesLoaded) {
        setLoading(false);
      }
    };

    const unsubProducts = onSnapshot(query(collection(db, 'products')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      productsLoaded = true;
      checkLoading();
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categories'), orderBy('order')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      categoriesLoaded = true;
      checkLoading();
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const closeForm = () => {
    setEditingProduct(null);
    setIsAdding(false);
  };

  if (loading && products.length === 0) return <div className="p-8 text-center text-stone-500 font-medium">Cargando productos...</div>;

  const convertDriveUrl = (url: string) => {
    if (url.includes('drive.google.com')) {
      const idMatch = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
      if (idMatch && idMatch[1]) {
        return `https://drive.google.com/uc?id=${idMatch[1]}&export=download`;
      }
    }
    return url;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Por favor selecciona un archivo de imagen válido.");
      return;
    }

    // Validate file size (limit to 800KB for Firestore safety)
    if (file.size > 800 * 1024) {
      alert("La imagen es demasiado grande. Por favor selecciona una menor a 800KB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onloadstart = () => setUploadProgress(10);
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress((event.loaded / event.total) * 100);
      }
    };
    reader.onload = () => {
      const base64String = reader.result as string;
      setEditingProduct(prev => ({ ...prev, imageUrl: base64String }));
      setIsUploading(false);
      setUploadProgress(0);
    };
    reader.onerror = () => {
      alert("Error al leer el archivo.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.price || !editingProduct?.categoryId) {
      alert("Por favor completa los campos requeridos.");
      return;
    }

    try {
      const { id, ...productData } = editingProduct;
      const finalProduct = {
        ...productData,
        imageUrl: convertDriveUrl(editingProduct.imageUrl || ''),
        price: Number(editingProduct.price),
        isAvailable: editingProduct.isAvailable ?? true,
        isPopular: editingProduct.isPopular ?? false,
        isDailyOffer: editingProduct.isDailyOffer ?? false,
        isUpsell: editingProduct.isUpsell ?? false,
      };

      if (isAdding) {
        await addDoc(collection(db, 'products'), finalProduct);
      } else if (editingProduct.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), finalProduct);
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
      alert("Producto eliminado");
    } catch (error) {
      console.error("Error deleting product", error);
      alert("Error al eliminar el producto: Permiso denegado");
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">Menú de Productos</h2>
          <p className="text-stone-500 text-sm">Gestiona los platos y bebidas de tu restaurante</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingProduct({ isAvailable: true }); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }} 
          className="w-full md:w-auto bg-stone-900 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-stone-800 text-sm font-black uppercase tracking-wider shadow-lg shadow-stone-200 transition-all active:scale-95"
        >
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {(isAdding || editingProduct) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl border border-stone-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-stone-50 flex justify-between items-center z-10">
              <h3 className="text-xl font-black text-stone-900">{isAdding ? 'Crear Nuevo Producto' : 'Editar Producto'}</h3>
              <button onClick={closeForm} className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 text-stone-400 hover:text-stone-600 transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Nombre del Plato</label>
                  <input required type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium" placeholder="Ej: Suizo Clásico" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Precio (COP)</label>
                  <input required type="number" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-bold" placeholder="Ej: 14000" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Descripción / Ingredientes</label>
                  <textarea value={editingProduct?.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium min-h-[100px]" placeholder="Describe los ingredientes y detalles del plato..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Categoría</label>
                  <select required value={editingProduct?.categoryId || ''} onChange={e => setEditingProduct({...editingProduct, categoryId: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-bold appearance-none">
                    <option value="">Selecciona una categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Imagen (URL o Archivo)</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      placeholder="Pega URL de Drive o Web"
                      value={editingProduct?.imageUrl || ''} 
                      onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} 
                      className="flex-1 px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all text-sm font-medium" 
                    />
                    <input 
                      id="image-upload"
                      type="file" 
                      onChange={handleImageUpload}
                      className="hidden" 
                      accept="image/*"
                    />
                    <label 
                      htmlFor="image-upload"
                      className={cn(
                        "bg-stone-900 text-white px-4 py-3 rounded-2xl hover:bg-stone-800 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider shadow-md cursor-pointer sm:w-auto",
                        isUploading && "opacity-50 pointer-events-none"
                      )}
                    >
                      {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {isUploading ? `${Math.round(uploadProgress)}%` : 'Subir'}
                    </label>
                  </div>
                  {editingProduct?.imageUrl && (
                    <div className="mt-3 relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-stone-100 shadow-sm">
                      <img src={editingProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setEditingProduct({...editingProduct, imageUrl: ''})}
                        className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <label className="flex items-center gap-3 p-2 cursor-pointer group">
                  <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all", (editingProduct?.isAvailable ?? true) ? "bg-stone-900 border-stone-900" : "border-stone-300")}>
                    {(editingProduct?.isAvailable ?? true) && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <input type="checkbox" checked={editingProduct?.isAvailable ?? true} onChange={e => setEditingProduct({...editingProduct, isAvailable: e.target.checked})} className="hidden" />
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-tight">Disponible</span>
                </label>
                <label className="flex items-center gap-3 p-2 cursor-pointer group">
                  <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all", (editingProduct?.isPopular ?? false) ? "bg-amber-500 border-amber-500" : "border-stone-300")}>
                    {(editingProduct?.isPopular ?? false) && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <input type="checkbox" checked={editingProduct?.isPopular ?? false} onChange={e => setEditingProduct({...editingProduct, isPopular: e.target.checked})} className="hidden" />
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-tight">Popular</span>
                </label>
                <label className="flex items-center gap-3 p-2 cursor-pointer group">
                  <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all", (editingProduct?.isDailyOffer ?? false) ? "bg-red-500 border-red-500" : "border-stone-300")}>
                    {(editingProduct?.isDailyOffer ?? false) && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <input type="checkbox" checked={editingProduct?.isDailyOffer ?? false} onChange={e => setEditingProduct({...editingProduct, isDailyOffer: e.target.checked})} className="hidden" />
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-tight">Oferta</span>
                </label>
                <label className="flex items-center gap-3 p-2 cursor-pointer group">
                  <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all", (editingProduct?.isUpsell ?? false) ? "bg-blue-500 border-blue-500" : "border-stone-300")}>
                    {(editingProduct?.isUpsell ?? false) && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <input type="checkbox" checked={editingProduct?.isUpsell ?? false} onChange={e => setEditingProduct({...editingProduct, isUpsell: e.target.checked})} className="hidden" />
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-tight">Upsell</span>
                </label>
              </div>

              <div className="flex justify-end pt-6 border-t border-stone-50 gap-3 sticky bottom-0 bg-white py-4 mt-4">
                <button type="button" onClick={closeForm} className="px-6 py-3 rounded-2xl text-stone-400 font-black uppercase tracking-wider text-xs hover:text-stone-600 transition-colors">Cancelar</button>
                <button type="submit" className="bg-stone-900 text-white px-8 py-3 rounded-2xl flex items-center gap-2 hover:bg-stone-800 font-black uppercase tracking-wider text-xs shadow-lg shadow-stone-200 transition-all active:scale-95">
                  <Save size={18} /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden group hover:shadow-lg hover:shadow-stone-200/30 transition-all duration-300 flex flex-col">
            <div className="relative h-32 md:h-40 overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-stone-50 flex items-center justify-center text-stone-200">
                  <Package size={32} />
                </div>
              )}
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                {product.isDailyOffer && <span className="bg-red-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg">Oferta</span>}
                {product.isPopular && <span className="bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg">Popular</span>}
              </div>
              {!product.isAvailable && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="bg-stone-900 text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg shadow-xl">Agotado</span>
                </div>
              )}
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-0.5">
                    {categories.find(c => c.id === product.categoryId)?.name || 'Sin Categoría'}
                  </p>
                  <h3 className="text-base font-black text-stone-900 leading-tight line-clamp-1">{product.name}</h3>
                </div>
                <p className="text-sm font-black text-emerald-600 shrink-0">${product.price.toLocaleString()}</p>
              </div>
              
              <p className="text-stone-500 text-[10px] font-medium line-clamp-2 mb-3 flex-1 h-8">{product.description || 'Sin descripción disponible.'}</p>
              
              <div className="flex items-center justify-between pt-3 border-t border-stone-50">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", product.isAvailable ? "bg-emerald-500" : "bg-red-500")} />
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider">{product.isAvailable ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setIsAdding(false); setEditingProduct(product); }} className="p-2.5 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all active:scale-90"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(product.id)} className="p-2.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-stone-100 p-8 text-center">
            <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center text-stone-200 mx-auto mb-4">
              <Package size={24} />
            </div>
            <p className="text-stone-400 font-medium text-sm">No hay productos en el menú. ¡Empieza agregando uno!</p>
          </div>
        )}
      </div>
    </div>
  );
}
