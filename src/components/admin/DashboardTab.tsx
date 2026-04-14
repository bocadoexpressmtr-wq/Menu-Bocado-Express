import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, Product, Customer, StoreSettings } from '../../types';
import { DollarSign, ShoppingBag, TrendingUp, Package, Users, Receipt, Trophy, Clock, Calendar, Trash2, AlertTriangle, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { useDialog } from '../../context/DialogContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function DashboardTab({ settings }: { settings: StoreSettings }) {
  const { showAlert, showConfirm } = useDialog();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7d' | '30d' | 'all'>('7d');
  const [isResetting, setIsResetting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersSnap, productsSnap, customersSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500))),
        getDocs(query(collection(db, 'products'))),
        getDocs(query(collection(db, 'customers'), orderBy('createdAt', 'desc'), limit(1000)))
      ]);
      setOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setCustomers(customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && orders.length === 0) return <div className="p-8 text-center text-stone-500">Cargando estadísticas...</div>;

  const completedOrders = orders.filter(o => {
    if (o.status !== 'completed') return false;
    
    const orderDate = new Date(o.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return orderDate >= today;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return orderDate >= yesterday && orderDate < today;
      case '7d':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        return orderDate >= last7;
      case '30d':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        return orderDate >= last30;
      case 'all':
        return true;
      default:
        return true;
    }
  });

  const totalSales = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = completedOrders.length;
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
  
  // Customers with pending prizes
  const customersWithPrizes = customers.filter(c => c.stamps >= settings.loyaltyGoal);
  
  // Calculate best-selling products
  const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
      }
      productSales[item.productId].quantity += item.quantity;
      productSales[item.productId].revenue += (item.price * item.quantity);
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Sales by day (based on selected range)
  const getDaysArray = () => {
    const days = dateRange === '30d' ? 30 : dateRange === 'all' ? 30 : 7;
    return [...Array(days)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }).reverse();
  };

  const salesData = getDaysArray().map(date => {
    const dayOrders = completedOrders.filter(o => {
      const orderDate = new Date(o.createdAt);
      const localDateStr = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
      return localDateStr === date;
    });
    const daySales = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const [year, month, day] = date.split('-');
    const dayName = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('es-CO', { weekday: 'short' });
    return { name: dayName, sales: daySales, date };
  });

  // Delivery type distribution
  const deliveryData = [
    { name: 'Domicilio', value: completedOrders.filter(o => o.deliveryType === 'domicilio').length },
    { name: 'Recoger', value: completedOrders.filter(o => o.deliveryType === 'recoger').length },
    { name: 'En Local', value: completedOrders.filter(o => o.deliveryType === 'local').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#E3242B', '#1A1A1A', '#71717a'];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleResetData = () => {
    showConfirm(
      "¿RESETEAR DATOS DE PRUEBA?",
      "Esta acción eliminará TODOS los pedidos y clientes registrados. Los productos y categorías NO se verán afectados. Esta acción no se puede deshacer.",
      async () => {
        setIsResetting(true);
        try {
          const batch = writeBatch(db);
          
          // Delete all orders
          const ordersSnap = await getDocs(collection(db, 'orders'));
          ordersSnap.docs.forEach(d => batch.delete(d.ref));
          
          // Delete all customers
          const customersSnap = await getDocs(collection(db, 'customers'));
          customersSnap.docs.forEach(d => batch.delete(d.ref));
          
          await batch.commit();
          showAlert("Éxito", "Todos los datos de prueba han sido eliminados.", 'success');
        } catch (error) {
          console.error("Error resetting data:", error);
          showAlert("Error", "No se pudieron eliminar los datos.", 'error');
        } finally {
          setIsResetting(false);
        }
      }
    );
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Análisis y Reportes</h2>
          <p className="text-stone-500 text-xs">Resumen del rendimiento de tu negocio</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-stone-100 text-stone-700 px-3 py-2 rounded-lg hover:bg-stone-200 transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="text-xs font-bold">Actualizar</span>
          </button>
          <div className="relative flex-1 md:flex-none">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full md:w-auto pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-lg shadow-sm text-xs font-bold text-stone-600 appearance-none focus:ring-2 focus:ring-stone-900 outline-none transition-all"
            >
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="all">Todo el tiempo</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={12} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 hover:shadow-md transition-shadow group">
          <div className="flex flex-col gap-2">
            <div className="bg-emerald-50 w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <DollarSign size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Ventas Totales</p>
              <p className="text-base md:text-lg font-black text-stone-900 mt-0.5">{formatPrice(totalSales)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 hover:shadow-md transition-shadow group">
          <div className="flex flex-col gap-2">
            <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <ShoppingBag size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Pedidos</p>
              <p className="text-base md:text-lg font-black text-stone-900 mt-0.5">{totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 hover:shadow-md transition-shadow group">
          <div className="flex flex-col gap-2">
            <div className="bg-purple-50 w-8 h-8 rounded-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Clientes</p>
              <p className="text-base md:text-lg font-black text-stone-900 mt-0.5">{customers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 hover:shadow-md transition-shadow group">
          <div className="flex flex-col gap-2">
            <div className="bg-orange-50 w-8 h-8 rounded-lg flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
              <Receipt size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Ticket Promedio</p>
              <p className="text-base md:text-lg font-black text-stone-900 mt-0.5">{formatPrice(averageTicket)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100">
          <h3 className="text-sm font-bold text-stone-900 mb-3">Tendencia de Ventas</h3>
          <div className="h-[200px] w-full flex items-center justify-center">
            {salesData.some(d => d.sales > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 9, fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 9, fontWeight: 600}} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip 
                    cursor={{fill: '#f5f5f5'}}
                    formatter={(value: number) => [formatPrice(value), 'Ventas']}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '6px', fontSize: '10px'}}
                  />
                  <Bar dataKey="sales" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-stone-300 flex flex-col items-center">
                <TrendingUp size={24} className="mb-2 opacity-20" />
                <p className="text-[10px] font-medium">Sin datos de ventas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Prizes */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Trophy className="text-amber-500" size={16} />
              Premios Pendientes
            </h3>
            <span className="bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-100">
              {customersWithPrizes.length} Clientes
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar space-y-1.5">
            {customersWithPrizes.length > 0 ? (
              customersWithPrizes.map(customer => (
                <div key={customer.id} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-100 hover:bg-white hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-stone-400 font-bold border border-stone-100 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors text-[10px]">
                      {customer.name ? customer.name.charAt(0) : '?'}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 text-[10px]">{customer.name}</p>
                      <p className="text-[8px] text-stone-400 font-medium">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tight">{settings.loyaltyPrize}</p>
                    <p className="text-[8px] text-stone-400 font-bold">{customer.stamps} sellos</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-4">
                <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center text-stone-200 mb-2">
                  <Trophy size={20} />
                </div>
                <p className="text-[10px] text-stone-400 font-medium">No hay premios pendientes por ahora.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="p-3 md:p-4 border-b border-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={16} className="text-stone-400" />
              <h3 className="text-sm font-bold text-stone-900">Más Vendidos</h3>
            </div>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-[10px] min-w-[250px]">
              <thead className="bg-stone-50/50 text-stone-400 border-b border-stone-50">
                <tr>
                  <th className="px-3 py-2 font-bold uppercase text-[8px] tracking-widest">Producto</th>
                  <th className="px-3 py-2 font-bold uppercase text-[8px] tracking-widest text-right">Cant.</th>
                  <th className="px-3 py-2 font-bold uppercase text-[8px] tracking-widest text-right">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {topProducts.map((product, index) => (
                  <tr key={index} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-300 font-black text-[8px]">0{index + 1}</span>
                        <span className="font-bold text-stone-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-black text-stone-900">{product.quantity}</td>
                    <td className="px-3 py-2 text-right text-stone-500 font-medium">{formatPrice(product.revenue)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-stone-400 font-medium">Sin ventas registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Distribution */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100">
          <h3 className="text-sm font-bold text-stone-900 mb-3">Distribución de Pedidos</h3>
          <div className="h-[150px] w-full flex flex-col md:flex-row items-center justify-center gap-4">
            {deliveryData.length > 0 ? (
              <>
                <div className="h-full flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deliveryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {deliveryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', padding: '6px', fontSize: '10px'}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 min-w-[100px]">
                  {deliveryData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                        <span className="text-[9px] font-bold text-stone-500">{entry.name}</span>
                      </div>
                      <span className="text-[9px] font-black text-stone-900">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-stone-300">
                <Receipt size={24} className="mb-2 opacity-20" />
                <p className="text-[10px] font-medium">Sin datos de pedidos.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone / Reset */}
      <div className="mt-6 pt-6 border-t border-stone-100">
        <div className="bg-red-50 rounded-xl p-4 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-center md:text-left">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-red-500 shadow-sm shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-900 uppercase tracking-tight">Zona de Mantenimiento</h3>
              <p className="text-red-600/70 text-[10px] font-medium">Limpia los datos de prueba antes del lanzamiento real</p>
            </div>
          </div>
          <button 
            onClick={handleResetData}
            disabled={isResetting}
            className="w-full md:w-auto bg-red-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-red-200"
          >
            {isResetting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Resetear Datos de Prueba
          </button>
        </div>
      </div>
    </div>
  );
}
