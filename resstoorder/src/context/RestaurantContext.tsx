import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy, getDocs, where } from 'firebase/firestore';
import { MenuItem, Category } from '../types';
import { useAuth } from './AuthContext';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customerName: string;
  items: { 
    id?: string; 
    name: string; 
    quantity: number; 
    price: number;
    customizations?: any[];
    removedComponents?: string[];
    notes?: string;
  }[];
  total: number;
  status: OrderStatus;
  time: string;
  createdAt: string;
  type: 'pickup' | 'delivery' | 'dine_in';
  userId?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
  orders: Order[];
}

interface RestaurantContextType {
  menuItems: MenuItem[];
  categories: Category[];
  toggleItemAvailability: (id: string) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  addMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  orders: Order[];
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  addMockOrder: (order?: Order) => void;
  clients: Client[];
  updateClientRole: (id: string, role: string) => void;
  isLoading: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    setIsLoading(true);

    // Categories Subscription
    const qCategories = query(collection(db, 'categories'), orderBy('sort_order', 'asc'));
    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      const cats: Category[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        sort_order: doc.data().sort_order
      }));
      setCategories(cats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });

    // Menu Items Subscription
    const qMenuItems = query(collection(db, 'menu_items'));
    const unsubscribeMenuItems = onSnapshot(qMenuItems, (snapshot) => {
      const items: MenuItem[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description || '',
          price: data.price,
          image: data.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
          categoryId: data.category_id,
          isAvailable: data.is_available,
          allergens: data.tags || [],
          components: data.components || [], // Default ingredients
          customizations: data.customizations || [] // Options
        };
      });
      setMenuItems(items);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'menu_items');
      setIsLoading(false);
    });

    return () => {
      unsubscribeCategories();
      unsubscribeMenuItems();
    };
  }, []);

  useEffect(() => {
    let unsubscribeOrders = () => {};

    if (isAuthenticated && user) {
      const isStaff = ['admin', 'cuisine', 'livreur'].includes(user.role);
      
      // Orders Subscription
      const qOrders = isStaff 
        ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'orders'), where('userId', '==', user.id), orderBy('createdAt', 'desc'));
        
      unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
        const ords: Order[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            customerName: data.customerName,
            items: data.items || [],
            total: data.total,
            status: data.status as OrderStatus,
            time: data.time || new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: data.createdAt,
            type: data.type as 'pickup' | 'delivery' | 'dine_in',
            userId: data.userId
          };
        });
        setOrders(ords);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });

    // Fetch Clients (Users)
      if (isStaff) {
        const fetchClients = async () => {
          try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const clientsData: Client[] = [];
            
            usersSnapshot.forEach(doc => {
              const data = doc.data();
              clientsData.push({
                id: doc.id,
                name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email?.split('@')[0] || 'Client',
                email: data.email || '',
                phone: data.phone || '',
                role: data.role || 'client',
                totalOrders: 0,
                totalSpent: 0,
                lastOrder: 'Jamais',
                orders: []
              });
            });
            setClients(clientsData);
          } catch (error) {
            handleFirestoreError(error, OperationType.LIST, 'users');
          }
        };
        fetchClients();
      } else {
        setClients([]);
      }
    } else {
      setOrders([]);
      setClients([]);
    }

    return () => {
      unsubscribeOrders();
    };
  }, [user, isAuthenticated]);

  // Update clients stats when orders change
  useEffect(() => {
    if (orders.length > 0 && clients.length > 0) {
      setClients(prevClients => prevClients.map(client => {
        const clientOrders = orders.filter(o => o.userId === client.id);
        const totalSpent = clientOrders.reduce((sum, o) => sum + o.total, 0);
        const lastOrder = clientOrders.length > 0 ? new Date(clientOrders[0].createdAt).toLocaleDateString('fr-FR') : 'Jamais';
        
        return {
          ...client,
          totalOrders: clientOrders.length,
          totalSpent,
          lastOrder,
          orders: clientOrders
        };
      }));
    }
  }, [orders]); // Only depend on orders to avoid infinite loops if we depend on clients

  const toggleItemAvailability = async (id: string) => {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;
    
    try {
      await updateDoc(doc(db, 'menu_items', id), {
        is_available: !item.isAvailable
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `menu_items/${id}`);
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
    if (updates.image !== undefined) dbUpdates.image_url = updates.image;
    if (updates.components !== undefined) dbUpdates.components = updates.components;
    if (updates.customizations !== undefined) dbUpdates.customizations = updates.customizations;
    
    if (Object.keys(dbUpdates).length > 0) {
      try {
        await updateDoc(doc(db, 'menu_items', id), dbUpdates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `menu_items/${id}`);
      }
    }
  };

  const addMenuItem = async (item: MenuItem) => {
    try {
      await addDoc(collection(db, 'menu_items'), {
        name: item.name,
        description: item.description || '',
        price: item.price,
        category_id: item.categoryId,
        is_available: item.isAvailable,
        image_url: item.image || '',
        tags: item.allergens || [],
        components: item.components || [],
        customizations: item.customizations || []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'menu_items');
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'menu_items', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `menu_items/${id}`);
    }
  };

  const addCategory = async (category: Category) => {
    try {
      await addDoc(collection(db, 'categories'), {
        name: category.name,
        sort_order: categories.length
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    if (updates.name) {
      try {
        await updateDoc(doc(db, 'categories', id), { name: updates.name });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
      }
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const addMockOrder = async (order?: Order) => {
    console.log("addMockOrder called, but should use real checkout now");
  };

  const updateClientRole = async (id: string, role: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { role });
      setClients(prev => prev.map(c => c.id === id ? { ...c, role } : c));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
      throw error;
    }
  };

  return (
    <RestaurantContext.Provider value={{ 
      menuItems, categories, toggleItemAvailability, updateMenuItem, addMenuItem, deleteMenuItem,
      addCategory, updateCategory, deleteCategory,
      orders, updateOrderStatus, addMockOrder, clients, updateClientRole, isLoading
    }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};
