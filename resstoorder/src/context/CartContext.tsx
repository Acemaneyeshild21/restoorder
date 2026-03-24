import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MenuItem, CartItem, SelectedOption } from '../types';
import { toast } from 'sonner';

interface CartContextType {
  items: CartItem[];
  addToCart: (item: MenuItem, selectedOptions?: SelectedOption[], removedComponents?: string[], notes?: string) => boolean;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  orderType: 'dine_in' | 'pickup' | 'delivery';
  setOrderType: (type: 'dine_in' | 'pickup' | 'delivery') => void;
  deliveryAddress: string;
  setDeliveryAddress: (address: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'pickup' | 'delivery'>('dine_in');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const addToCart = (menuItem: MenuItem, selectedOptions: SelectedOption[] = [], removedComponents: string[] = [], notes: string = ''): boolean => {
    const optionsString = JSON.stringify(selectedOptions);
    const removedString = JSON.stringify(removedComponents);
    const cartItemId = `${menuItem.id}-${optionsString}-${removedString}-${notes}`;
    
    const existingItem = items.find((item) => item.cartItemId === cartItemId);
    
    if (existingItem) {
      if (menuItem.stock !== undefined && existingItem.quantity >= menuItem.stock) {
        toast.error(`Stock insuffisant. Il ne reste que ${menuItem.stock} unité(s).`);
        return false;
      }
    } else if (menuItem.stock !== undefined && menuItem.stock <= 0) {
      toast.error(`Ce produit est épuisé.`);
      return false;
    }

    setItems((currentItems) => {
      let unitPrice = menuItem.price;
      selectedOptions.forEach(option => {
        option.choices.forEach(choice => {
          if (choice.priceExtra) {
            unitPrice += choice.priceExtra;
          }
        });
      });

      const currentExistingItem = currentItems.find((item) => item.cartItemId === cartItemId);
      
      if (currentExistingItem) {
        return currentItems.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...currentItems, { ...menuItem, cartItemId, quantity: 1, selectedOptions, removedComponents, unitPrice, notes }];
    });
    return true;
  };

  const removeFromCart = (cartItemId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
        orderType,
        setOrderType,
        deliveryAddress,
        setDeliveryAddress
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart doit être utilisé à l\'intérieur d\'un CartProvider');
  }
  return context;
}

