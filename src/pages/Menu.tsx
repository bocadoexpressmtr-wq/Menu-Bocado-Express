import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingCart, MapPin, Send, Plus, Minus, Trash2, CheckCircle2, Instagram, Facebook, Music2, Gift, Info, X, Store, Bike, UtensilsCrossed, Wallet, Banknote, PartyPopper, Star, Share2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Product, Category, CartItem, DeliveryType, PaymentMethod, StoreSettings, Customer, Review } from '../types';

export default function Menu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>({
    isStoreOpen: true,
    loyaltyPrize: '1 Producto Gratis',
    loyaltyGoal: 5,
    referralEnabled: true
  });
  
  // Checkout Form State
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('domicilio');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('nequi');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [customerName, setCustomerName] = useState(() => {
    return localStorage.getItem('lastCustomerName') || '';
  });
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loyaltyOptIn, setLoyaltyOptIn] = useState(() => {
    return localStorage.getItem('lastLoyaltyOptIn') === 'true';
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(() => {
    return localStorage.getItem('orderSuccess') === 'true';
  });

  // Loyalty Modal State
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [loyaltyPhoneInput, setLoyaltyPhoneInput] = useState('');
  const [loyaltyNameInput, setLoyaltyNameInput] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null);
  const [isCheckingLoyalty, setIsCheckingLoyalty] = useState(false);

  // UI State
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  useEffect(() => {
    const qProducts = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((doc) => prods.push({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
    }, (error) => console.error("Error fetching products", error));

    const qCategories = query(collection(db, 'categories'), orderBy('order'));
    const unsubCategories = onSnapshot(qCategories, (snapshot) => {
      const cats: Category[] = [];
      snapshot.forEach((doc) => cats.push({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats);
    }, (error) => console.error("Error fetching categories", error));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as StoreSettings);
      }
    }, (error) => console.error("Error fetching settings", error));

    const qReviews = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubReviews = onSnapshot(qReviews, (snapshot) => {
      const revs: Review[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Review;
        if (data.isVisible) {
          revs.push({ id: doc.id, ...data });
        }
      });
      setReviews(revs);
    }, (error) => console.error("Error fetching reviews", error));

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSettings();
      unsubReviews();
    };
  }, []);

  // Scroll Spy Effect removed for independent category navigation

  const addToCart = (product: Product) => {
    if (!settings.isStoreOpen) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    // Silent add - don't open cart
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Bocado Express - Menú Digital',
      text: settings.shareText || 'Los mejores cubanos y suizos de la ciudad',
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location", error);
          let errorMessage = "No pudimos obtener tu ubicación.";
          
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "Permiso denegado. Por favor, activa los permisos de ubicación en tu navegador para usar el GPS.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = "La información de ubicación no está disponible en este momento.";
          } else if (error.code === error.TIMEOUT) {
            errorMessage = "Se agotó el tiempo de espera para obtener la ubicación.";
          }
          
          alert(`${errorMessage}\n\nSi no puedes activar el GPS, asegúrate de escribir tu dirección detallada y puntos de referencia.`);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("Tu navegador no soporta geolocalización. Por favor, ingresa tu dirección manualmente.");
      setIsLocating(false);
    }
  };

  const checkLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loyaltyPhoneInput) return;
    setIsCheckingLoyalty(true);
    try {
      const docRef = doc(db, 'customers', loyaltyPhoneInput);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setLoyaltyCustomer(docSnap.data() as Customer);
        setIsNewCustomer(false);
      } else {
        setIsNewCustomer(true);
        setLoyaltyCustomer(null);
      }
    } catch (error) {
      console.error("Error checking loyalty", error);
    } finally {
      setIsCheckingLoyalty(false);
    }
  };

  const registerLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loyaltyPhoneInput || !loyaltyNameInput) return;
    setIsCheckingLoyalty(true);
    try {
      const docRef = doc(db, 'customers', loyaltyPhoneInput);
      const newCustomer: Customer = {
        phone: loyaltyPhoneInput,
        name: loyaltyNameInput,
        stamps: 0,
        createdAt: new Date().toISOString()
      };
      await setDoc(docRef, newCustomer);
      setLoyaltyCustomer(newCustomer);
      setIsNewCustomer(false);
    } catch (error) {
      console.error("Error registering loyalty", error);
    } finally {
      setIsCheckingLoyalty(false);
    }
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Tu carrito está vacío");
    if (!customerName || !customerPhone) return alert("Por favor llena tu nombre y teléfono");
    if (deliveryType === 'domicilio' && !customerAddress) return alert("Por favor ingresa tu dirección");
    // GPS is now optional but recommended
    if (deliveryType === 'domicilio' && !location) {
      const confirmNoGPS = window.confirm("📍 No has compartido tu ubicación GPS. ¿Deseas continuar solo con la dirección escrita? (El GPS ayuda al repartidor a llegar más rápido)");
      if (!confirmNoGPS) return;
    }
    if (paymentMethod === 'efectivo' && !cashAmount) return alert("Por favor indica con cuánto vas a pagar");

    setIsSubmitting(true);
    try {
      // If they opted in, ensure they have a customer record
      if (loyaltyOptIn) {
        const docRef = doc(db, 'customers', customerPhone);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          await setDoc(docRef, {
            phone: customerPhone,
            name: customerName,
            stamps: 0,
            createdAt: new Date().toISOString()
          });
        }
      }

      const orderData = {
        customerName,
        customerPhone,
        customerAddress: deliveryType === 'domicilio' ? customerAddress : '',
        deliveryType,
        paymentMethod,
        cashAmount: paymentMethod === 'efectivo' ? parseFloat(cashAmount) : 0,
        loyaltyOptIn,
        pointsGranted: false,
        location: deliveryType === 'domicilio' ? location : null,
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: cartTotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
        notes: orderNotes
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      // Format WhatsApp Message
      let message = `${settings.whatsappMessageHeader || '🥪 *NUEVO PEDIDO - BOCADO EXPRESS*'}\n\n`;
      message += `👤 *Cliente:* ${customerName}\n`;
      message += `📱 *Teléfono:* ${customerPhone}\n`;
      message += `🚚 *Tipo de Entrega:* ${deliveryType.toUpperCase()}\n`;
      
      if (deliveryType === 'domicilio') {
        message += `📍 *Dirección:* ${customerAddress}\n`;
        if (location) {
          message += `🗺️ *Ubicación GPS:* https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}\n`;
        }
      }
      
      message += `\n💳 *Método de Pago:* ${paymentMethod.toUpperCase()}\n`;
      if (paymentMethod === 'efectivo') {
        message += `💵 *Paga con:* ${formatPrice(parseFloat(cashAmount))}\n`;
        message += `💰 *Cambio:* ${formatPrice(parseFloat(cashAmount) - cartTotal)}\n`;
      }
      
      if (orderNotes) {
        message += `\n📝 *Notas del pedido:* ${orderNotes}\n`;
      }

      message += `\n🛒 *Detalle del pedido:*\n`;
      cart.forEach(item => {
        message += `- ${item.quantity}x ${item.name} (${formatPrice(item.price * item.quantity)})\n`;
      });
      message += `\n✨ *Total a pagar:* ${formatPrice(cartTotal)}\n`;
      if (deliveryType === 'domicilio') {
        message += `*(El costo del domicilio se confirmará por este medio)*\n`;
      }

      if (loyaltyOptIn) {
        message += `\n🎁 *Cliente Club Bocado* (Pendiente de sello)\n`;
      }

      message += `\n${settings.whatsappMessageFooter || 'Vengo de Menú Digital Bocado Express'}`;

      const whatsappUrl = `https://wa.me/573144052399?text=${encodeURIComponent(message)}`;
      
      // Use window.location.href for better compatibility with iOS Safari
      // Safari often blocks window.open in async contexts
      window.location.href = whatsappUrl;

      // Persist success state
      localStorage.setItem('orderSuccess', 'true');
      localStorage.setItem('lastCustomerName', customerName);
      localStorage.setItem('lastLoyaltyOptIn', String(loyaltyOptIn));

      setOrderSuccess(true);
      setCart([]);
      setIsCartOpen(false);
      
    } catch (error) {
      console.error("Error submitting order", error);
      alert("Hubo un error al procesar tu pedido. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 140; // Adjust for sticky headers
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return alert("Por favor escribe una reseña");
    
    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        customerName: customerName || 'Cliente Bocado',
        text: reviewText,
        rating: reviewRating,
        isVisible: false, // Admin must approve
        createdAt: new Date().toISOString()
      });
      alert("¡Gracias por tu reseña! La hemos recibido.");
      setReviewText('');
      setReviewRating(5);
      
      // Clear persisted state
      localStorage.removeItem('orderSuccess');
      localStorage.removeItem('lastCustomerName');
      localStorage.removeItem('lastLoyaltyOptIn');
      
      setOrderSuccess(false); // Close success screen
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCashAmount('');
      setLocation(null);
    } catch (error) {
      console.error("Error submitting review", error);
      alert("Hubo un error al enviar tu reseña.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const popularProducts = products.filter(p => p.isPopular && p.isAvailable);
  const dailyOffers = products.filter(p => p.isDailyOffer && p.isAvailable);
  const upsellProducts = products.filter(p => p.isUpsell && p.isAvailable);

  if (orderSuccess) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-500">
        <div className="bg-[#1A1A1A] text-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
          {/* Close Button */}
          <button 
            onClick={() => {
              setOrderSuccess(false);
              localStorage.removeItem('orderSuccess');
            }}
            className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <X size={16} />
          </button>

          <div className="p-6 pt-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 animate-bounce shadow-lg shadow-green-500/20">
              <CheckCircle2 size={32} className="text-white" />
            </div>
            
            <h1 className="text-2xl font-display font-bold mb-1 uppercase tracking-tight">¡Pedido Enviado!</h1>
            <p className="text-stone-400 text-xs mb-6 leading-relaxed">
              Tu pedido ha sido enviado a WhatsApp. <br/>
              <span className="text-[#FDE047] font-bold">¡No olvides confirmar el mensaje en el chat!</span>
            </p>

            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl w-full mb-6 backdrop-blur-sm">
              <h2 className="text-base font-bold mb-3 text-[#FDE047] uppercase tracking-wider">¿Qué tal estuvo tu experiencia?</h2>
              <div className="flex justify-center gap-1.5 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={cn(
                      "p-1 transition-all active:scale-125",
                      reviewRating >= star ? "text-[#FDE047] scale-110" : "text-stone-600 hover:text-stone-500"
                    )}
                  >
                    <Star size={28} fill={reviewRating >= star ? "currentColor" : "none"} strokeWidth={1.5} />
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Cuéntanos qué te pareció (opcional)"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs focus:outline-none focus:border-[#FDE047] mb-3 min-h-[80px] text-white placeholder:text-stone-600"
              />
              <button
                onClick={submitReview}
                disabled={reviewRating === 0}
                className="w-full bg-[#FDE047] text-[#1A1A1A] font-black uppercase tracking-widest p-3 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:grayscale text-sm"
              >
                Enviar Reseña
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 bg-white/5 text-stone-300 font-bold py-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-xs"
              >
                <Share2 size={16} /> Compartir
              </button>
              <button
                onClick={() => {
                  setOrderSuccess(false);
                  localStorage.removeItem('orderSuccess');
                }}
                className="bg-stone-800 text-white font-bold py-3 rounded-xl hover:bg-stone-700 transition-colors text-xs"
              >
                Omitir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans pb-32">
      {/* Header */}
      <header className="bg-[#1A1A1A] text-white p-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-3xl font-display font-bold tracking-wider text-[#FDE047] leading-none">
              BOCADO
            </h1>
            <span className="text-xs font-bold tracking-widest text-white uppercase mt-1">
              Express
            </span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsReviewsModalOpen(true)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-[#FDE047] flex items-center gap-1"
              title="Ver Reseñas"
            >
              <Star size={20} className="fill-[#FDE047]" />
              <span className="text-xs font-bold hidden sm:inline">Reseñas</span>
            </button>
            <button 
              onClick={() => setIsLoyaltyModalOpen(true)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-[#FDE047] flex items-center gap-1"
              title="Club Bocado"
            >
              <Gift size={20} />
              <span className="text-xs font-bold hidden sm:inline">Club Bocado</span>
            </button>
            <button 
              onClick={handleShare}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-[#FDE047] flex items-center gap-1"
              title="Compartir"
            >
              <Share2 size={20} />
              <span className="text-xs font-bold hidden sm:inline">Compartir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Category Pills (Sticky) */}
      <div className="bg-white sticky top-[72px] z-30 shadow-sm border-b border-stone-200 overflow-x-auto hide-scrollbar">
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-3">
          <button 
            onClick={() => setActiveCategory('todos')}
            className={cn(
              "whitespace-nowrap px-5 py-2 rounded-full font-bold text-sm transition-all",
              activeCategory === 'todos' ? "bg-[#1A1A1A] text-[#FDE047] shadow-md" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            )}
          >
            Todos
          </button>
          {dailyOffers.length > 0 && (
            <button 
              onClick={() => setActiveCategory('offers')}
              className={cn(
                "whitespace-nowrap px-5 py-2 rounded-full font-bold text-sm transition-all",
                activeCategory === 'offers' ? "bg-[#E3242B] text-white shadow-md" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              🏷️ Promociones
            </button>
          )}
          {popularProducts.length > 0 && (
            <button 
              onClick={() => setActiveCategory('popular')}
              className={cn(
                "whitespace-nowrap px-5 py-2 rounded-full font-bold text-sm transition-all",
                activeCategory === 'popular' ? "bg-[#E3242B] text-white shadow-md" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              🔥 Más Vendidos
            </button>
          )}
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "whitespace-nowrap px-5 py-2 rounded-full font-bold text-sm transition-all",
                activeCategory === cat.id ? "bg-[#1A1A1A] text-[#FDE047] shadow-md" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Store Closed Banner */}
      {!settings.isStoreOpen && (
        <div className="bg-stone-800 text-white text-center py-3 px-4 sticky top-[125px] z-20 text-sm font-medium flex items-center justify-center gap-2">
          <span>😴</span> En este momento estamos cerrados, pero échale un ojo a nuestro menú para ir antojándote.
        </div>
      )}

      {/* Events Banner */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <a 
          href="https://wa.me/573144052399?text=Hola%20Bocado%20Express,%20me%20gustar%C3%ADa%20cotizar%20un%20pedido%20especial%20para%20un%20evento."
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-r from-[#FDE047] to-[#facc15] p-4 rounded-2xl shadow-sm border border-yellow-400 flex items-center justify-between hover:shadow-md transition-shadow"
        >
          <div>
            <h3 className="font-bold text-[#1A1A1A] text-lg">🎉 ¿Tienes un evento?</h3>
            <p className="text-stone-800 text-sm">Cotiza pedidos por volumen aquí</p>
          </div>
          <div className="bg-[#1A1A1A] text-white p-2 rounded-full">
            <Send size={20} />
          </div>
        </a>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 pt-6">
        {categories.length === 0 && products.length === 0 ? (
          <div className="text-center py-20 text-stone-500">
            <p>Cargando el menú...</p>
          </div>
        ) : (
          <>
            {/* Daily Offers Section */}
            {(activeCategory === 'todos' || activeCategory === 'offers') && dailyOffers.length > 0 && (
              <section id="category-offers" className="mb-10">
                <h2 className="text-2xl font-display font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                  <span className="text-[#E3242B]">🏷️</span> Promociones del Día
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dailyOffers.map(product => (
                    <ProductCard key={product.id} product={product} addToCart={addToCart} isStoreOpen={settings.isStoreOpen} />
                  ))}
                </div>
              </section>
            )}

            {/* Popular Products Section */}
            {(activeCategory === 'todos' || activeCategory === 'popular') && popularProducts.length > 0 && (
              <section id="category-popular" className="mb-10">
                <h2 className="text-2xl font-display font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                  <span className="text-[#E3242B]">🔥</span> Los Más Vendidos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {popularProducts.map(product => (
                    <ProductCard key={product.id} product={product} addToCart={addToCart} isStoreOpen={settings.isStoreOpen} />
                  ))}
                </div>
              </section>
            )}

            {/* Category Sections */}
            {categories.map(category => {
              if (activeCategory !== 'todos' && activeCategory !== category.id) return null;
              
              const categoryProducts = products.filter(p => p.categoryId === category.id && p.isAvailable && !p.isPopular && !p.isDailyOffer);
              if (categoryProducts.length === 0) return null;

              return (
                <section key={category.id} id={`category-${category.id}`} className="mb-10">
                  <h2 className="text-2xl font-display font-bold text-[#1A1A1A] mb-4">
                    {category.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryProducts.map(product => (
                      <ProductCard key={product.id} product={product} addToCart={addToCart} isStoreOpen={settings.isStoreOpen} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </main>

      {/* Footer / Social Media */}
      <footer className="bg-[#1A1A1A] text-white py-12 mt-8 rounded-t-3xl">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="font-display font-bold text-2xl text-[#FDE047] uppercase tracking-widest mb-2">Bocado Express</h3>
          <p className="text-stone-400 text-sm font-medium mb-6 uppercase tracking-wider">Síguenos y Comparte</p>
          
          <div className="flex justify-center gap-6 mb-8">
            <a href="https://instagram.com/BOCADOEXPRESS.MTR" target="_blank" rel="noopener noreferrer" className="bg-white/10 p-4 rounded-full hover:bg-[#E3242B] hover:text-white transition-colors text-[#FDE047]">
              <Instagram size={24} />
            </a>
            <a href="https://facebook.com/BOCADOEXPRESS.MTR" target="_blank" rel="noopener noreferrer" className="bg-white/10 p-4 rounded-full hover:bg-[#E3242B] hover:text-white transition-colors text-[#FDE047]">
              <Facebook size={24} />
            </a>
            <a href="https://tiktok.com/@BOCADOEXPRESS.MTR" target="_blank" rel="noopener noreferrer" className="bg-white/10 p-4 rounded-full hover:bg-[#E3242B] hover:text-white transition-colors text-[#FDE047]">
              <Music2 size={24} />
            </a>
          </div>
          
          <p className="text-stone-500 text-xs font-medium">@BOCADOEXPRESS.MTR</p>
        </div>
      </footer>

      {/* Floating Cart Button */}
      {cart.length > 0 && settings.isStoreOpen && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 animate-in slide-in-from-bottom-10">
          <div className="max-w-md mx-auto">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-[#E3242B] text-white p-4 rounded-2xl shadow-[0_8px_30px_rgba(227,36,43,0.4)] flex justify-between items-center font-bold text-lg active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                  {cartItemCount}
                </div>
                <span>Ver mi pedido</span>
              </div>
              <span>{formatPrice(cartTotal)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-center sm:justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#F8F9FA] h-full sm:h-auto sm:min-h-screen shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right">
            <div className="p-4 bg-white border-b border-stone-200 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-[#1A1A1A]">
                <ShoppingCart size={24} className="text-[#E3242B]" />
                Tu Pedido
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="bg-stone-100 text-stone-500 hover:bg-stone-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitOrder} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-3 items-center border-b border-stone-100 py-3 last:border-0 last:pb-0 first:pt-0">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-[#1A1A1A]">{item.name}</h4>
                        <span className="text-[#E3242B] font-bold text-sm">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                      <div className="flex items-center gap-3 bg-stone-100 rounded-full px-2 py-1">
                        <button type="button" onClick={() => updateQuantity(item.id, -1)} className="text-stone-500 hover:text-[#E3242B] p-1">
                          {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} strokeWidth={3} />}
                        </button>
                        <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, 1)} className="text-stone-500 hover:text-green-600 p-1">
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Notes & Cross-selling */}
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
                    <label className="block text-sm font-bold text-[#1A1A1A] mb-2">¿Falta algo o tienes alguna nota?</label>
                    <textarea 
                      placeholder="Ej: Sin cebolla, salsas aparte..." 
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                      className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-[#E3242B] bg-stone-50 min-h-[60px] text-sm mb-3"
                    />
                    
                    {upsellProducts.length > 0 && (
                      <div>
                        <button 
                          type="button"
                          onClick={() => setIsUpsellOpen(!isUpsellOpen)}
                          className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm border border-blue-100"
                        >
                          <span>¿Agregar bebidas o adiciones?</span>
                          <Plus size={16} className={cn("transition-transform", isUpsellOpen && "rotate-45")} />
                        </button>
                        
                        {isUpsellOpen && (
                          <div className="mt-3 flex overflow-x-auto gap-3 pb-2 hide-scrollbar">
                            {upsellProducts.map(product => (
                              <div key={product.id} className="bg-white rounded-xl p-2 shadow-sm border border-blue-100 min-w-[140px] shrink-0 flex flex-col justify-between">
                                <div>
                                  <h5 className="font-bold text-xs text-[#1A1A1A] line-clamp-1">{product.name}</h5>
                                  <span className="text-[#E3242B] font-bold text-xs">{formatPrice(product.price)}</span>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => addToCart(product)}
                                  className="mt-2 bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                                >
                                  <Plus size={12} strokeWidth={3} /> Agregar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Type */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
                  <h3 className="font-bold text-[#1A1A1A] mb-3 text-lg">¿Cómo quieres tu pedido?</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setDeliveryType('domicilio')} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all", deliveryType === 'domicilio' ? "border-[#E3242B] bg-red-50 text-[#E3242B]" : "border-stone-200 text-stone-500")}>
                      <Bike size={24} />
                      <span className="text-xs font-bold">Domicilio</span>
                    </button>
                    <button type="button" onClick={() => setDeliveryType('recoger')} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all", deliveryType === 'recoger' ? "border-[#E3242B] bg-red-50 text-[#E3242B]" : "border-stone-200 text-stone-500")}>
                      <Store size={24} />
                      <span className="text-xs font-bold">Recoger</span>
                    </button>
                    <button type="button" onClick={() => setDeliveryType('local')} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all", deliveryType === 'local' ? "border-[#E3242B] bg-red-50 text-[#E3242B]" : "border-stone-200 text-stone-500")}>
                      <UtensilsCrossed size={24} />
                      <span className="text-xs font-bold">En Local</span>
                    </button>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 space-y-3">
                  <input 
                    type="text" 
                    placeholder="Tu Nombre" 
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-[#E3242B] bg-stone-50"
                  />
                  <input 
                    type="tel" 
                    placeholder="Tu Teléfono (WhatsApp)" 
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-[#E3242B] bg-stone-50"
                  />
                  
                  {deliveryType === 'domicilio' && (
                    <>
                      <textarea 
                        placeholder="Dirección y referencias (Ej: Casa roja, rejas negras)" 
                        required
                        value={customerAddress}
                        onChange={e => setCustomerAddress(e.target.value)}
                        className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-[#E3242B] bg-stone-50 min-h-[80px]"
                      />
                      <button 
                        type="button"
                        onClick={getLocation}
                        className={cn(
                          "w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all text-sm font-bold shadow-sm relative overflow-hidden group",
                          location 
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                            : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-400 active:scale-[0.98] ring-2 ring-amber-100 ring-offset-2 animate-pulse"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                          location ? "bg-emerald-100" : "bg-amber-100 group-hover:scale-110"
                        )}>
                          <MapPin size={20} className={location ? "text-emerald-600" : "text-amber-600"} />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="uppercase tracking-tight">{isLocating ? "Obteniendo..." : location ? "Ubicación guardada ✓" : "Compartir ubicación GPS"}</span>
                          {!location && !isLocating && <span className="text-[10px] font-black uppercase opacity-70 tracking-widest">Toca aquí para habilitar</span>}
                        </div>
                      </button>
                      <p className="text-[10px] text-stone-400 text-center px-4">
                        * El GPS es opcional pero ayuda al repartidor. Funciona en cualquier celular (iPhone/Android) sin necesidad de apps instaladas.
                      </p>
                      <p className="text-xs text-stone-500 text-center italic">* El costo del domicilio se confirmará por WhatsApp</p>
                    </>
                  )}
                </div>

                {/* Payment Method */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
                  <h3 className="font-bold text-[#1A1A1A] mb-3 text-lg">¿Cómo vas a pagar?</h3>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button type="button" onClick={() => setPaymentMethod('nequi')} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all", paymentMethod === 'nequi' ? "border-[#1A1A1A] bg-stone-100 text-[#1A1A1A]" : "border-stone-200 text-stone-500")}>
                      <Wallet size={24} />
                      <span className="text-xs font-bold">Nequi / Transf.</span>
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('efectivo')} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all", paymentMethod === 'efectivo' ? "border-[#1A1A1A] bg-stone-100 text-[#1A1A1A]" : "border-stone-200 text-stone-500")}>
                      <Banknote size={24} />
                      <span className="text-xs font-bold">Efectivo</span>
                    </button>
                  </div>

                  {paymentMethod === 'nequi' && (
                    <div className="bg-[#FDE047]/20 p-3 rounded-xl text-center border border-[#FDE047]">
                      <p className="text-xs text-stone-600 mb-1">Transfiere a este número:</p>
                      <p className="font-bold text-lg tracking-widest text-[#1A1A1A]">3124726152</p>
                    </div>
                  )}

                  {paymentMethod === 'efectivo' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-600">¿Con cuánto vas a pagar?</label>
                      <input 
                        type="number" 
                        placeholder="Ej: 50000" 
                        required
                        value={cashAmount}
                        onChange={e => setCashAmount(e.target.value)}
                        className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-[#1A1A1A] bg-stone-50"
                      />
                      {cashAmount && parseFloat(cashAmount) >= cartTotal && (
                        <p className="text-sm text-green-600 font-medium">
                          Tu cambio será: {formatPrice(parseFloat(cashAmount) - cartTotal)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Loyalty Opt-In */}
                <div className="bg-stone-900 p-5 rounded-2xl text-white shadow-xl relative overflow-hidden border border-stone-800">
                  <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12"><Gift size={80} /></div>
                  <h3 className="font-black text-[#FDE047] mb-1 flex items-center gap-2 uppercase tracking-tight">
                    <Gift size={18} /> Club Bocado Express
                  </h3>
                  <p className="text-xs text-stone-400 mb-3 font-medium">Acumula pedidos y gana comida gratis.</p>
                  
                  {settings.loyaltyMinOrder > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
                      <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest leading-relaxed">
                        ⚠️ Nota: Para recibir un sello, el pedido debe ser mayor a <span className="text-[#FDE047]">{formatPrice(settings.loyaltyMinOrder)}</span>
                      </p>
                    </div>
                  )}
                  
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className={cn(
                      "mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                      loyaltyOptIn ? "bg-[#E3242B] border-[#E3242B]" : "border-stone-700 group-hover:border-stone-500"
                    )}>
                      {loyaltyOptIn && <CheckCircle2 size={16} className="text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      checked={loyaltyOptIn}
                      onChange={(e) => setLoyaltyOptIn(e.target.checked)}
                      className="hidden"
                    />
                    <span className="text-sm font-bold text-stone-200 leading-tight">Sí, quiero unirme gratis y recibir mi sello.</span>
                  </label>
                </div>
              </div>

              {/* Total & Submit Footer (Fixed at bottom of form) */}
              <div className="p-4 bg-white border-t border-stone-200 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-stone-500 font-medium">Subtotal</span>
                  <span className="text-2xl font-bold text-[#1A1A1A]">{formatPrice(cartTotal)}</span>
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#E3242B] text-white font-bold text-lg p-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70"
                >
                  {isSubmitting ? "Procesando..." : (
                    <>
                      <Send size={20} />
                      Enviar Pedido por WhatsApp
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loyalty Modal */}
      {isLoyaltyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-[#1A1A1A] p-6 text-center relative">
              <button onClick={() => setIsLoyaltyModalOpen(false)} className="absolute top-4 right-4 text-stone-400 hover:text-white">
                <X size={20} />
              </button>
              <Gift size={48} className="text-[#FDE047] mx-auto mb-3" />
              <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">Club Bocado</h2>
              <p className="text-stone-400 text-sm mt-1">Acumula pedidos y gana premios</p>
            </div>
            
            <div className="p-6">
              {!loyaltyCustomer ? (
                <div className="space-y-4">
                  {isNewCustomer ? (
                    <form onSubmit={registerLoyalty} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                      <p className="text-sm text-stone-600 text-center mb-4">
                        ¡Bienvenido! Completa tu registro para empezar a ganar sellos.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Tu Nombre y Apellido</label>
                          <input 
                            type="text" 
                            placeholder="Ej: Juan Pérez" 
                            required
                            value={loyaltyNameInput}
                            onChange={e => setLoyaltyNameInput(e.target.value)}
                            className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-[#1A1A1A] bg-stone-50 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">WhatsApp</label>
                          <input 
                            type="tel" 
                            readOnly
                            value={loyaltyPhoneInput}
                            className="w-full p-3 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 font-bold tracking-widest"
                          />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        disabled={isCheckingLoyalty}
                        className="w-full bg-[#E3242B] text-white font-bold p-4 rounded-xl transition-transform active:scale-95 shadow-lg shadow-red-200"
                      >
                        {isCheckingLoyalty ? "Registrando..." : "Unirme al Club"}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsNewCustomer(false)}
                        className="w-full text-sm text-stone-400 font-medium"
                      >
                        Volver
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={checkLoyalty} className="space-y-4">
                      <p className="text-sm text-stone-600 text-center mb-4">
                        Ingresa tu número de WhatsApp para ver tus sellos o unirte al club.
                      </p>
                      <input 
                        type="tel" 
                        placeholder="Tu número de WhatsApp" 
                        required
                        value={loyaltyPhoneInput}
                        onChange={e => setLoyaltyPhoneInput(e.target.value)}
                        className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-[#1A1A1A] bg-stone-50 text-center text-lg font-bold tracking-widest"
                      />
                      <button 
                        type="submit"
                        disabled={isCheckingLoyalty}
                        className="w-full bg-[#1A1A1A] text-[#FDE047] font-bold p-3 rounded-xl transition-transform active:scale-95"
                      >
                        {isCheckingLoyalty ? "Buscando..." : "Ver Mis Sellos"}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div>
                    <p className="text-sm text-stone-500 font-medium">Hola, <span className="text-[#1A1A1A] font-bold">{loyaltyCustomer.name}</span></p>
                    <h3 className="text-xl font-bold text-[#1A1A1A] mt-1">Llevas {loyaltyCustomer.stamps} de {settings.loyaltyGoal} sellos</h3>
                    {settings.loyaltyMinOrder > 0 && (
                      <p className="text-[10px] text-stone-400 mt-1 italic">
                        * Solo califican pedidos mayores a {formatPrice(settings.loyaltyMinOrder)}
                      </p>
                    )}
                  </div>
                  
                  {/* Stamp Cards Visual */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {Array.from({ length: settings.loyaltyGoal }).map((_, i) => (
                      <div key={i} className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center border-2 text-xl",
                        i < loyaltyCustomer.stamps 
                          ? "bg-[#E3242B] border-[#E3242B] text-white shadow-inner" 
                          : "bg-stone-100 border-stone-200 text-stone-300"
                      )}>
                        {i < loyaltyCustomer.stamps ? "🍔" : i + 1}
                      </div>
                    ))}
                  </div>

                  {loyaltyCustomer.stamps >= settings.loyaltyGoal ? (
                    <div className="bg-green-100 text-green-800 p-4 rounded-xl border border-green-200">
                      <p className="font-bold">¡Felicidades! 🎉</p>
                      <p className="text-sm">Has ganado: <strong>{settings.loyaltyPrize}</strong>. Reclámalo en tu próximo pedido.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-600">
                      Te faltan {settings.loyaltyGoal - loyaltyCustomer.stamps} pedidos para ganar: <br/>
                      <strong className="text-[#E3242B]">{settings.loyaltyPrize}</strong>
                    </p>
                  )}

                  {settings.referralEnabled && (
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                      <h4 className="font-bold text-sm mb-2">Gana sellos extra</h4>
                      <p className="text-xs text-stone-500 mb-3">Comparte este link. Si un amigo compra, ¡ganas 1 sello!</p>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={`${window.location.origin}/?ref=${loyaltyCustomer.phone}`}
                          className="flex-1 text-xs p-2 rounded bg-white border border-stone-200"
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/?ref=${loyaltyCustomer.phone}`);
                            alert("Link copiado!");
                          }}
                          className="bg-[#1A1A1A] text-white text-xs px-3 rounded font-bold"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setLoyaltyCustomer(null)}
                    className="text-sm text-stone-400 underline"
                  >
                    Salir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {isReviewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
            <div className="bg-[#1A1A1A] p-6 text-center relative shrink-0">
              <button onClick={() => setIsReviewsModalOpen(false)} className="absolute top-4 right-4 text-stone-400 hover:text-white">
                <X size={20} />
              </button>
              <Star size={48} className="text-[#FDE047] fill-[#FDE047] mx-auto mb-3" />
              <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">Reseñas</h2>
              <p className="text-stone-400 text-sm mt-1">Lo que dicen nuestros clientes</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-stone-50">
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200">
                      <div className="flex items-center gap-1 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} className={i < review.rating ? "text-[#FDE047] fill-[#FDE047]" : "text-stone-300"} />
                        ))}
                      </div>
                      <p className="text-stone-600 text-sm italic mb-3">"{review.text}"</p>
                      <p className="text-[#1A1A1A] font-bold text-xs">- {review.customerName}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-stone-500">
                  <p>Aún no hay reseñas publicadas.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for Product Card to keep code clean
function ProductCard({ product, addToCart, isStoreOpen }: { product: Product, addToCart: (p: Product) => void, isStoreOpen: boolean, key?: string | number }) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!isStoreOpen) return;
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-100 flex gap-4 transition-all hover:shadow-md relative overflow-hidden">
      {product.tags && product.tags.length > 0 && (
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {product.tags.map(tag => (
            <span key={tag} className="bg-[#E3242B] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="w-28 h-28 shrink-0 relative">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-2xl bg-stone-100" />
        ) : (
          <div className="w-full h-full bg-stone-100 rounded-2xl flex items-center justify-center text-stone-300">
            <UtensilsCrossed size={32} />
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <h3 className="font-bold text-lg leading-tight text-[#1A1A1A]">{product.name}</h3>
          <p className="text-stone-500 text-xs mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="font-bold text-[#1A1A1A]">
            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.price)}
          </span>
          <button 
            onClick={handleAdd}
            disabled={!isStoreOpen}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              !isStoreOpen ? "bg-stone-100 text-stone-400" :
              added ? "bg-green-500 text-white" : "bg-[#1A1A1A] text-white hover:bg-[#E3242B]"
            )}
          >
            {added ? <CheckCircle2 size={16} /> : <Plus size={16} strokeWidth={3} />}
          </button>
        </div>
      </div>
    </div>
  );
}
