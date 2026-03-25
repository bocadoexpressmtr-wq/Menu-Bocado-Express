import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Customer, StoreSettings } from '../../types';
import { Gift, Users, Search, Plus, Minus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

interface LoyaltyTabProps {
  customers: Customer[];
  settings: StoreSettings;
}

export default function LoyaltyTab({ customers, settings }: LoyaltyTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

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

  const updateSettings = async (field: string, value: any) => {
    try {
      await updateDoc(doc(db, 'settings', 'store'), {
        [field]: value
      });
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
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
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <Gift className="text-stone-900" />
          Programa de Lealtad y Referidos
        </h2>
      </div>

      {/* Program Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-stone-100 rounded-xl text-stone-600">
                <Gift size={24} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">Programa de Lealtad</h3>
                <p className="text-sm text-stone-500">Habilitar/Deshabilitar sellos</p>
              </div>
            </div>
            <button 
              onClick={toggleLoyalty}
              className={`p-1 rounded-full transition-colors ${settings.loyaltyEnabled ? 'text-green-600' : 'text-stone-400'}`}
            >
              {settings.loyaltyEnabled ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Premio</label>
              <input 
                type="text"
                value={settings.loyaltyPrize}
                onChange={(e) => updateSettings('loyaltyPrize', e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Meta de Sellos</label>
              <input 
                type="number"
                value={settings.loyaltyGoal}
                onChange={(e) => updateSettings('loyaltyGoal', Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-stone-100 rounded-xl text-stone-600">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">Programa de Referidos</h3>
                <p className="text-sm text-stone-500">Habilitar/Deshabilitar referidos</p>
              </div>
            </div>
            <button 
              onClick={toggleReferral}
              className={`p-1 rounded-full transition-colors ${settings.referralEnabled ? 'text-green-600' : 'text-stone-400'}`}
            >
              {settings.referralEnabled ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
            </button>
          </div>
          <div className="mt-4 p-4 bg-stone-50 rounded-xl border border-stone-100">
            <p className="text-xs text-stone-500 leading-relaxed">
              Cuando está habilitado, los clientes pueden referir a otros usando su número de teléfono. 
              El referente recibe un sello cuando el referido realiza su primer pedido.
            </p>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-stone-900">Clientes Registrados ({customers.length})</h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Teléfono</th>
                <th className="px-6 py-4 font-semibold">Sellos</th>
                <th className="px-6 py-4 font-semibold">Referido por</th>
                <th className="px-6 py-4 font-semibold">Fecha Registro</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-stone-900">{customer.phone}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateStamps(customer.id!, customer.stamps - 1)}
                        className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-bold text-stone-900 bg-stone-100 rounded-lg py-1">
                        {customer.stamps}
                      </span>
                      <button 
                        onClick={() => updateStamps(customer.id!, customer.stamps + 1)}
                        className="p-1 text-stone-400 hover:text-green-600 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-stone-500">{customer.referredBy || 'Directo'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-stone-500">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => deleteCustomer(customer.id!)}
                      className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                      title="Eliminar Cliente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-500">
                    No se encontraron clientes.
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
