import React from 'react';
import { Order, Product, Customer } from '../../types';
import { DollarSign, ShoppingBag, TrendingUp, Package, Users, Receipt } from 'lucide-react';
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

export default function DashboardTab({ orders, products, customers }: { orders: Order[], products: Product[], customers: Customer[] }) {
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalSales = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = completedOrders.length;
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
  
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
    return d.toISOString().split('T')[0];
  }).reverse();

  const salesData = last7Days.map(date => {
    const dayOrders = completedOrders.filter(o => o.createdAt.startsWith(date));
    const daySales = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const dayName = new Date(date).toLocaleDateString('es-CO', { weekday: 'short' });
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Análisis y Reportes</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-xl text-green-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Ventas Totales</p>
              <p className="text-2xl font-bold text-stone-900">{formatPrice(totalSales)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Pedidos Entregados</p>
              <p className="text-2xl font-bold text-stone-900">{totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Total Clientes</p>
              <p className="text-2xl font-bold text-stone-900">{customers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
              <Receipt size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Ticket Promedio</p>
              <p className="text-2xl font-bold text-stone-900">{formatPrice(averageTicket)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Tendencia de Ventas (Últimos 7 días)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  formatter={(value: number) => [formatPrice(value), 'Ventas']}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="sales" fill="#E3242B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delivery Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Distribución de Pedidos</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {deliveryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deliveryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deliveryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-stone-500">Sin datos de pedidos aún.</p>
            )}
            <div className="flex flex-col gap-2 ml-4">
              {deliveryData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                  <span className="text-xs font-medium text-stone-600">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center gap-2">
          <TrendingUp size={20} className="text-stone-500" />
          <h3 className="text-lg font-bold text-stone-900">Productos Más Vendidos</h3>
        </div>
        <div className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
              <tr>
                <th className="px-6 py-4 font-medium">Producto</th>
                <th className="px-6 py-4 font-medium text-right">Cantidad Vendida</th>
                <th className="px-6 py-4 font-medium text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {topProducts.map((product, index) => (
                <tr key={index} className="hover:bg-stone-50">
                  <td className="px-6 py-4 font-medium text-stone-900">{product.name}</td>
                  <td className="px-6 py-4 text-right font-medium">{product.quantity}</td>
                  <td className="px-6 py-4 text-right text-stone-500">{formatPrice(product.revenue)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-stone-500">Aún no hay ventas registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
