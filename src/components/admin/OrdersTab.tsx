import React from 'react';
import { MapPin, CheckCircle, Trash2, Clock } from 'lucide-react';
import { updateDoc, doc, deleteDoc, collection, query, where, getDocs, addDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order } from '../../types';

export default function OrdersTab({ orders }: { orders: Order[] }) {
  const handleComplete = async (order: Order) => {
    if (!window.confirm(`¿Marcar el pedido de ${order.customerName} como entregado?`)) return;

    try {
      await updateDoc(doc(db, 'orders', order.id!), { status: 'completed' });

      // Auto-stamp logic
      if (order.loyaltyOptIn && order.customerPhone) {
        const q = query(collection(db, 'customers'), where('phone', '==', order.customerPhone));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const customerDoc = snap.docs[0];
          await updateDoc(doc(db, 'customers', customerDoc.id), { stamps: increment(1) });
        } else {
          await addDoc(collection(db, 'customers'), { 
            phone: order.customerPhone, 
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
    <div>
      <h2 className="text-2xl font-bold text-stone-900 mb-6">Pedidos Recientes</h2>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <p className="text-stone-500">No hay pedidos aún.</p>
        ) : (
          orders.map(order => (
            <div key={order.id} className={`p-6 rounded-2xl shadow-sm border ${order.status === 'completed' ? 'bg-stone-50 border-stone-200 opacity-80' : 'bg-white border-stone-200'}`}>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 pb-4 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg">{order.customerName}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status === 'completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      {order.status === 'completed' ? 'Entregado' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="text-stone-500 text-sm flex items-center gap-2 mt-1">
                    {order.customerPhone} • {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => handleComplete(order)}
                      className="bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Marcar Entregado
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(order.id!)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Eliminar pedido"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-stone-900 mb-2">Detalle del Pedido</h4>
                  <ul className="space-y-2">
                    {order.items.map((item: any, i: number) => (
                      <li key={i} className="flex justify-between text-sm">
                        <span><span className="font-medium text-stone-500 mr-2">{item.quantity}x</span> {item.name}</span>
                        <span className="text-stone-600">{formatPrice(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-red-600">{formatPrice(order.totalAmount)}</span>
                  </div>
                  {order.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <h4 className="font-bold text-yellow-800 text-xs uppercase mb-1">Notas del cliente</h4>
                      <p className="text-sm text-yellow-900">{order.notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <h4 className="font-medium text-stone-900 mb-2 flex items-center gap-2">
                    <MapPin size={16} className="text-stone-400" />
                    Entrega ({order.deliveryType})
                  </h4>
                  <p className="text-sm text-stone-600">{order.customerAddress || 'Recoger en local'}</p>
                  {order.location && (
                    <a 
                      href={`https://maps.google.com/?q=${order.location.lat},${order.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-sm text-blue-600 hover:underline font-medium"
                    >
                      Ver en Google Maps
                    </a>
                  )}
                  <div className="mt-3 pt-3 border-t border-stone-200">
                    <p className="text-sm text-stone-600">Pago: <span className="font-bold capitalize">{order.paymentMethod}</span></p>
                    {order.cashAmount && (
                      <p className="text-sm text-stone-600">Paga con: <span className="font-bold">{formatPrice(order.cashAmount)}</span></p>
                    )}
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
