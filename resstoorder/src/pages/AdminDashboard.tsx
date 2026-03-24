import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useRestaurant, OrderStatus, Client } from '../context/RestaurantContext';
import { MenuItem, Category } from '../types';
import { Package, Clock, CheckCircle2, Truck, Check, EyeOff, Eye, Search, ChefHat, Edit2, X, Save, Users, BarChart3, Download, Plus, Trash2, ListTree, ChevronRight, ChevronDown, Scan, QrCode, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    orders, updateOrderStatus, 
    menuItems, toggleItemAvailability, updateMenuItem, addMenuItem, deleteMenuItem,
    categories, addCategory, updateCategory, deleteCategory,
    clients, updateClientRole
  } = useRestaurant();
  
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'categories' | 'customers' | 'stats'>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use the actual role from the authenticated user
  const currentRole = user?.role === 'admin' ? 'Manager' : user?.role === 'cuisine' ? 'Cuisine' : user?.role === 'livreur' ? 'Livreur' : 'Manager';
  
  // Modals state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [itemForm, setItemForm] = useState<Partial<MenuItem>>({ 
    name: '', 
    price: 0, 
    description: '', 
    image: '', 
    categoryId: categories[0]?.id || '', 
    isAvailable: true, 
    allergens: [], 
    components: [],
    customizations: []
  });

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState<Partial<Category>>({ name: '' });

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scannedUserId, setScannedUserId] = useState('');
  const [scanAction, setScanAction] = useState<'add' | 'remove'>('add');
  const [scanPoints, setScanPoints] = useState(0);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // Computed Stats
  const revenueData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    });

    const dataMap = new Map(last7Days.map(date => [date, { date, revenue: 0, orders: 0 }]));

    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        const orderDate = new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        if (dataMap.has(orderDate)) {
          const current = dataMap.get(orderDate)!;
          current.revenue += order.total;
          current.orders += 1;
        }
      }
    });

    return Array.from(dataMap.values());
  }, [orders]);

  const popularItemsData = useMemo(() => {
    const itemCounts: Record<string, number> = {};
    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items.forEach(item => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        });
      }
    });

    return Object.entries(itemCounts)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [orders]);

  const currentMonthRevenue = useMemo(() => {
    const now = new Date();
    return orders
      .filter(o => o.status !== 'cancelled' && new Date(o.createdAt).getMonth() === now.getMonth() && new Date(o.createdAt).getFullYear() === now.getFullYear())
      .reduce((sum, o) => sum + o.total, 0);
  }, [orders]);

  const currentMonthOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(o => o.status !== 'cancelled' && new Date(o.createdAt).getMonth() === now.getMonth() && new Date(o.createdAt).getFullYear() === now.getFullYear()).length;
  }, [orders]);

  const averageOrderValue = currentMonthOrders > 0 ? currentMonthRevenue / currentMonthOrders : 0;

  const statusColors: Record<OrderStatus, string> = {
    'pending': 'bg-amber-100 text-amber-800 border-amber-200',
    'confirmed': 'bg-blue-100 text-blue-800 border-blue-200',
    'preparing': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'ready': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'delivered': 'bg-surface-hover text-content border-subtle',
    'cancelled': 'bg-red-100 text-red-800 border-red-200',
  };

  const statusIcons: Record<OrderStatus, any> = {
    'pending': Clock,
    'confirmed': CheckCircle2,
    'preparing': ChefHat,
    'ready': Package,
    'delivered': Check,
    'cancelled': X,
  };

  const nextStatus: Record<OrderStatus, OrderStatus | null> = {
    'pending': 'confirmed',
    'confirmed': 'preparing',
    'preparing': 'ready',
    'ready': 'delivered',
    'delivered': null,
    'cancelled': null,
  };

  const handleAdvanceStatus = (orderId: string, currentStatus: OrderStatus, type: 'pickup' | 'delivery' | 'dine_in') => {
    let next = nextStatus[currentStatus];
    if (next) {
      updateOrderStatus(orderId, next);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (currentRole === 'Cuisine') {
      return ['confirmed', 'preparing'].includes(order.status);
    }
    if (currentRole === 'Livreur') {
      return order.type === 'delivery' && ['ready'].includes(order.status);
    }
    return true; // Manager sees all
  });

  const filteredItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Export Functions
  const exportCustomers = () => {
    const ws = XLSX.utils.json_to_sheet(clients.map(c => ({
      'ID Client': c.id,
      'Nom': c.name,
      'Email': c.email,
      'Téléphone': c.phone,
      'Nombre de commandes': c.totalOrders,
      'Total dépensé (€)': c.totalSpent,
      'Dernière commande': c.lastOrder
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, "export_clients.xlsx");
  };

  const exportStats = () => {
    const wsRevenue = XLSX.utils.json_to_sheet(revenueData.map(r => ({
      'Date': r.date,
      'Chiffre d\'affaires (€)': r.revenue,
      'Nombre de commandes': r.orders
    })));
    const wsItems = XLSX.utils.json_to_sheet(popularItemsData.map(i => ({
      'Produit': i.name,
      'Ventes': i.sales
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsRevenue, "Revenus");
    XLSX.utils.book_append_sheet(wb, wsItems, "Produits Populaires");
    XLSX.writeFile(wb, "export_statistiques.xlsx");
  };

  const handleSeedMenu = async () => {
    const defaultCategoryId = categories[0]?.id || 'default';
    const newItems: MenuItem[] = [
      { 
        id: '', 
        name: 'Burger Végétarien', 
        description: 'Steak de soja, tomate, salade, sauce maison', 
        price: 11.50, 
        image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&q=80&w=800', 
        categoryId: defaultCategoryId, 
        isAvailable: true, 
        allergens: ['Soja', 'Gluten'],
        components: ['Steak de soja', 'Tomate', 'Salade', 'Sauce maison'],
        customizations: [
          {
            id: 'opt-cheese',
            title: 'Supplément Fromage',
            type: 'multiple',
            required: false,
            choices: [
              { id: 'c-cheddar', label: 'Cheddar', priceExtra: 1.00 },
              { id: 'c-goat', label: 'Chèvre', priceExtra: 1.50 }
            ]
          }
        ]
      },
      { 
        id: '', 
        name: 'Salade César', 
        description: 'Poulet grillé, salade romaine, croûtons, parmesan', 
        price: 10.90, 
        image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&q=80&w=800', 
        categoryId: defaultCategoryId, 
        isAvailable: true, 
        allergens: ['Lait', 'Gluten'],
        components: ['Poulet grillé', 'Salade romaine', 'Croûtons', 'Parmesan'],
        customizations: [
          {
            id: 'opt-sauce',
            title: 'Sauce supplémentaire',
            type: 'single',
            required: false,
            choices: [
              { id: 'c-caesar', label: 'Sauce César', priceExtra: 0.50 },
              { id: 'c-vinaigrette', label: 'Vinaigrette', priceExtra: 0.50 }
            ]
          }
        ]
      },
      { 
        id: '', 
        name: 'Burger Montagnard', 
        description: 'Steak haché, fromage à raclette, bacon, oignons caramélisés', 
        price: 14.50, 
        image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&q=80&w=800', 
        categoryId: defaultCategoryId, 
        isAvailable: true, 
        allergens: ['Lait', 'Gluten'],
        components: ['Steak haché', 'Fromage à raclette', 'Bacon', 'Oignons caramélisés'],
        customizations: [
          {
            id: 'opt-meat',
            title: 'Cuisson du steak',
            type: 'single',
            required: true,
            choices: [
              { id: 'c-bleu', label: 'Bleu' },
              { id: 'c-saignant', label: 'Saignant' },
              { id: 'c-apoint', label: 'À point' },
              { id: 'c-biencuit', label: 'Bien cuit' }
            ]
          }
        ]
      },
      { id: '', name: 'Wrap Poulet Bacon', description: 'Poulet croustillant, bacon, salade, sauce ranch', price: 9.50, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800', categoryId: defaultCategoryId, isAvailable: true, allergens: ['Gluten'], components: ['Poulet croustillant', 'Bacon', 'Salade', 'Sauce ranch'] },
      { id: '', name: 'Smoothie Fraise Banane', description: 'Fraise, banane, lait d\'amande', price: 5.50, image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=800', categoryId: defaultCategoryId, isAvailable: true, allergens: ['Amande'] },
      { id: '', name: 'Tiramisu Maison', description: 'Café, mascarpone, cacao', price: 6.00, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=800', categoryId: defaultCategoryId, isAvailable: true, allergens: ['Lait', 'Gluten', 'Oeuf'] },
      { id: '', name: 'Onion Rings', description: 'Rondelles d\'oignons frits croustillantes', price: 4.50, image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&q=80&w=800', categoryId: defaultCategoryId, isAvailable: true, allergens: ['Gluten'] },
      { id: '', name: 'Milkshake Vanille', description: 'Glace vanille, lait, crème chantilly', price: 5.00, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=800', categoryId: defaultCategoryId, isAvailable: true, allergens: ['Lait'] },
      { id: '', name: 'Nuggets x9', description: '9 morceaux de poulet pané croustillant', price: 7.50, image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&q=80&w=800', categoryId: defaultCategoryId, isAvailable: true, allergens: ['Gluten'] },
      { id: '', name: 'Salade Chèvre Chaud', description: 'Toasts de chèvre chaud, miel, noix, salade verte', price: 11.90, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800', categoryId: defaultCategoryId, isAvailable: true, allergens: ['Lait', 'Gluten', 'Noix'] }
    ];
    
    for (const item of newItems) {
      addMenuItem(item);
    }
  };

  const handleScanSubmit = async () => {
    if (!scannedUserId || scanPoints <= 0) {
      toast.error("Veuillez entrer un ID valide et un nombre de points supérieur à 0.");
      return;
    }

    try {
      const pointsChange = scanAction === 'add' ? scanPoints : -scanPoints;
      const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
      const actionText = scanAction === 'add' ? 'Ajout manuel en caisse' : 'Récompense utilisée en caisse';

      try {
        await updateDoc(doc(db, 'users', scannedUserId), {
          points: increment(pointsChange),
          loyaltyHistory: arrayUnion({
            id: Date.now(),
            date: today,
            action: actionText,
            points: pointsChange > 0 ? `+${pointsChange}` : `${pointsChange}`
          })
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${scannedUserId}`);
      }

      toast.success(`Opération réussie pour le client ${scannedUserId}`);
      setIsScanModalOpen(false);
      setScannedUserId('');
      setScanPoints(0);
    } catch (error) {
      console.error("Erreur lors de la mise à jour des points:", error);
      toast.error("Erreur. Vérifiez que l'ID client est correct.");
    }
  };

  return (
    <div className="min-h-screen bg-surface pb-20">
      <div className="bg-inverted text-content-inverted pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Espace Restaurateur</h1>
              <p className="text-content-muted">Gérez vos commandes, clients et statistiques.</p>
            </div>
            <div className="bg-inverted p-2 rounded-xl flex items-center gap-2 border border-default">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-content-inverted" />
              </div>
              <div className="pr-2 relative">
                <p className="text-xs text-content-muted">Connecté en tant que</p>
                <div className="flex items-center gap-1">
                  <span className="text-content-inverted font-bold pr-4">
                    {currentRole}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="flex flex-wrap gap-2 bg-surface p-1 rounded-xl shadow-sm border border-subtle mb-8 inline-flex">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 sm:px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'orders' ? 'bg-inverted text-content-inverted shadow-md' : 'text-content-muted hover:bg-surface-hover'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Commandes en cours</span>
            <span className="sm:hidden">Commandes</span>
            <span className="bg-primary text-content-inverted text-xs px-2 py-0.5 rounded-full ml-1">
              {filteredOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length}
            </span>
          </button>
          
          {currentRole === 'Manager' && (
            <>
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-4 sm:px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'menu' ? 'bg-inverted text-content-inverted shadow-md' : 'text-content-muted hover:bg-surface-hover'
                }`}
              >
                <ChefHat className="w-4 h-4" />
                <span className="hidden sm:inline">Gestion de la carte</span>
                <span className="sm:hidden">Carte</span>
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-4 sm:px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'categories' ? 'bg-inverted text-content-inverted shadow-md' : 'text-content-muted hover:bg-surface-hover'
                }`}
              >
                <ListTree className="w-4 h-4" />
                <span className="hidden sm:inline">Catégories</span>
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-4 sm:px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'customers' ? 'bg-inverted text-content-inverted shadow-md' : 'text-content-muted hover:bg-surface-hover'
                }`}
              >
                <Users className="w-4 h-4" />
                Clients
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 sm:px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'stats' ? 'bg-inverted text-content-inverted shadow-md' : 'text-content-muted hover:bg-surface-hover'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Statistiques
              </button>
              <button
                onClick={() => navigate('/presentation')}
                className="px-4 sm:px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 text-primary hover:bg-primary/10 border border-primary/20 ml-auto"
              >
                <Layout className="w-4 h-4" />
                <span className="hidden sm:inline">Mode Présentation</span>
                <span className="sm:hidden">Présentation</span>
              </button>
            </>
          )}
        </div>

        {/* TAB: ORDERS */}
        {activeTab === 'orders' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map(order => {
              const StatusIcon = statusIcons[order.status];
              return (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface rounded-2xl p-6 shadow-sm border border-subtle flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-content">{order.id}</h3>
                      <p className="text-sm text-content-muted">{order.customerName} • {order.time}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusColors[order.status]}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4 text-sm font-medium text-content-muted bg-surface p-2 rounded-lg">
                    {order.type === 'delivery' ? <Truck className="w-4 h-4 text-primary" /> : <Package className="w-4 h-4 text-emerald-500" />}
                    {order.type === 'delivery' ? 'À livrer' : order.type === 'pickup' ? 'À emporter' : 'Sur place'}
                  </div>

                  <div className="flex-grow">
                    <ul className="space-y-2 mb-4">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-content"><span className="font-bold text-content">{item.quantity}x</span> {item.name}</span>
                          </div>
                          {item.removedComponents && item.removedComponents.length > 0 && (
                            <div className="text-[10px] font-bold text-destructive uppercase tracking-wider pl-4">
                              SANS : {item.removedComponents.join(', ')}
                            </div>
                          )}
                          {item.customizations && item.customizations.map((opt, optIdx) => (
                            <div key={optIdx} className="text-[10px] text-content-muted pl-4 italic">
                              + {opt.optionTitle}: {opt.choices.map(c => c.label).join(', ')}
                            </div>
                          ))}
                          {item.notes && (
                            <div className="text-[10px] font-bold text-primary uppercase tracking-wider pl-4">
                              NOTE : {item.notes}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-4 border-t border-subtle flex items-center justify-between">
                    <span className="font-bold text-lg">{order.total.toFixed(2)}€</span>
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <button 
                        onClick={() => handleAdvanceStatus(order.id, order.status, order.type)}
                        className="px-4 py-2 bg-inverted text-content-inverted text-sm font-medium rounded-lg hover:opacity-90 transition-colors"
                      >
                        Passer à l'étape suivante
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
            
            {filteredOrders.length === 0 && (
              <div className="col-span-full text-center py-12 bg-surface rounded-2xl border border-subtle border-dashed">
                <Package className="w-12 h-12 text-content-muted mx-auto mb-3" />
                <p className="text-content-muted">Aucune commande pour le moment.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: MENU */}
        {activeTab === 'menu' && (
          <div className="bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden">
            <div className="p-4 border-b border-subtle bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-bold text-lg text-content">Gestion des plats</h2>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input 
                    type="text" 
                    placeholder="Rechercher un plat..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <button 
                  onClick={() => {
                    setItemForm({ name: '', price: 0, description: '', image: '', categoryId: categories[0]?.id || '', isAvailable: true, allergens: [], components: [], customizations: [] });
                    setIsCreatingItem(true);
                  }}
                  className="px-4 py-2 bg-primary text-content-inverted text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nouveau plat</span>
                </button>
                <button 
                  onClick={handleSeedMenu}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Ajouter 10 plats</span>
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-subtle max-h-[600px] overflow-y-auto">
              {filteredItems.map(item => {
                const category = categories.find(c => c.id === item.categoryId)?.name;
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-surface transition-colors">
                    <div className="flex items-center gap-4">
                      <img src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200'} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-surface-hover" />
                      <div>
                        <h3 className="font-bold text-content">{item.name}</h3>
                        <p className="text-xs text-content-muted">
                          {category} • {item.price.toFixed(2)}€
                          {item.stock !== undefined && (
                            <span className={`ml-2 font-medium ${item.stock <= 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                              • Stock: {item.stock}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setItemForm({ ...item });
                        }}
                        className="p-2 rounded-lg text-content-muted hover:bg-border-default hover:text-content transition-colors"
                        title="Modifier le plat"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className="p-2 rounded-lg text-content-muted hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Supprimer le plat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleItemAvailability(item.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                          item.isAvailable 
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        }`}
                      >
                        {item.isAvailable ? (
                          <>
                            <Eye className="w-4 h-4" /> Disponible
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4" /> Épuisé
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="p-8 text-center text-content-muted">Aucun plat trouvé.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden">
            <div className="p-4 border-b border-subtle bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-bold text-lg text-content">Gestion des catégories</h2>
              <button 
                onClick={() => {
                  setCategoryForm({ name: '' });
                  setIsCreatingCategory(true);
                }}
                className="px-4 py-2 bg-primary text-content-inverted text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouvelle catégorie
              </button>
            </div>
            
            <div className="divide-y divide-subtle max-h-[600px] overflow-y-auto">
              {categories.map(category => {
                const categoryItems = menuItems.filter(item => item.categoryId === category.id);
                const itemsCount = categoryItems.length;
                const isExpanded = expandedCategoryId === category.id;

                return (
                  <div key={category.id} className="flex flex-col">
                    <div 
                      className={`p-4 flex items-center justify-between hover:bg-surface transition-colors cursor-pointer ${isExpanded ? 'bg-surface-hover border-l-4 border-primary' : ''}`}
                      onClick={() => setExpandedCategoryId(isExpanded ? null : category.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg transition-transform ${isExpanded ? 'rotate-90 bg-primary/10 text-primary' : 'text-content-muted'}`}>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-content">{category.name}</h3>
                          <p className="text-xs text-content-muted">{itemsCount} plat(s) associé(s)</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingCategory(category);
                            setCategoryForm({ name: category.name });
                          }}
                          className="p-2 rounded-lg text-content-muted hover:bg-border-default hover:text-content transition-colors"
                          title="Modifier la catégorie"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (itemsCount > 0) {
                              toast.error("Impossible de supprimer une catégorie contenant des plats.");
                              return;
                            }
                            deleteCategory(category.id);
                          }}
                          className={`p-2 rounded-lg transition-colors ${itemsCount > 0 ? 'text-content-muted cursor-not-allowed' : 'text-content-muted hover:bg-red-100 hover:text-red-600'}`}
                          title={itemsCount > 0 ? "Catégorie non vide" : "Supprimer la catégorie"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-surface/50"
                        >
                          <div className="p-4 pl-12 space-y-3 border-t border-subtle">
                            {categoryItems.length > 0 ? (
                              categoryItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-subtle shadow-sm group hover:border-primary/30 transition-all">
                                  <div className="flex items-center gap-4">
                                    <img 
                                      src={item.image} 
                                      alt={item.name} 
                                      className="w-12 h-12 rounded-lg object-cover border border-subtle"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div>
                                      <h4 className="font-bold text-sm text-content">{item.name}</h4>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-primary">{item.price.toFixed(2)}€</span>
                                        <span className="text-[10px] text-content-muted">• {item.components?.length || 0} ingrédients</span>
                                        {!item.isAvailable && (
                                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Épuisé</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => {
                                        setEditingItem(item);
                                        setItemForm({ ...item });
                                      }}
                                      className="p-2 rounded-lg text-content-muted hover:bg-border-default hover:text-content transition-colors"
                                      title="Modifier le plat"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => toggleItemAvailability(item.id)}
                                      className={`p-2 rounded-lg transition-colors ${item.isAvailable ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-600 hover:bg-red-50'}`}
                                      title={item.isAvailable ? "Marquer comme épuisé" : "Marquer comme disponible"}
                                    >
                                      {item.isAvailable ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                    <button
                                      onClick={() => deleteMenuItem(item.id)}
                                      className="p-2 rounded-lg text-content-muted hover:bg-red-100 hover:text-red-600 transition-colors"
                                      title="Supprimer le plat"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-sm text-content-muted italic">
                                Aucun plat dans cette catégorie.
                              </div>
                            )}
                            
                            <button 
                              onClick={() => {
                                setItemForm({ 
                                  name: '', 
                                  price: 0, 
                                  description: '', 
                                  image: '', 
                                  categoryId: category.id, 
                                  isAvailable: true, 
                                  allergens: [], 
                                  components: [],
                                  customizations: []
                                });
                                setIsCreatingItem(true);
                              }}
                              className="w-full py-2 border-2 border-dashed border-subtle rounded-xl text-xs font-medium text-content-muted hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Ajouter un plat à {category.name}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden">
            <div className="p-4 border-b border-subtle bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="font-bold text-lg text-content">Base Clients</h2>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input 
                    type="text" 
                    placeholder="Rechercher un client..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <button 
                  onClick={() => setIsScanModalOpen(true)}
                  className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
                >
                  <Scan className="w-4 h-4" />
                  <span className="hidden sm:inline">Scanner QR</span>
                </button>
                <button 
                  onClick={exportCustomers}
                  className="px-4 py-2 bg-emerald-500 text-content-inverted text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exporter Excel</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface border-b border-subtle text-sm text-content-muted">
                    <th className="p-4 font-medium">Client</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Rôle</th>
                    <th className="p-4 font-medium text-center">Commandes</th>
                    <th className="p-4 font-medium text-right">Total Dépensé</th>
                    <th className="p-4 font-medium text-center">Points Fidélité</th>
                    <th className="p-4 font-medium text-right">Dernière Commande</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle text-sm">
                  {filteredCustomers.map(customer => (
                    <tr 
                      key={customer.id} 
                      className="hover:bg-surface transition-colors cursor-pointer"
                      onClick={() => setSelectedClient(customer)}
                    >
                      <td className="p-4 font-medium text-content flex items-center gap-2">
                        {customer.name}
                        <ChevronRight className="w-4 h-4 text-content-muted" />
                      </td>
                      <td className="p-4 text-content-muted">{customer.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full font-medium text-xs ${
                          customer.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          customer.role === 'cuisine' ? 'bg-orange-100 text-orange-800' :
                          customer.role === 'livreur' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.role === 'admin' ? 'Manager' : 
                           customer.role === 'cuisine' ? 'Cuisine' : 
                           customer.role === 'livreur' ? 'Livreur' : 'Client'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center bg-surface-hover text-content px-2.5 py-0.5 rounded-full font-medium">
                          {customer.totalOrders}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium text-content">{customer.totalSpent.toFixed(2)}€</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center bg-primary-100 text-primary-hover px-2.5 py-0.5 rounded-full font-bold">
                          {Math.floor(customer.totalSpent * 0.1)} pts
                        </span>
                      </td>
                      <td className="p-4 text-right text-content-muted">{customer.lastOrder}</td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-content-muted">
                        Aucun client trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-surface p-4 rounded-2xl shadow-sm border border-subtle">
              <h2 className="font-bold text-lg text-content">Aperçu des performances</h2>
              <button 
                onClick={exportStats}
                className="px-4 py-2 bg-emerald-500 text-content-inverted text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exporter les données (Excel)
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <div className="bg-surface p-6 rounded-2xl shadow-sm border border-subtle">
                <h3 className="font-bold text-content mb-6">Chiffre d'affaires (7 derniers jours)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(value) => `${value}€`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`${value}€`, 'Revenus']}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="revenue" name="Revenus" stroke="#f97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Popular Items Chart */}
              <div className="bg-surface p-6 rounded-2xl shadow-sm border border-subtle">
                <h3 className="font-bold text-content mb-6">Produits les plus vendus</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={popularItemsData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} dx={-10} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`${value} ventes`, 'Quantité']}
                      />
                      <Bar dataKey="sales" name="Ventes" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-surface p-6 rounded-2xl shadow-sm border border-subtle">
                <p className="text-sm font-medium text-content-muted mb-1">Revenus du mois</p>
                <p className="text-3xl font-bold text-content">{currentMonthRevenue.toFixed(2)}€</p>
              </div>
              <div className="bg-surface p-6 rounded-2xl shadow-sm border border-subtle">
                <p className="text-sm font-medium text-content-muted mb-1">Commandes totales</p>
                <p className="text-3xl font-bold text-content">{currentMonthOrders}</p>
              </div>
              <div className="bg-surface p-6 rounded-2xl shadow-sm border border-subtle">
                <p className="text-sm font-medium text-content-muted mb-1">Panier moyen</p>
                <p className="text-3xl font-bold text-content">{averageOrderValue.toFixed(2)}€</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Dish Modal */}
      <AnimatePresence>
        {(editingItem || isCreatingItem) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => {
                setEditingItem(null);
                setIsCreatingItem(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-surface rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-subtle flex justify-between items-center bg-surface shrink-0">
                <h3 className="text-xl font-bold text-content">
                  {isCreatingItem ? 'Nouveau plat' : 'Modifier le plat'}
                </h3>
                <button 
                  onClick={() => {
                    setEditingItem(null);
                    setIsCreatingItem(false);
                  }}
                  className="p-2 text-content-muted hover:text-content-muted hover:bg-border-default rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Nom du plat</label>
                  <input 
                    type="text" 
                    value={itemForm.name}
                    onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-content mb-1">Prix (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={itemForm.price}
                      onChange={(e) => setItemForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-content mb-1">Stock (optionnel)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={itemForm.stock === undefined ? '' : itemForm.stock}
                      onChange={(e) => setItemForm(prev => ({ ...prev, stock: e.target.value === '' ? undefined : parseInt(e.target.value, 10) }))}
                      placeholder="Infini"
                      className="w-full px-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-content mb-1">Catégorie</label>
                    <select
                      value={itemForm.categoryId}
                      onChange={(e) => setItemForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">URL de l'image</label>
                  <input 
                    type="text" 
                    value={itemForm.image}
                    onChange={(e) => setItemForm(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {itemForm.image && (
                    <img src={itemForm.image} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded-lg border border-subtle" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Ingrédients (séparés par des virgules)</label>
                  <input 
                    type="text" 
                    value={itemForm.components?.join(', ') || ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, components: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') }))}
                    placeholder="Ex: Tomate, Fromage, Oignon..."
                    className="w-full px-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Options de personnalisation (JSON)</label>
                  <textarea 
                    value={JSON.stringify(itemForm.customizations, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setItemForm(prev => ({ ...prev, customizations: parsed }));
                      } catch (err) {
                        // Keep current value if invalid JSON while typing
                      }
                    }}
                    rows={5}
                    placeholder='[{"id": "opt1", "title": "Supplément", "type": "multiple", "choices": [{"id": "c1", "label": "Fromage", "price": 1}]}]'
                    className="w-full px-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                  />
                  <p className="text-[10px] text-content-muted mt-1">
                    Format: Array of options. Each option: {"{id, title, type: 'single'|'multiple', required, choices: [{id, label, price}]}"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Description</label>
                  <textarea 
                    value={itemForm.description}
                    onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Allergènes (séparés par des virgules)</label>
                  <input 
                    type="text" 
                    value={itemForm.allergens?.join(', ') || ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, allergens: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') }))}
                    placeholder="Ex: Gluten, Lactose, Arachides..."
                    className="w-full px-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-subtle bg-surface flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => {
                    setEditingItem(null);
                    setIsCreatingItem(false);
                  }}
                  className="px-4 py-2 text-content-muted font-medium hover:bg-border-default rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => {
                    if (isCreatingItem) {
                      addMenuItem({
                        id: `item-${Date.now()}`,
                        name: itemForm.name || 'Nouveau plat',
                        price: itemForm.price || 0,
                        description: itemForm.description || '',
                        image: itemForm.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
                        categoryId: itemForm.categoryId || categories[0]?.id,
                        isAvailable: itemForm.stock === 0 ? false : true,
                        stock: itemForm.stock,
                        allergens: [],
                        components: itemForm.components || [],
                        customizations: itemForm.customizations || []
                      });
                    } else if (editingItem) {
                      updateMenuItem(editingItem.id, {
                        ...itemForm,
                        isAvailable: itemForm.stock === 0 ? false : itemForm.isAvailable
                      });
                    }
                    setEditingItem(null);
                    setIsCreatingItem(false);
                  }}
                  className="px-4 py-2 bg-primary text-content-inverted font-medium hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit/Create Category Modal */}
      <AnimatePresence>
        {(editingCategory || isCreatingCategory) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => {
                setEditingCategory(null);
                setIsCreatingCategory(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-surface rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-subtle flex justify-between items-center bg-surface">
                <h3 className="text-xl font-bold text-content">
                  {isCreatingCategory ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
                </h3>
                <button 
                  onClick={() => {
                    setEditingCategory(null);
                    setIsCreatingCategory(false);
                  }}
                  className="p-2 text-content-muted hover:text-content-muted hover:bg-border-default rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Nom de la catégorie</label>
                  <input 
                    type="text" 
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Entrées"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-subtle bg-surface flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setEditingCategory(null);
                    setIsCreatingCategory(false);
                  }}
                  className="px-4 py-2 text-content-muted font-medium hover:bg-border-default rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => {
                    if (isCreatingCategory && categoryForm.name) {
                      addCategory({
                        id: `cat-${Date.now()}`,
                        name: categoryForm.name
                      });
                    } else if (editingCategory && categoryForm.name) {
                      updateCategory(editingCategory.id, { name: categoryForm.name });
                    }
                    setEditingCategory(null);
                    setIsCreatingCategory(false);
                  }}
                  disabled={!categoryForm.name?.trim()}
                  className="px-4 py-2 bg-primary text-content-inverted font-medium hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QR Code Display Modal */}
      <AnimatePresence>
        {showQRCode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative"
            >
              <button 
                onClick={() => setShowQRCode(null)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              
              <div className="mb-6">
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                  <QrCode className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Carte de Fidélité</h3>
                <p className="text-gray-500 text-sm mt-1">Scannez pour ajouter des points</p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-2xl mb-6 flex justify-center border-2 border-dashed border-gray-200">
                <QRCodeSVG 
                  value={showQRCode} 
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              
              <div className="space-y-2">
                <p className="font-mono text-sm text-gray-400">ID: {showQRCode}</p>
                <button 
                  onClick={() => {
                    const svg = document.querySelector('.bg-gray-50 svg');
                    if (svg) {
                      const svgData = new XMLSerializer().serializeToString(svg);
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const img = new Image();
                      img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx?.drawImage(img, 0, 0);
                        const pngFile = canvas.toDataURL('image/png');
                        const downloadLink = document.createElement('a');
                        downloadLink.download = `QR_Fidelite_${showQRCode}.png`;
                        downloadLink.href = pngFile;
                        downloadLink.click();
                      };
                      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                    }
                  }}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Télécharger le QR Code
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Client Profile Modal */}
      <AnimatePresence>
        {selectedClient && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setSelectedClient(null)}
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-surface shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-subtle flex justify-between items-start bg-surface shrink-0">
                <div>
                  <h3 className="text-2xl font-bold text-content">{selectedClient.name}</h3>
                  <p className="text-content-muted">{selectedClient.email} • {selectedClient.phone}</p>
                  
                  {user?.role === 'admin' && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-content-muted">Rôle :</label>
                        <select
                          value={selectedClient.role}
                          onChange={async (e) => {
                            try {
                              await updateClientRole(selectedClient.id, e.target.value);
                              setSelectedClient({ ...selectedClient, role: e.target.value });
                              toast.success("Rôle mis à jour avec succès");
                            } catch (error) {
                              toast.error("Erreur lors de la mise à jour du rôle");
                            }
                          }}
                          className="text-sm border border-subtle rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="client">Client</option>
                          <option value="cuisine">Cuisine</option>
                          <option value="livreur">Livreur</option>
                          <option value="admin">Manager</option>
                        </select>
                      </div>
                      
                      <button 
                        onClick={() => setShowQRCode(selectedClient.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-hover border border-primary-100 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                        Générer Carte QR
                      </button>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="p-2 text-content-muted hover:text-content-muted hover:bg-border-default rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 border-b border-subtle grid grid-cols-3 gap-4 shrink-0">
                <div className="bg-surface p-4 rounded-xl text-center">
                  <p className="text-xs text-content-muted font-medium mb-1">Commandes</p>
                  <p className="text-xl font-bold text-content">{selectedClient.totalOrders}</p>
                </div>
                <div className="bg-surface p-4 rounded-xl text-center">
                  <p className="text-xs text-content-muted font-medium mb-1">Total Dépensé</p>
                  <p className="text-xl font-bold text-content">{selectedClient.totalSpent.toFixed(2)}€</p>
                </div>
                <div className="bg-primary-50 p-4 rounded-xl text-center">
                  <p className="text-xs text-primary-hover font-medium mb-1">Points</p>
                  <p className="text-xl font-bold text-primary-hover">{Math.floor(selectedClient.totalSpent * 0.1)}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <h4 className="font-bold text-lg text-content mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-content-muted" />
                  Historique des commandes
                </h4>
                <div className="space-y-4">
                  {selectedClient.orders.map(order => (
                    <div key={order.id} className="border border-subtle rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-content">{order.id}</p>
                          <p className="text-xs text-content-muted">{order.time}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </div>
                      <ul className="space-y-1 mb-3">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="space-y-1">
                            <div className="text-sm text-content-muted flex justify-between">
                              <span><span className="font-medium text-content">{item.quantity}x</span> {item.name}</span>
                            </div>
                            {item.removedComponents && item.removedComponents.length > 0 && (
                              <div className="text-[10px] font-bold text-destructive uppercase tracking-wider pl-4">
                                SANS : {item.removedComponents.join(', ')}
                              </div>
                            )}
                            {item.customizations && item.customizations.map((opt, optIdx) => (
                              <div key={optIdx} className="text-[10px] text-content-muted pl-4 italic">
                                + {opt.optionTitle}: {opt.choices.map(c => c.label).join(', ')}
                              </div>
                            ))}
                            {item.notes && (
                              <div className="text-[10px] font-bold text-primary uppercase tracking-wider pl-4">
                                NOTE : {item.notes}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-between items-center pt-3 border-t border-subtle">
                        <span className="text-sm font-medium text-content-muted">
                          {order.type === 'delivery' ? 'Livraison' : order.type === 'pickup' ? 'À emporter' : 'Sur place'}
                        </span>
                        <span className="font-bold text-content">{order.total.toFixed(2)}€</span>
                      </div>
                    </div>
                  ))}
                  {selectedClient.orders.length === 0 && (
                    <p className="text-content-muted text-center py-8">Aucune commande trouvée.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QR Scan Modal */}
      <AnimatePresence>
        {isScanModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-subtle flex justify-between items-center">
                <h3 className="text-xl font-bold text-content">Scanner une carte de fidélité</h3>
                <button onClick={() => setIsScanModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full">
                  <X className="w-5 h-5 text-content-muted" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-content-muted">
                  En conditions réelles, vous utiliseriez l'appareil photo ou une douchette pour scanner le QR Code du client. Ici, vous pouvez simuler le scan en entrant l'ID du client (visible dans l'URL du QR code).
                </p>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">ID du Client (ex: 12345)</label>
                  <input 
                    type="text" 
                    value={scannedUserId}
                    onChange={(e) => setScannedUserId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-subtle focus:ring-2 focus:ring-primary outline-none"
                    placeholder="ID du client..."
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setScanAction('add')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${scanAction === 'add' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-subtle text-content-muted hover:bg-surface-hover'}`}
                  >
                    Ajouter des points
                  </button>
                  <button 
                    onClick={() => setScanAction('remove')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${scanAction === 'remove' ? 'bg-red-50 border-red-200 text-red-700' : 'border-subtle text-content-muted hover:bg-surface-hover'}`}
                  >
                    Retirer des points
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Nombre de points</label>
                  <input 
                    type="number" 
                    value={scanPoints}
                    onChange={(e) => setScanPoints(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-subtle focus:ring-2 focus:ring-primary outline-none"
                    min="0"
                  />
                </div>
                <button 
                  onClick={handleScanSubmit}
                  className="w-full py-3 bg-primary text-content-inverted font-bold rounded-xl hover:bg-primary-hover transition-colors mt-4"
                >
                  Valider l'opération
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
