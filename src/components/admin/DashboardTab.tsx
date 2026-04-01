import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, Product, Customer } from '../../types';
import { DollarSign, ShoppingBag, TrendingUp, Package, Users, Receipt, Trophy, Clock } from 'lucide-react';
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
import { StoreSettings } from '../../types';

export default function DashboardTab({ settings }: { settings: StoreSettings }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500)), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const unsubProducts = onSnapshot(query(collection(db, 'products')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), orderBy('createdAt', 'desc'), limit(1000)), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    setLoading(false);

    return () => {
      unsubOrders();
      unsubProducts();
      unsubCustomers();
    };
  }, []);

  if (loading && orders.length === 0) return <div className="p-8 text-center text-stone-500">Cargando estadísticas...</div>;

  const completedOrders = orders.filter(o => o.status === 'completed');
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

  // Sales by day (last 7 days)
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }).reverse();

  const salesData = last7Days.map(date => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">Análisis y Reportes</h2>
          <p className="text-stone-500 text-sm">Resumen del rendimiento de tu negocio</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 text-sm font-medium">
          <Clock size={16} />
          Últimos 7 días
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-stone-100 hover:shadow-md transition-shadow group">
          <div className="flex flex-col gap-4">
            <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Ventas Totales</p>
              <p className="text-xl md:text-2xl font-black text-stone-900 mt-1">{formatPrice(totalSales)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-stone-100 hover:shadow-md transition-shadow group">
          <div className="flex flex-col gap-4">
            <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Pedidos</p>
              <p className="text-xl md:text-2xl font-black text-stone-900 mt-1">{totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-stone-100 hover:shadow-md transition-shadow group">
          <div className="flex flex-col gap-4">
            <div className="bg-purple-50 w-12 h-12 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Clientes</p>
              <p className="text-xl md:text-2xl font-black text-stone-900 mt-1">{customers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-stone-100 hover:shadow-md transition-shadow group">
          <div className="flex flex-col gap-4">
            <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
              <Receipt size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Ticket Promedio</p>
              <p className="text-xl md:text-2xl font-black text-stone-900 mt-1">{formatPrice(averageTicket)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Tendencia de Ventas</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {salesData.some(d => d.sales > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 11, fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 11, fontWeight: 600}} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip 
                    cursor={{fill: '#f5f5f5'}}
                    formatter={(value: number) => [formatPrice(value), 'Ventas']}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '12px'}}
                  />
                  <Bar dataKey="sales" fill="#1A1A1A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-stone-300 flex flex-col items-center">
                <TrendingUp size={48} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">Sin datos de ventas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Prizes */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Trophy className="text-amber-500" size={20} />
              Premios Pendientes
            </h3>
            <span className="bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-100">
              {customersWithPrizes.length} Clientes
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar space-y-3">
            {customersWithPrizes.length > 0 ? (
              customersWithPrizes.map(customer => (
                <div key={customer.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:bg-white hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-stone-400 font-bold border border-stone-100 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                      {customer.name ? customer.name.charAt(0) : '?'}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 text-sm">{customer.name}</p>
                      <p className="text-[10px] text-stone-400 font-medium">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">{settings.loyaltyPrize}</p>
                    <p className="text-[10px] text-stone-400 font-bold">{customer.stamps} sellos</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-stone-200 mb-4">
                  <Trophy size={32} />
                </div>
                <p className="text-sm text-stone-400 font-medium">No hay premios pendientes por ahora.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden">
          <div className="p-6 border-b border-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-stone-400" />
              <h3 className="text-lg font-bold text-stone-900">Más Vendidos</h3>
            </div>
          </div>
          <div className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50/50 text-stone-400 border-b border-stone-50">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Producto</th>
                  <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-right">Cant.</th>
                  <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-right">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {topProducts.map((product, index) => (
                  <tr key={index} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-stone-300 font-black text-xs">0{index + 1}</span>
                        <span className="font-bold text-stone-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-stone-900">{product.quantity}</td>
                    <td className="px-6 py-4 text-right text-stone-500 font-medium">{formatPrice(product.revenue)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-stone-400 font-medium">Sin ventas registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Distribution */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Distribución de Pedidos</h3>
          <div className="h-[250px] w-full flex flex-col md:flex-row items-center justify-center gap-8">
            {deliveryData.length > 0 ? (
              <>
                <div className="h-full flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deliveryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {deliveryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3 min-w-[140px]">
                  {deliveryData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                        <span className="text-xs font-bold text-stone-500">{entry.name}</span>
                      </div>
                      <span className="text-xs font-black text-stone-900">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-stone-300">
                <Receipt size={48} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">Sin datos de pedidos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
