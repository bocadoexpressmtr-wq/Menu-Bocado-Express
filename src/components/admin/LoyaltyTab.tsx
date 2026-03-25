import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { cn } from '../../lib/utils';
import { Customer, StoreSettings } from '../../types';
import { Gift, Users, Search, Plus, Minus, Trash2, ToggleLeft, ToggleRight, Save, Loader2, Trophy, Star, UserPlus, CheckCircle } from 'lucide-react';

interface LoyaltyTabProps {
  customers: Customer[];
  settings: StoreSettings;
}

export default function LoyaltyTab({ customers, settings }: LoyaltyTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const [loyaltyPrize, setLoyaltyPrize] = useState(settings.loyaltyPrize);
  const [loyaltyGoal, setLoyaltyGoal] = useState(settings.loyaltyGoal);
  const [loyaltyMinOrder, setLoyaltyMinOrder] = useState(settings.loyaltyMinOrder || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setLoyaltyPrize(settings.loyaltyPrize);
    setLoyaltyGoal(settings.loyaltyGoal);
    setLoyaltyMinOrder(settings.loyaltyMinOrder || 0);
  }, [settings]);

  const toggleLoyalty = async () => {
    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        loyaltyEnabled: !settings.loyaltyEnabled
      });
    } catch (error) {
      console.error("Error updating loyalty setting:", error);
    }
  };

  const toggleReferral = async () => {
    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        referralEnabled: !settings.referralEnabled
      });
    } catch (error) {
      console.error("Error updating referral setting:", error);
    }
  };

  const saveLoyaltySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        loyaltyPrize,
        loyaltyGoal: Number(loyaltyGoal),
        loyaltyMinOrder: Number(loyaltyMinOrder)
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving loyalty settings:", error);
      alert("Error al guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateStamps = async (customerId: string, newStamps: number) => {
    if (newStamps < 0) return;
    try {
      await updateDoc(doc(db, 'customers', customerId), {
        stamps: newStamps
      });
    } catch (error) {
      console.error("Error updating stamps:", error);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este cliente? Se perderán todos sus sellos.")) return;
    try {
      await deleteDoc(doc(db, 'customers', customerId));
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.phone.includes(searchTerm) || c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">Fidelización</h2>
          <p className="text-stone-500 text-sm">Premia a tus clientes más fieles y atrae nuevos</p>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
            <CheckCircle size={16} />
            <span className="text-xs font-black uppercase tracking-wider">Guardado con éxito</span>
          </div>
        )}
      </div>

      {/* Program Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Loyalty Program Card */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100 group">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
                <Gift size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">Programa de Sellos</h3>
                <p className="text-stone-400 text-xs font-medium">Fideliza con premios por consumo</p>
              </div>
            </div>
            <button 
              onClick={toggleLoyalty}
              className={cn(
                "w-14 h-8 rounded-full p-1 transition-all duration-300",
                settings.loyaltyEnabled ? "bg-emerald-500" : "bg-stone-200"
              )}
            >
              <div className={cn(
                "w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300",
                settings.loyaltyEnabled ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>
          
          <form onSubmit={saveLoyaltySettings} className="space-y-6 pt-6 border-t border-stone-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Premio al completar</label>
                <input 
                  type="text"
                  value={loyaltyPrize}
                  onChange={(e) => setLoyaltyPrize(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-bold"
                  placeholder="Ej: Hamburguesa Gratis"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Meta de Sellos</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setLoyaltyGoal(Math.max(1, loyaltyGoal - 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-50 text-stone-400 hover:bg-stone-900 hover:text-white transition-all"><Minus size={16} /></button>
                  <input 
                    type="number"
                    value={loyaltyGoal}
                    onChange={(e) => setLoyaltyGoal(Number(e.target.value))}
                    className="flex-1 px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-black text-center"
                  />
                  <button type="button" onClick={() => setLoyaltyGoal(loyaltyGoal + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-50 text-stone-400 hover:bg-stone-900 hover:text-white transition-all"><Plus size={16} /></button>
                </div>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Valor Mínimo del Pedido para Sello</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                  <input 
                    type="number"
                    value={loyaltyMinOrder}
                    onChange={(e) => setLoyaltyMinOrder(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-black"
                    placeholder="Ej: 15000"
                  />
                </div>
                <p className="text-[10px] text-stone-400 font-medium italic">El cliente debe gastar al menos este valor para recibir un sello automáticamente.</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={isSaving}
                className="bg-stone-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-stone-800 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-stone-100 active:scale-95"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar Configuración
              </button>
            </div>
          </form>
        </div>

        {/* Referral Program Card */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100 group flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all duration-300">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">Programa de Referidos</h3>
                <p className="text-stone-400 text-xs font-medium">Atrae nuevos clientes mediante recomendaciones</p>
              </div>
            </div>
            <button 
              onClick={toggleReferral}
              className={cn(
                "w-14 h-8 rounded-full p-1 transition-all duration-300",
                settings.referralEnabled ? "bg-emerald-500" : "bg-stone-200"
              )}
            >
              <div className={cn(
                "w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300",
                settings.referralEnabled ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col justify-center p-8 bg-stone-50/50 rounded-3xl border border-stone-100 border-dashed">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-stone-400 mb-4">
              <Star size={24} className={cn(settings.referralEnabled ? "text-amber-500 fill-amber-500" : "text-stone-200")} />
            </div>
            <p className="text-sm text-stone-500 font-medium leading-relaxed">
              {settings.referralEnabled 
                ? "Los clientes pueden invitar amigos usando su número. El referente recibe un sello automático cuando el referido realiza su primera compra exitosa."
                : "El programa de referidos está actualmente desactivado. Actívalo para incentivar el crecimiento orgánico de tu base de clientes."}
            </p>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-8 border-b border-stone-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-black text-stone-900 uppercase tracking-tight">Clientes Registrados</h3>
              <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">{customers.length} Usuarios en total</p>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-medium text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/50 text-stone-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Información del Cliente</th>
                <th className="px-8 py-5 text-center">Progreso de Sellos</th>
                <th className="px-8 py-5">Referencia</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className={cn(
                  "hover:bg-stone-50/30 transition-colors group",
                  customer.stamps >= settings.loyaltyGoal && "bg-emerald-50/20"
                )}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-black text-xs">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-stone-900">{customer.name}</p>
                        <p className="text-xs text-stone-400 font-medium">{customer.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-4">
                      <button 
                        onClick={() => updateStamps(customer.id!, customer.stamps - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
                      >
                        <Minus size={16} />
                      </button>
                      <div className="relative group/badge">
                        <div className={cn(
                          "w-12 h-12 flex items-center justify-center font-black rounded-2xl transition-all duration-300 shadow-sm",
                          customer.stamps >= settings.loyaltyGoal 
                            ? "bg-emerald-500 text-white scale-110 rotate-3" 
                            : "bg-stone-50 text-stone-900"
                        )}>
                          {customer.stamps}
                        </div>
                        {customer.stamps >= settings.loyaltyGoal && (
                          <div className="absolute -top-2 -right-2 bg-amber-400 text-[10px] w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-md animate-bounce">
                            <Trophy size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => updateStamps(customer.id!, customer.stamps + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all active:scale-90"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="mt-3 w-32 mx-auto h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          customer.stamps >= settings.loyaltyGoal ? "bg-emerald-500" : "bg-stone-900"
                        )}
                        style={{ width: `${Math.min(100, (customer.stamps / settings.loyaltyGoal) * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        customer.referredBy ? "bg-blue-500" : "bg-stone-200"
                      )} />
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-tight">
                        {customer.referredBy ? `Por: ${customer.referredBy}` : 'Directo'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => deleteCustomer(customer.id!)}
                      className="p-3 text-stone-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                      title="Eliminar Cliente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-stone-200 mx-auto mb-4">
                      <Users size={32} />
                    </div>
                    <p className="text-stone-400 font-medium">No se encontraron clientes que coincidan.</p>
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
