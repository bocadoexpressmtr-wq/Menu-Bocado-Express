import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { LayoutDashboard, Package, ListOrdered, Settings, LogOut, MessageSquare, BarChart3, Gift, Tag } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { Order, Product, Category, StoreSettings, Review, Customer } from '../types';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import OrdersTab from '../components/admin/OrdersTab';
import ProductsTab from '../components/admin/ProductsTab';
import CategoriesTab from '../components/admin/CategoriesTab';
import ReviewsTab from '../components/admin/ReviewsTab';
import SettingsTab from '../components/admin/SettingsTab';
import DashboardTab from '../components/admin/DashboardTab';
import LoyaltyTab from '../components/admin/LoyaltyTab';
import CouponsTab from '../components/admin/CouponsTab';
import FeedbackTab from '../components/admin/FeedbackTab';

export default function Admin() {
  const { showAlert, showConfirm } = useDialog();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'categories' | 'reviews' | 'settings' | 'loyalty' | 'coupons' | 'feedback'>('settings');
  const [user, setUser] = useState(auth.currentUser);

  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      const allowedEmails = ['bocadoexpress.mtr@gmail.com', 'enamoradooluis@gmail.com'];
      if (u && allowedEmails.includes(u.email || '')) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Data states
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    isStoreOpen: true,
    loyaltyEnabled: true,
    loyaltyPrize: '1 Producto Gratis',
    loyaltyGoal: 5,
    loyaltyMinOrder: 0,
    referralEnabled: true,
    adminPin: '021403',
    whatsappMessageHeader: '🥪 *NUEVO PEDIDO - BOCADO EXPRESS*',
    whatsappMessageFooter: 'Vengo de Menú Digital Bocado Express',
    shareText: 'Los mejores cubanos y suizos de la ciudad',
    socialLinks: [
      { id: '1', platform: 'Instagram', url: 'https://instagram.com/BOCADOEXPRESS.MTR', icon: 'Instagram' },
      { id: '2', platform: 'Facebook', url: 'https://facebook.com/BOCADOEXPRESS.MTR', icon: 'Facebook' },
      { id: '3', platform: 'TikTok', url: 'https://tiktok.com/@BOCADOEXPRESS.MTR', icon: 'Music2' }
    ],
    cloudinaryCloudName: 'dblc4iq2o',
    cloudinaryUploadPreset: 'bocado_menu'
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
          adminPin: data.adminPin ?? '021403',
          whatsappNumber: data.whatsappNumber ?? '573144052399',
          nequiNumber: data.nequiNumber ?? '3124726152',
          whatsappMessageHeader: data.whatsappMessageHeader ?? '🥪 *NUEVO PEDIDO - BOCADO EXPRESS*',
          whatsappMessageFooter: data.whatsappMessageFooter ?? 'Vengo de Menú Digital Bocado Express',
          shareText: data.shareText ?? 'Los mejores cubanos y suizos de la ciudad',
          socialLinks: data.socialLinks ?? [
            { id: '1', platform: 'Instagram', url: 'https://instagram.com/BOCADOEXPRESS.MTR', icon: 'Instagram' },
            { id: '2', platform: 'Facebook', url: 'https://facebook.com/BOCADOEXPRESS.MTR', icon: 'Facebook' },
            { id: '3', platform: 'TikTok', url: 'https://tiktok.com/@BOCADOEXPRESS.MTR', icon: 'Music2' }
          ],
          cloudinaryCloudName: data.cloudinaryCloudName ?? 'dblc4iq2o',
          cloudinaryUploadPreset: data.cloudinaryUploadPreset ?? 'bocado_menu'
        });
      }
      setSettingsLoading(false);
    }, (err) => {
      console.error("Settings Error:", err);
      setSettingsLoading(false);
    });

    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubPendingOrders = onSnapshot(query(collection(db, 'orders'), where('status', '==', 'pending')), (snapshot) => {
      const newPending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      setPendingOrders(prev => {
        if (prev.length > 0 && newPending.length > prev.length) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.log("Audio play failed:", e));
          
          if (Notification.permission === 'granted') {
            new Notification('¡Nuevo Pedido!', { 
              body: 'Tienes un nuevo pedido en Bocado Express',
              icon: 'https://api.iconify.design/lucide:sandwich.svg?color=%23E3242B'
            });
          }
        }
        return newPending;
      });
    }, (err) => console.error(err));

    return () => {
      unsubPendingOrders();
    };
  }, [isAuthenticated]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const allowedEmails = ['bocadoexpress.mtr@gmail.com', 'enamoradooluis@gmail.com'];
      if (allowedEmails.includes(result.user.email || '')) {
        setIsAuthenticated(true);
      } else {
        showAlert("Acceso denegado", "Este correo no tiene permisos de administrador.", 'error');
        await auth.signOut();
      }
    } catch (error) {
      console.error("Error during Google login:", error);
      showAlert("Error", "Error al iniciar sesión con Google.", 'error');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  if (authLoading || settingsLoading) return <div className="min-h-screen flex items-center justify-center bg-stone-100">Cargando...</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Panel de Administración</h1>
          <p className="text-stone-500 mb-8">Inicia sesión con tu cuenta de Google autorizada.</p>
          
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-stone-300 text-stone-700 font-medium py-3 px-4 rounded-xl hover:bg-stone-50 transition-colors"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Ingresar con Google
          </button>
        </div>
      </div>
    );
  }

  const seedDatabase = async () => {
    showConfirm(
      "¿Cargar Menú de Prueba?",
      "¿Estás seguro de que deseas cargar el menú de prueba de Bocado Express? Esto agregará categorías y productos automáticamente.",
      async () => {
        setIsSeeding(true);
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
          showAlert("Éxito", "Menú cargado exitosamente!", 'success');
        } catch (error) {
          console.error("Error seeding database", error);
          showAlert("Error", "Hubo un error al cargar el menú.", 'error');
        } finally {
          setIsSeeding(false);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-stone-200 text-stone-600 flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900 leading-none">Bocado</h1>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Admin Panel</p>
            </div>
          </div>
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
            {pendingOrders.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingOrders.length}
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
            onClick={() => setActiveTab('coupons')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'coupons' ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' : 'hover:bg-stone-100 text-stone-500 hover:text-stone-900'}`}
          >
            <Tag size={18} />
            <span className="font-medium">Cupones</span>
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'feedback' ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' : 'hover:bg-stone-100 text-stone-500 hover:text-stone-900'}`}
          >
            <MessageSquare size={18} />
            <span className="font-medium">Sugerencias</span>
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          </div>
          <h1 className="text-lg font-bold text-stone-900">Bocado Admin</h1>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-stone-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex items-center z-50 pb-safe overflow-x-auto scrollbar-hide shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center px-4 min-w-max">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-3 min-w-[72px] transition-colors ${activeTab === 'dashboard' ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <BarChart3 size={20} />
            <span className="text-[10px] font-bold">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center gap-1 p-3 min-w-[72px] transition-colors relative ${activeTab === 'orders' ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <ListOrdered size={20} />
            <span className="text-[10px] font-bold">Pedidos</span>
            {pendingOrders.length > 0 && (
              <span className="absolute top-2 right-4 bg-red-500 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`flex flex-col items-center gap-1 p-3 min-w-[72px] transition-colors ${activeTab === 'products' ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <Package size={20} />
            <span className="text-[10px] font-bold">Productos</span>
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex flex-col items-center gap-1 p-3 min-w-[72px] transition-colors ${activeTab === 'categories' ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <ListOrdered size={20} />
            <span className="text-[10px] font-bold">Categorías</span>
          </button>
          <button 
            onClick={() => setActiveTab('loyalty')}
            className={`flex flex-col items-center gap-1 p-3 min-w-[72px] transition-colors ${activeTab === 'loyalty' ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <Gift size={20} />
            <span className="text-[10px] font-bold">Lealtad</span>
          </button>
          <button 
            onClick={() => setActiveTab('coupons')}
            className={`flex flex-col items-center gap-1 p-3 min-w-[72px] transition-colors ${activeTab === 'coupons' ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <Tag size={20} />
            <span className="text-[10px] font-bold">Cupones</span>
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`flex flex-col items-center gap-1 p-3 min-w-[72px] transition-colors ${activeTab === 'feedback' ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <MessageSquare size={20} />
            <span className="text-[10px] font-bold">Sugerencias</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 p-3 min-w-[72px] transition-colors ${activeTab === 'settings' ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <Settings size={20} />
            <span className="text-[10px] font-bold">Ajustes</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto">
          {isAuthenticated && !user && (
            <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-amber-800">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Acceso Limitado</p>
                  <p className="text-xs opacity-80">Para ver pedidos y gestionar datos sensibles, debes vincular tu cuenta de Google.</p>
                </div>
              </div>
              <button 
                onClick={handleGoogleLogin}
                className="whitespace-nowrap bg-white border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-2"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                Vincular Google
              </button>
            </div>
          )}
          {activeTab === 'dashboard' && <DashboardTab settings={settings} />}
          {activeTab === 'orders' && <OrdersTab settings={settings} />}
          {activeTab === 'products' && <ProductsTab settings={settings} />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'reviews' && <ReviewsTab />}
          {activeTab === 'loyalty' && <LoyaltyTab settings={settings} />}
          {activeTab === 'coupons' && <CouponsTab />}
          {activeTab === 'feedback' && <FeedbackTab />}
          {activeTab === 'settings' && <SettingsTab settings={settings} />}
        </div>
      </main>
    </div>
  );
}
