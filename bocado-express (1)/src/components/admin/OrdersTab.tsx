import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, Trash2, Clock, ShoppingBag, Trophy, MessageSquare, Bike, Store, Wallet, Archive, CheckSquare, Square } from 'lucide-react';
import { updateDoc, doc, getDoc, deleteDoc, collection, query, where, getDocs, addDoc, increment, writeBatch, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, StoreSettings } from '../../types';
import { cn } from '../../lib/utils';

export default function OrdersTab({ settings }: { settings: StoreSettings }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500)), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (err) => console.error(err));
    return () => unsub();
  }, []);

  const [showArchived, setShowArchived] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null);

  if (loading && orders.length === 0) return <div className="p-8 text-center text-stone-500 font-medium">Cargando pedidos...</div>;

  const handleComplete = async (order: Order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id!), { status: 'completed' });
      setConfirmingOrder(null);

      // Auto-stamp and Referral logic
      if (order.customerPhone) {
        const customerDocRef = doc(db, 'customers', order.customerPhone);
        const customerSnap = await getDoc(customerDocRef);
        
        const minOrder = settings.loyaltyMinOrder || 0;
        const meetsMinOrder = order.totalAmount >= minOrder;

        if (customerSnap.exists()) {
          const updateData: any = {
            totalOrders: increment(1)
          };
          
          if (meetsMinOrder && order.loyaltyOptIn) {
            updateData.stamps = increment(1);
          }
          
          await updateDoc(customerDocRef, updateData);
        }

        // Referral logic: Only if the order meets the minimum amount
        if (meetsMinOrder && order.referredBy && order.referredBy !== order.customerPhone) {
          const referrerDocRef = doc(db, 'customers', order.referredBy);
          const referrerSnap = await getDoc(referrerDocRef);
          if (referrerSnap.exists()) {
            await updateDoc(referrerDocRef, { stamps: increment(1) });
            console.log(`Referral stamp awarded to ${order.referredBy}`);
          }
        }

        if (!meetsMinOrder && order.loyaltyOptIn) {
          alert(`Pedido completado. No se asignó sello porque el total (${formatPrice(order.totalAmount)}) es menor al mínimo (${formatPrice(minOrder)}).`);
        } else {
          alert("Pedido completado con éxito.");
        }
      }
    } catch (error) {
      console.error("Error updating order", error);
      alert("Error al actualizar el pedido");
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este pedido definitivamente?")) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      alert("Pedido eliminado");
    } catch (error) {
      console.error("Error deleting order", error);
      alert("Error al eliminar el pedido: Permiso denegado o error de red.");
    }
  };

  const handleArchive = async (orderId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'archived' ? 'completed' : 'archived';
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      alert(newStatus === 'archived' ? "Pedido archivado" : "Pedido desarchivado");
    } catch (error) {
      console.error("Error archiving order", error);
      alert("Error al procesar el archivo");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.id!));
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`¿Eliminar definitivamente los ${selectedOrders.length} pedidos seleccionados?`)) return;
    const batch = writeBatch(db);
    selectedOrders.forEach(id => {
      batch.delete(doc(db, 'orders', id));
    });
    try {
      await batch.commit();
      setSelectedOrders([]);
      alert("Pedidos eliminados");
    } catch (error) {
      console.error("Bulk delete error", error);
    }
  };

  const bulkArchive = async () => {
    if (!window.confirm(`¿Archivar los ${selectedOrders.length} pedidos seleccionados?`)) return;
    const batch = writeBatch(db);
    selectedOrders.forEach(id => {
      batch.update(doc(db, 'orders', id), { status: 'archived' });
    });
    try {
      await batch.commit();
      setSelectedOrders([]);
      alert("Pedidos archivados");
    } catch (error) {
      console.error("Bulk archive error", error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const visibleOrders = orders.filter(o => showArchived ? o.status === 'archived' : o.status !== 'archived');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">
            {showArchived ? 'Pedidos Archivados' : 'Gestión de Pedidos'}
          </h2>
          <p className="text-stone-500 text-sm">
            {showArchived ? 'Historial de pedidos guardados' : 'Administra y despacha las órdenes de tus clientes'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              showArchived ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            )}
          >
            <Archive size={14} />
            {showArchived ? 'Ver Activos' : 'Ver Archivados'}
          </button>
          {selectedOrders.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
              <button 
                onClick={bulkArchive}
                className="bg-stone-100 text-stone-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-stone-200 transition-colors flex items-center gap-2"
              >
                <Archive size={14} /> Archivar ({selectedOrders.length})
              </button>
              <button 
                onClick={bulkDelete}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <Trash2 size={14} /> Eliminar ({selectedOrders.length})
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-stone-200 shadow-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">En Vivo</span>
          </div>
        </div>
      </div>

      {visibleOrders.length > 0 && (
        <div className="flex items-center gap-4 px-4">
          <button 
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors"
          >
            {selectedOrders.length === visibleOrders.length ? <CheckSquare size={18} className="text-stone-900" /> : <Square size={18} />}
            {selectedOrders.length === visibleOrders.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {visibleOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 md:p-12 text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-stone-50 rounded-full flex items-center justify-center text-stone-200 mx-auto mb-4">
              <ShoppingBag size={24} />
            </div>
            <p className="text-stone-400 font-medium text-sm">No hay pedidos pendientes o activos.</p>
          </div>
        ) : (
          visibleOrders.map(order => (
            <div key={order.id} className={cn(
              "bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden group relative",
              order.status === 'completed' ? 'border-stone-100 opacity-75 grayscale-[0.5]' : 'border-stone-200 hover:shadow-lg hover:shadow-stone-200/30',
              selectedOrders.includes(order.id!) && 'ring-2 ring-stone-900 border-transparent'
            )}>
              {/* Selection Checkbox */}
              <button 
                onClick={() => toggleSelect(order.id!)}
                className="absolute top-4 left-4 z-10 p-1 bg-white rounded-lg shadow-sm border border-stone-100 text-stone-400 hover:text-stone-900 transition-colors"
              >
                {selectedOrders.includes(order.id!) ? <CheckSquare size={16} className="text-stone-900" /> : <Square size={16} />}
              </button>

              {/* Card Header */}
              <div className="p-4 md:p-6 pl-12 md:pl-16 border-b border-stone-50 flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-sm shrink-0",
                    order.status === 'completed' ? 'bg-stone-100 text-stone-400' : 'bg-stone-900 text-white'
                  )}>
                    {order.customerName ? order.customerName.charAt(0) : '?'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <h3 className="font-black text-base md:text-lg text-stone-900 leading-tight">{order.customerName}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border",
                        order.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                      )}>
                        {order.status === 'completed' ? <CheckCircle size={8} /> : <Clock size={8} />}
                        {order.status === 'completed' ? 'Entregado' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-stone-400 text-[10px] md:text-xs font-medium flex items-center gap-1.5">
                      <a 
                        href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-stone-900 font-bold hover:text-emerald-600 transition-colors flex items-center gap-1"
                      >
                        {order.customerPhone}
                      </a>
                      <span className="w-0.5 h-0.5 bg-stone-200 rounded-full" />
                      {new Date(order.createdAt).toLocaleString('es-CO', { 
                        day: '2-digit', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {order.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      {confirmingOrder === order.id ? (
                        <div className="flex items-center gap-1 animate-in zoom-in-95 duration-200">
                          <button 
                            onClick={() => handleComplete(order)}
                            className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-md"
                          >
                            Confirmar
                          </button>
                          <button 
                            onClick={() => setConfirmingOrder(null)}
                            className="bg-stone-100 text-stone-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-stone-200 transition-all"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmingOrder(order.id!)}
                          className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-600 transition-all shadow-md shadow-emerald-100 flex items-center gap-1.5 active:scale-95"
                        >
                          <CheckCircle size={14} />
                          Completar
                        </button>
                      )}
                    </div>
                  )}
                  <button 
                    onClick={() => handleArchive(order.id!, order.status)}
                    className={cn(
                      "p-2 rounded-xl transition-all active:scale-95",
                      order.status === 'archived' ? "text-emerald-600 bg-emerald-50" : "text-stone-300 hover:text-stone-600 hover:bg-stone-50"
                    )}
                    title={order.status === 'archived' ? "Desarchivar" : "Archivar"}
                  >
                    <Archive size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(order.id!)}
                    className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              {/* Card Body */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* Items List */}
                <div className="lg:col-span-7 p-4 md:p-6 border-b lg:border-b-0 lg:border-r border-stone-50">
                  <h4 className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">Detalle</h4>
                  <div className="space-y-2.5">
                    {order.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between group/item">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-stone-50 rounded-lg flex items-center justify-center text-stone-400 font-black text-[10px] group-hover/item:bg-stone-900 group-hover/item:text-white transition-colors">
                            {item.quantity}
                          </div>
                          <span className="font-bold text-stone-700 text-sm">{item.name}</span>
                        </div>
                        <span className="text-stone-400 font-medium text-xs">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-stone-50 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Total a cobrar</p>
                      <p className="text-3xl font-black text-stone-900">{formatPrice(order.totalAmount)}</p>
                    </div>
                    {order.loyaltyOptIn && (
                      <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1.5">
                        <Trophy size={12} />
                        Suma Sello
                      </div>
                    )}
                  </div>

                  {order.notes && (
                    <div className="mt-6 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare size={14} className="text-amber-600" />
                        <h4 className="font-black text-amber-800 text-[10px] uppercase tracking-wider">Notas del cliente</h4>
                      </div>
                      <p className="text-sm text-amber-900/80 font-medium leading-relaxed">{order.notes}</p>
                    </div>
                  )}
                </div>
                
                {/* Delivery Info */}
                <div className="lg:col-span-5 p-6 md:p-8 bg-stone-50/30">
                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Información de Entrega</h4>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-stone-400">
                        {order.deliveryType === 'domicilio' ? <Bike size={20} /> : <Store size={20} />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-stone-900 uppercase tracking-tight mb-1">
                          {order.deliveryType === 'domicilio' ? 'Envío a Domicilio' : order.deliveryType === 'recoger' ? 'Recoge en Local' : 'Consumo en Local'}
                        </p>
                        <p className="text-sm text-stone-500 font-medium leading-snug">
                          {order.customerAddress || 'Sin dirección (Recogida)'}
                        </p>
                        {order.location && (
                          <a 
                            href={`https://maps.google.com/?q=${order.location.lat},${order.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-600 hover:text-blue-700 font-black uppercase tracking-wider group/link"
                          >
                            <MapPin size={14} />
                            Ver Ubicación GPS
                            <span className="block w-0 h-0.5 bg-blue-600 group-hover/link:w-full transition-all duration-300" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-stone-400">
                        <Wallet size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-stone-900 uppercase tracking-tight mb-1">Método de Pago</p>
                        <p className="text-sm text-stone-500 font-bold capitalize">{order.paymentMethod}</p>
                        {order.cashAmount && (
                          <p className="text-xs text-stone-400 mt-1">Paga con: <span className="text-stone-900 font-black">{formatPrice(order.cashAmount)}</span></p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
