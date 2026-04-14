import React, { useState, useEffect, useRef } from 'react';
import { MapPin, CheckCircle, Trash2, Clock, ShoppingBag, Trophy, MessageSquare, Bike, Store, Wallet, Archive, CheckSquare, Square, Filter, RefreshCw } from 'lucide-react';
import { updateDoc, doc, getDoc, deleteDoc, collection, query, where, getDocs, addDoc, increment, writeBatch, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, StoreSettings } from '../../types';
import { cn } from '../../lib/utils';
import { useDialog } from '../../context/DialogContext';

export default function OrdersTab({ settings }: { settings: StoreSettings }) {
  const { showAlert, showConfirm } = useDialog();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterDelivery, setFilterDelivery] = useState<string>('all');
  const previousOrderCount = useRef(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500)));
      const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      const pendingCount = newOrders.filter(o => o.status === 'pending').length;
      if (pendingCount > previousOrderCount.current && previousOrderCount.current !== 0) {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.play().catch(e => console.log("Audio play failed", e));
      }
      previousOrderCount.current = pendingCount;
      
      setOrders(newOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
          showAlert("Pedido Completado", `Pedido completado. No se asignó sello porque el total (${formatPrice(order.totalAmount)}) es menor al mínimo (${formatPrice(minOrder)}).`);
        } else {
          showAlert("Éxito", "Pedido completado con éxito.", 'success');
        }
      }
    } catch (error) {
      console.error("Error updating order", error);
      showAlert("Error", "Error al actualizar el pedido", 'error');
    }
  };

  const handleDelete = async (orderId: string) => {
    showConfirm(
      "¿Eliminar Pedido?",
      "¿Estás seguro de que deseas eliminar este pedido definitivamente?",
      async () => {
        try {
          await deleteDoc(doc(db, 'orders', orderId));
          showAlert("Eliminado", "Pedido eliminado", 'success');
        } catch (error) {
          console.error("Error deleting order", error);
          showAlert("Error", "Error al eliminar el pedido: Permiso denegado o error de red.", 'error');
        }
      }
    );
  };

  const handleArchive = async (orderId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'archived' ? 'completed' : 'archived';
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      showAlert(newStatus === 'archived' ? "Archivado" : "Desarchivado", newStatus === 'archived' ? "Pedido archivado" : "Pedido desarchivado", 'success');
    } catch (error) {
      console.error("Error archiving order", error);
      showAlert("Error", "Error al procesar el archivo", 'error');
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
    showConfirm(
      "¿Eliminar Pedidos?",
      `¿Eliminar definitivamente los ${selectedOrders.length} pedidos seleccionados?`,
      async () => {
        const batch = writeBatch(db);
        selectedOrders.forEach(id => {
          batch.delete(doc(db, 'orders', id));
        });
        try {
          await batch.commit();
          setSelectedOrders([]);
          showAlert("Eliminados", "Pedidos eliminados", 'success');
        } catch (error) {
          console.error("Bulk delete error", error);
          showAlert("Error", "Error al eliminar los pedidos", 'error');
        }
      }
    );
  };

  const bulkArchive = async () => {
    showConfirm(
      "¿Archivar Pedidos?",
      `¿Archivar los ${selectedOrders.length} pedidos seleccionados?`,
      async () => {
        const batch = writeBatch(db);
        selectedOrders.forEach(id => {
          batch.update(doc(db, 'orders', id), { status: 'archived' });
        });
        try {
          await batch.commit();
          setSelectedOrders([]);
          showAlert("Archivados", "Pedidos archivados", 'success');
        } catch (error) {
          console.error("Bulk archive error", error);
          showAlert("Error", "Error al archivar los pedidos", 'error');
        }
      }
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const visibleOrders = orders.filter(o => {
    if (showArchived ? o.status !== 'archived' : o.status === 'archived') return false;
    if (filterPayment !== 'all' && o.paymentMethod !== filterPayment) return false;
    if (filterDelivery !== 'all' && o.deliveryType !== filterDelivery) return false;
    return true;
  });

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
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={fetchData}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 bg-stone-100 text-stone-700 hover:bg-stone-200"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2",
              showArchived ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            )}
          >
            <Archive size={14} />
            {showArchived ? 'Activos' : 'Archivados'}
          </button>
          {selectedOrders.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 w-full sm:w-auto">
              <button 
                onClick={bulkArchive}
                className="flex-1 sm:flex-none bg-stone-100 text-stone-600 px-3 py-2 rounded-xl text-[10px] font-bold hover:bg-stone-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <Archive size={14} /> ({selectedOrders.length})
              </button>
              <button 
                onClick={bulkDelete}
                className="flex-1 sm:flex-none bg-red-50 text-red-600 px-3 py-2 rounded-xl text-[10px] font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} /> ({selectedOrders.length})
              </button>
            </div>
          )}
          <div className="hidden sm:flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-stone-200 shadow-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">En Vivo</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
        <div className="flex items-center gap-2 text-stone-500 text-sm font-bold">
          <Filter size={16} /> Filtros:
        </div>
        <select 
          value={filterPayment} 
          onChange={(e) => setFilterPayment(e.target.value)}
          className="bg-stone-50 border border-stone-200 text-stone-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-900"
        >
          <option value="all">Todos los Pagos</option>
          <option value="nequi">Nequi / Transf.</option>
          <option value="efectivo">Efectivo</option>
        </select>
        <select 
          value={filterDelivery} 
          onChange={(e) => setFilterDelivery(e.target.value)}
          className="bg-stone-50 border border-stone-200 text-stone-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-900"
        >
          <option value="all">Todas las Entregas</option>
          <option value="domicilio">Domicilio</option>
          <option value="recoger">Recoger</option>
          <option value="local">En Local</option>
        </select>
      </div>

      {visibleOrders.length > 0 && (
        <div className="flex items-center gap-4 px-4">
          <button 
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-[10px] font-bold text-stone-500 hover:text-stone-900 transition-colors uppercase tracking-wider"
          >
            {selectedOrders.length === visibleOrders.length ? <CheckSquare size={16} className="text-stone-900" /> : <Square size={16} />}
            {selectedOrders.length === visibleOrders.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:gap-4">
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
              "bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden group relative",
              order.status === 'completed' ? 'border-stone-100 opacity-75 grayscale-[0.5]' : 'border-stone-200 hover:shadow-md hover:shadow-stone-200/30',
              selectedOrders.includes(order.id!) && 'ring-2 ring-stone-900 border-transparent'
            )}>
              {/* Selection Checkbox */}
              <button 
                onClick={() => toggleSelect(order.id!)}
                className="absolute top-3 left-3 z-10 p-1 bg-white rounded-md shadow-sm border border-stone-100 text-stone-400 hover:text-stone-900 transition-colors"
              >
                {selectedOrders.includes(order.id!) ? <CheckSquare size={14} className="text-stone-900" /> : <Square size={14} />}
              </button>

              {/* Card Header */}
              <div className="p-3 md:p-4 pl-10 md:pl-12 border-b border-stone-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-start gap-3 w-full sm:w-auto">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm shrink-0",
                    order.status === 'completed' ? 'bg-stone-100 text-stone-400' : 'bg-stone-900 text-white'
                  )}>
                    {order.customerName ? order.customerName.charAt(0) : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <h3 className="font-black text-sm md:text-base text-stone-900 leading-tight truncate">{order.customerName}</h3>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 border",
                        order.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                      )}>
                        {order.status === 'completed' ? <CheckCircle size={8} /> : <Clock size={8} />}
                        {order.status === 'completed' ? 'Entregado' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-stone-400 text-[10px] font-medium flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <a 
                        href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-stone-900 font-bold hover:text-emerald-600 transition-colors flex items-center gap-1"
                      >
                        {order.customerPhone}
                      </a>
                      <span className="hidden xs:block w-0.5 h-0.5 bg-stone-200 rounded-full" />
                      <span className="whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleString('es-CO', { 
                          day: '2-digit', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  {order.status === 'pending' && (
                    <div className="flex items-center gap-1.5">
                      {confirmingOrder === order.id ? (
                        <div className="flex items-center gap-1 animate-in zoom-in-95 duration-200">
                          <button 
                            onClick={() => handleComplete(order)}
                            className="bg-emerald-600 text-white px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-sm"
                          >
                            Sí
                          </button>
                          <button 
                            onClick={() => setConfirmingOrder(null)}
                            className="bg-stone-100 text-stone-600 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-stone-200 transition-all"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmingOrder(order.id!)}
                          className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-100 flex items-center gap-1.5 active:scale-95"
                        >
                          <CheckCircle size={12} />
                          <span className="hidden xs:inline">Completar</span>
                          <span className="xs:hidden">OK</span>
                        </button>
                      )}
                    </div>
                  )}
                  <button 
                    onClick={() => handleArchive(order.id!, order.status)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all active:scale-95",
                      order.status === 'archived' ? "text-emerald-600 bg-emerald-50" : "text-stone-300 hover:text-stone-600 hover:bg-stone-50"
                    )}
                    title={order.status === 'archived' ? "Desarchivar" : "Archivar"}
                  >
                    <Archive size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(order.id!)}
                    className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {/* Card Body */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* Items List */}
                <div className="lg:col-span-7 p-3 md:p-4 border-b lg:border-b-0 lg:border-r border-stone-50">
                  <h4 className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Detalle</h4>
                  <div className="space-y-2">
                    {order.items.map((item: any, i: number) => (
                      <div key={i} className="group/item">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-stone-50 rounded-md flex items-center justify-center text-stone-400 font-black text-[10px] group-hover/item:bg-stone-900 group-hover/item:text-white transition-colors">
                              {item.quantity}
                            </div>
                            <span className="font-bold text-stone-700 text-xs">{item.name}</span>
                          </div>
                          <span className="text-stone-400 font-medium text-[10px]">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                        {item.selections && item.selections.length > 0 && (
                          <div className="ml-8 mt-1 flex flex-wrap gap-1">
                            {(() => {
                              const counts: Record<string, number> = {};
                              item.selections.forEach((s: string) => counts[s] = (counts[s] || 0) + 1);
                              return Object.entries(counts).map(([name, count], idx) => (
                                <span key={idx} className="bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1">
                                  <span className="text-stone-900">{count}x</span> {name}
                                </span>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-stone-50 flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Total a cobrar</p>
                      <p className="text-xl font-black text-stone-900">{formatPrice(order.totalAmount)}</p>
                    </div>
                    {order.loyaltyOptIn && (
                      <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1">
                        <Trophy size={10} />
                        Suma Sello
                      </div>
                    )}
                  </div>

                  {order.notes && (
                    <div className="mt-3 p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquare size={12} className="text-amber-600" />
                        <h4 className="font-black text-amber-800 text-[9px] uppercase tracking-wider">Notas del cliente</h4>
                      </div>
                      <p className="text-xs text-amber-900/80 font-medium leading-relaxed">{order.notes}</p>
                    </div>
                  )}
                </div>
                
                {/* Delivery Info */}
                <div className="lg:col-span-5 p-4 md:p-6 bg-stone-50/30">
                  <h4 className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">Información de Entrega</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-stone-400 shrink-0">
                        {order.deliveryType === 'domicilio' ? <Bike size={16} /> : <Store size={16} />}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-stone-900 uppercase tracking-tight mb-0.5">
                          {order.deliveryType === 'domicilio' ? 'Envío a Domicilio' : order.deliveryType === 'recoger' ? 'Recoge en Local' : 'Consumo en Local'}
                        </p>
                        <p className="text-xs text-stone-500 font-medium leading-snug">
                          {order.customerAddress || 'Sin dirección (Recogida)'}
                        </p>
                        {order.location && (
                          <a 
                            href={`https://maps.google.com/?q=${order.location.lat},${order.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-[10px] text-blue-600 hover:text-blue-700 font-black uppercase tracking-wider group/link"
                          >
                            <MapPin size={12} />
                            Ver Ubicación GPS
                            <span className="block w-0 h-0.5 bg-blue-600 group-hover/link:w-full transition-all duration-300" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-stone-400 shrink-0">
                        <Wallet size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-stone-900 uppercase tracking-tight mb-0.5">Método de Pago</p>
                        <p className="text-xs text-stone-500 font-bold capitalize">{order.paymentMethod}</p>
                        {order.cashAmount && (
                          <p className="text-[10px] text-stone-400 mt-0.5">Paga con: <span className="text-stone-900 font-black">{formatPrice(order.cashAmount)}</span></p>
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
