import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { LayoutDashboard, Package, ListOrdered, Settings, LogOut, MessageSquare, BarChart3, Gift } from 'lucide-react';
import { Order, Product, Category, StoreSettings, Review, Customer } from '../types';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import OrdersTab from '../components/admin/OrdersTab';
import ProductsTab from '../components/admin/ProductsTab';
import CategoriesTab from '../components/admin/CategoriesTab';
import ReviewsTab from '../components/admin/ReviewsTab';
import SettingsTab from '../components/admin/SettingsTab';
import DashboardTab from '../components/admin/DashboardTab';
import LoyaltyTab from '../components/admin/LoyaltyTab';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'categories' | 'reviews' | 'settings' | 'loyalty'>('dashboard');

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    isStoreOpen: true,
    loyaltyEnabled: true,
    loyaltyPrize: '1 Producto Gratis',
    loyaltyGoal: 5,
    loyaltyMinOrder: 0,
    referralEnabled: true,
    adminPin: '021403'
  });

  useEffect(() => {
    // Fetch settings first to get the PIN
    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        setSettings({
          isStoreOpen: data.isStoreOpen ?? true,
          loyaltyEnabled: data.loyaltyEnabled ?? true,
          loyaltyPrize: data.loyaltyPrize ?? '1 Producto Gratis',
          loyaltyGoal: data.loyaltyGoal ?? 5,
          loyaltyMinOrder: data.loyaltyMinOrder ?? 0,
          referralEnabled: data.referralEnabled ?? true,
          adminPin: data.adminPin ?? '021403'
        });
      } else {
        // Initialize settings if they don't exist
        setDoc(doc(db, 'settings', 'store'), settings);
      }
      setLoading(false);
    });

    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      // Play sound for new orders if not initial load
      if (orders.length > 0 && newOrders.length > orders.length) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio play failed:", e));
      }
      
      setOrders(newOrders);
    }, (err) => console.error(err));

    const unsubProducts = onSnapshot(query(collection(db, 'products')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => console.error(err));

    const unsubCategories = onSnapshot(query(collection(db, 'categories'), orderBy('order')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (err) => console.error(err));

    const unsubReviews = onSnapshot(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')), (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    }, (err) => console.error(err));

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (err) => console.error(err));

    return () => {
      unsubOrders();
      unsubProducts();
      unsubCategories();
      unsubReviews();
      unsubCustomers();
    };
  }, [isAuthenticated, orders.length]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === settings.adminPin) {
      setIsAuthenticated(true);
      setPinInput('');
    } else {
      alert("PIN incorrecto");
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.email === 'bocadoexpress@gmail.com') {
        setIsAuthenticated(true);
      } else {
        alert("Este correo no tiene permisos de administrador.");
        await auth.signOut();
      }
    } catch (error) {
      console.error("Error during Google login:", error);
      alert("Error al iniciar sesión con Google.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-100">Cargando...</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Panel de Administración</h1>
          <p className="text-stone-500 mb-8">Ingresa el PIN de seguridad para acceder.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN de 6 dígitos"
              className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-900 outline-none"
              required
            />
            <button 
              type="submit"
              className="w-full bg-stone-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-stone-800 transition-colors"
            >
              Ingresar
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-stone-100">
            <button 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border border-stone-300 text-stone-700 font-medium py-3 px-4 rounded-xl hover:bg-stone-50 transition-colors"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Recuperar con Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  const seedDatabase = async () => {
    if (!window.confirm("¿Estás seguro de que deseas cargar el menú de prueba de Bocado Express? Esto agregará categorías y productos automáticamente.")) return;
    
    setLoading(true);
    try {
      const bocadoData = [
        {
          name: 'Suizos', order: 1, items: [
            { name: 'Choripapa', description: 'Papa francesa, Chorizo, cebolla, ripio, queso rallado, salsa de la casa', price: 10000 },
            { name: 'Suizo Clásico', description: 'Papa francesa, salchicha suiza, cebolla, ripio, queso rallado, salsa de la casa', price: 14000 },
            { name: 'Chori-Suizo', description: 'Papa francesa, salchicha suiza, chorizo, cebolla, papa ripio, queso rallado, salsa de la casa', price: 16000 },
            { name: 'Especial Costeño', description: 'Papa francesa, salchicha suiza, chorizo, tocineta ahumada, cebolla, ripio, queso rallado, queso frito en cubos, salsa de la casa', price: 20000 },
          ]
        },
        {
          name: 'Cubanos', order: 2, items: [
            { name: 'Jamón y Queso', description: 'Pan, salsas, ripio, jamón, queso mozarella', price: 4000 },
            { name: 'Hawaiano', description: 'Pan, salsas, ripio, jamón, piña, queso mozarella', price: 4000 },
            { name: 'Tocino Maíz', description: 'Pan, salsas, ripio, tocino, maíz, queso mozarella', price: 4000 },
            { name: 'Chorizo', description: 'Pan, salsas, ripio, chorizo, queso mozarella', price: 4000 },
            { name: 'Suiza', description: 'Pan, salsas, ripio, suiza, queso mozarella', price: 4000 },
            { name: 'Pollo', description: 'Pan, salsas, ripio, pollo, queso mozarella', price: 5000 },
            { name: 'Carne', description: 'Pan, salsas, ripio, carne esmechada, queso mozarella', price: 5000 },
          ]
        },
        {
          name: 'Combos', order: 3, items: [
            { name: 'Mini Bocado', description: '2 Cubanos + Gaseosa Postobon 250', price: 9000 },
            { name: 'Bocado Enérgico', description: '2 Cubanos + Milo', price: 11000 },
            { name: 'Bocado Completo', description: '2 Cubanos + Milo + Papas Chorreadas', price: 16000 },
            { name: 'Bocado Doble', description: '4 Cubanos + 2 Gaseosa Coca-Cola 250', price: 20000 },
            { name: 'Gran Bocado Postobon', description: '8 Cubanos + Econolitro Postobón 1 Litro', price: 34000 },
            { name: 'Gran Bocado Coca-Cola', description: '8 Cubanos + Coca-Cola Tamaño 1.5', price: 36000 },
          ]
        },
        {
          name: 'Adiciones', order: 4, items: [
            { name: 'Tocineta', description: 'Adición', price: 2000 },
            { name: 'Queso Costeño Frito', description: 'Adición', price: 4000 },
            { name: 'Carne Desmechada', description: 'Adición', price: 4000 },
            { name: 'Pollo Desmechado', description: 'Adición', price: 4000 },
            { name: 'Gratinado', description: 'Adición', price: 5000 },
          ]
        },
        {
          name: 'Bebidas y Extras', order: 5, items: [
            { name: 'Agua Pequeña', description: 'Tamaño 300 ml', price: 1000 },
            { name: 'Agua Grande', description: 'Tamaño 600 ml', price: 2000 },
            { name: 'Jugo de Corozo', description: 'Tamaño 300 ml', price: 2000 },
            { name: 'Postobon', description: 'Personal 250 ml', price: 2000 },
            { name: 'Coca-Cola', description: 'Personal 250 ml', price: 3000 },
            { name: 'Milo', description: '14 oz', price: 4000 },
            { name: 'Jugo Hit', description: 'Personal 280 ml', price: 4000 },
            { name: 'Econolitro', description: 'Postobon 1 Litro', price: 4000 },
            { name: 'Papas', description: 'Sin salsas', price: 5000 },
            { name: 'Papas Chorreadas', description: 'Salsa especial con tocineta picada', price: 6000 },
            { name: 'Coca-Cola Grande', description: 'Tamaño 1.5', price: 7000 },
          ]
        }
      ];

      for (const cat of bocadoData) {
        const { addDoc } = await import('firebase/firestore');
        const catRef = await addDoc(collection(db, 'categories'), {
          name: cat.name,
          order: cat.order
        });
        
        for (const item of cat.items) {
          await addDoc(collection(db, 'products'), {
            name: item.name,
            description: item.description,
            price: item.price,
            categoryId: catRef.id,
            isAvailable: true,
            imageUrl: ''
          });
        }
      }
      alert("Menú cargado exitosamente!");
    } catch (error) {
      console.error("Error seeding database", error);
      alert("Hubo un error al cargar el menú.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-stone-200 text-stone-600 flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-stone-100">
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white">
              <LayoutDashboard size={18} />
            </div>
            Bocado Admin
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' : 'hover:bg-stone-100 text-stone-500 hover:text-stone-900'}`}
          >
            <BarChart3 size={18} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'orders' ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' : 'hover:bg-stone-100 text-stone-500 hover:text-stone-900'}`}
          >
            <ListOrdered size={18} />
            <span className="font-medium">Pedidos</span>
            {orders.filter(o => o.status === 'pending').length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {orders.filter(o => o.status === 'pending').length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'products' ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' : 'hover:bg-stone-100 text-stone-500 hover:text-stone-900'}`}
          >
            <Package size={18} />
            <span className="font-medium">Productos</span>
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'categories' ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' : 'hover:bg-stone-100 text-stone-500 hover:text-stone-900'}`}
          >
            <Settings size={18} />
            <span className="font-medium">Categorías</span>
          </button>
          <button 
            onClick={() => setActiveTab('reviews')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'reviews' ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' : 'hover:bg-stone-100 text-stone-500 hover:text-stone-900'}`}
          >
            <MessageSquare size={18} />
            <span className="font-medium">Reseñas</span>
          </button>
          <button 
            onClick={() => setActiveTab('loyalty')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'loyalty' ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' : 'hover:bg-stone-100 text-stone-500 hover:text-stone-900'}`}
          >
            <Gift size={18} />
            <span className="font-medium">Lealtad</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'settings' ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' : 'hover:bg-stone-100 text-stone-500 hover:text-stone-900'}`}
          >
            <Settings size={18} />
            <span className="font-medium">Ajustes</span>
          </button>
        </nav>
        <div className="p-4 border-t border-stone-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 text-sm font-medium"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard size={16} />
          </div>
          Bocado Admin
        </h1>
        <button 
          onClick={handleLogout}
          className="p-2 text-stone-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-2 py-1 flex justify-around items-center z-50 pb-safe">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'text-stone-900' : 'text-stone-400'}`}
        >
          <BarChart3 size={20} />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors relative ${activeTab === 'orders' ? 'text-stone-900' : 'text-stone-400'}`}
        >
          <ListOrdered size={20} />
          <span className="text-[10px] font-medium">Pedidos</span>
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'products' ? 'text-stone-900' : 'text-stone-400'}`}
        >
          <Package size={20} />
          <span className="text-[10px] font-medium">Productos</span>
        </button>
        <button 
          onClick={() => setActiveTab('loyalty')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'loyalty' ? 'text-stone-900' : 'text-stone-400'}`}
        >
          <Gift size={20} />
          <span className="text-[10px] font-medium">Lealtad</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'settings' ? 'text-stone-900' : 'text-stone-400'}`}
        >
          <Settings size={20} />
          <span className="text-[10px] font-medium">Ajustes</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <DashboardTab orders={orders} products={products} customers={customers} settings={settings} />}
          {activeTab === 'orders' && <OrdersTab orders={orders} settings={settings} />}
          {activeTab === 'products' && <ProductsTab products={products} categories={categories} />}
          {activeTab === 'categories' && <CategoriesTab categories={categories} />}
          {activeTab === 'reviews' && <ReviewsTab reviews={reviews} />}
          {activeTab === 'loyalty' && <LoyaltyTab customers={customers} settings={settings} />}
          {activeTab === 'settings' && <SettingsTab settings={settings} />}
        </div>
      </main>
    </div>
  );
}
