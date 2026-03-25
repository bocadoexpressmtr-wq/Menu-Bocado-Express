import React from 'react';
import { MapPin, CheckCircle, Trash2, Clock, ShoppingBag, Trophy, MessageSquare, Bike, Store, Wallet } from 'lucide-react';
import { updateDoc, doc, deleteDoc, collection, query, where, getDocs, addDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, StoreSettings } from '../../types';
import { cn } from '../../lib/utils';

export default function OrdersTab({ orders, settings }: { orders: Order[], settings: StoreSettings }) {
  const handleComplete = async (order: Order) => {
    if (!window.confirm(`¿Marcar el pedido de ${order.customerName} como entregado?`)) return;

    try {
      await updateDoc(doc(db, 'orders', order.id!), { status: 'completed' });

      // Auto-stamp logic
      if (order.loyaltyOptIn && order.customerPhone) {
        // Check minimum order requirement
        if (order.totalAmount < (settings.loyaltyMinOrder || 0)) {
          alert(`Pedido marcado como entregado. No se asignó sello porque el total (${formatPrice(order.totalAmount)}) es menor al mínimo requerido (${formatPrice(settings.loyaltyMinOrder || 0)}).`);
          return;
        }

        const q = query(collection(db, 'customers'), where('phone', '==', order.customerPhone));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const customerDoc = snap.docs[0];
          await updateDoc(doc(db, 'customers', customerDoc.id), { stamps: increment(1) });
        } else {
          await addDoc(collection(db, 'customers'), { 
            phone: order.customerPhone, 
            name: order.customerName,
            stamps: 1, 
            createdAt: new Date().toISOString() 
          });
        }
        alert("Pedido marcado como entregado y sello asignado al cliente.");
      } else {
        alert("Pedido marcado como entregado.");
      }
    } catch (error) {
      console.error("Error updating order", error);
      alert("Error al actualizar el pedido");
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este pedido del historial?")) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (error) {
      console.error("Error deleting order", error);
      alert("Error al eliminar el pedido");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">Gestión de Pedidos</h2>
          <p className="text-stone-500 text-sm">Administra y despacha las órdenes de tus clientes</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-stone-200 shadow-sm">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">En Vivo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {orders.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-stone-100 p-12 text-center">
            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-stone-200 mx-auto mb-4">
              <ShoppingBag size={32} />
            </div>
            <p className="text-stone-400 font-medium">No hay pedidos registrados aún.</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className={cn(
              "bg-white rounded-[2rem] shadow-sm border transition-all duration-300 overflow-hidden group",
              order.status === 'completed' ? 'border-stone-100 opacity-75 grayscale-[0.5]' : 'border-stone-200 hover:shadow-xl hover:shadow-stone-200/50'
            )}>
              {/* Card Header */}
              <div className="p-6 md:p-8 border-b border-stone-50 flex flex-col md:flex-row justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm",
                    order.status === 'completed' ? 'bg-stone-100 text-stone-400' : 'bg-stone-900 text-white'
                  )}>
                    {order.customerName ? order.customerName.charAt(0) : '?'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-black text-xl text-stone-900">{order.customerName}</h3>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border",
                        order.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                      )}>
                        {order.status === 'completed' ? <CheckCircle size={10} /> : <Clock size={10} />}
                        {order.status === 'completed' ? 'Entregado' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-stone-400 text-xs font-medium flex items-center gap-2">
                      <span className="text-stone-900 font-bold">{order.customerPhone}</span>
                      <span className="w-1 h-1 bg-stone-200 rounded-full" />
                      {new Date(order.createdAt).toLocaleString('es-CO', { 
                        day: '2-digit', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => handleComplete(order)}
                      className="bg-emerald-500 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2 active:scale-95"
                    >
                      <CheckCircle size={18} />
                      Completar
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(order.id!)}
                    className="p-3 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-95"
                    title="Eliminar pedido"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              {/* Card Body */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* Items List */}
                <div className="lg:col-span-7 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-stone-50">
                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Detalle del Pedido</h4>
                  <div className="space-y-4">
                    {order.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between group/item">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center text-stone-400 font-black text-xs group-hover/item:bg-stone-900 group-hover/item:text-white transition-colors">
                            {item.quantity}
                          </div>
                          <span className="font-bold text-stone-700">{item.name}</span>
                        </div>
                        <span className="text-stone-400 font-medium">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-stone-50 flex justify-between items-end">
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
