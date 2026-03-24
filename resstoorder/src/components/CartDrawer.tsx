import { X, Trash2, Plus, Minus, ShoppingBag, MapPin, Store, Utensils } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useRestaurant } from '../context/RestaurantContext';
import { useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, clearCart, totalPrice, orderType, deliveryAddress } = useCart();
  const navigate = useNavigate();
  
  // États pour gérer l'affichage des modales de confirmation
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  if (!isCartOpen) return null;

  // Fonction appelée quand on confirme la suppression d'un article
  const handleRemoveConfirm = () => {
    if (itemToRemove) {
      removeFromCart(itemToRemove);
      toast.success("Article retiré du panier");
      setItemToRemove(null);
    }
  };

  // Fonction appelée quand on confirme le vidage complet du panier
  const handleClearConfirm = () => {
    clearCart();
    toast.success("Le panier a été vidé");
    setIsClearModalOpen(false);
  };

  // Gérer le changement de quantité (si on tombe à 0, on demande confirmation)
  const handleUpdateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setItemToRemove(cartItemId); // Ouvre la modale de confirmation
    } else {
      const item = items.find(i => i.cartItemId === cartItemId);
      if (item && item.stock !== undefined && newQuantity > item.stock) {
        toast.error(`Stock insuffisant. Il ne reste que ${item.stock} unité(s).`);
        return;
      }
      updateQuantity(cartItemId, newQuantity);
    }
  };

  const isCheckoutDisabled = (orderType === 'delivery' && !deliveryAddress.trim()) || isCheckingOut;

  const handleCheckout = async () => {
    if (isCheckoutDisabled) return;
    
    setIsCheckingOut(true);
    try {
      const user = auth.currentUser;
      const userId = user?.uid;

      // Create order
      const orderData = {
        userId: userId || 'anonymous',
        customerName: user?.displayName || user?.email?.split('@')[0] || 'Client Invité',
        status: 'pending',
        total: totalPrice,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
        type: orderType,
        createdAt: new Date().toISOString(),
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.unitPrice,
          customizations: item.selectedOptions || [],
          removedComponents: item.removedComponents || [],
          notes: item.notes || ''
        }))
      };

      let docRef;
      try {
        docRef = await addDoc(collection(db, 'orders'), orderData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'orders');
        return; // handleFirestoreError throws, but for TS
      }

      // Add points to user if logged in
      if (userId) {
        const pointsEarned = Math.floor(totalPrice * 5);
        const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
        
        try {
          await updateDoc(doc(db, 'users', userId), {
            points: increment(pointsEarned),
            loyaltyHistory: arrayUnion({
              id: Date.now(),
              date: today,
              action: `Commande #${docRef.id.substring(0, 4).toUpperCase()} (${totalPrice.toFixed(2)}€)`,
              points: `+${pointsEarned}`
            })
          });
        } catch (err) {
          console.error("Error updating user points:", err);
          // Non-blocking error, but we could use handleFirestoreError here if we wanted it to be fatal
          // For loyalty points, maybe it's better to log it but not fail the whole checkout if the order was created
        }
      }

      const orderTypeLabel = orderType === 'delivery' ? 'livraison' : orderType === 'pickup' ? 'retrait' : 'sur place';
      toast.success(`Commande validée pour ${orderTypeLabel} !`);
      clearCart();
      setIsCartOpen(false);
      navigate(`/tracking/${docRef.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erreur lors de la création de la commande. Veuillez réessayer.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      {/* Overlay sombre en arrière-plan */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" 
        onClick={() => setIsCartOpen(false)} 
      />
      
      {/* Le panneau latéral (Drawer) */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-surface shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* En-tête du panier */}
        <div className="flex items-center justify-between p-5 border-b border-subtle">
          <h2 className="text-xl font-bold text-content flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Mon Panier
          </h2>
          <button 
            onClick={() => setIsCartOpen(false)} 
            className="p-2 text-content-muted hover:text-content-muted hover:bg-surface-hover rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu du panier (Liste des articles) */}
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-content-muted space-y-4">
              <ShoppingBag className="w-16 h-16 text-border-default" />
              <p className="text-lg">Votre panier est vide</p>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map(item => (
                <div key={item.cartItemId} className="flex gap-4 border-b border-subtle pb-4 last:border-0 last:pb-0">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-20 h-20 object-cover rounded-xl shrink-0" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-content leading-tight pr-2">{item.name}</h3>
                        <button 
                          onClick={() => setItemToRemove(item.cartItemId)} 
                          className="text-content-muted hover:text-red-500 transition-colors mt-1 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Affichage des options sélectionnées */}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {item.selectedOptions.map(opt => (
                            <div key={opt.optionId} className="text-xs text-content-muted">
                              <span className="font-medium text-content-muted">{opt.optionTitle}:</span>{' '}
                              {opt.choices.map(c => c.label).join(', ')}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Affichage des composants retirés */}
                      {item.removedComponents && item.removedComponents.length > 0 && (
                        <div className="mt-1">
                          <div className="text-[10px] font-bold text-destructive uppercase tracking-wider">
                            SANS : {item.removedComponents.join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Affichage des notes spéciales */}
                      {item.notes && (
                        <div className="mt-1 p-1.5 bg-surface-hover rounded-lg border border-subtle">
                          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Note / Allergie :</div>
                          <p className="text-[11px] text-content-muted italic leading-tight">{item.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <span className="font-bold text-primary">
                        {(item.unitPrice * item.quantity).toFixed(2)}€
                      </span>
                      <div className="flex items-center gap-3 bg-background rounded-lg p-1 border border-subtle">
                        <button 
                          onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity - 1)} 
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-surface shadow-sm text-content-muted hover:text-primary transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-medium text-sm w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity + 1)} 
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-surface shadow-sm text-content-muted hover:text-primary transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pied de page (Total et boutons d'action) */}
        {items.length > 0 && (
          <div className="border-t border-subtle p-5 bg-background">
            
            {/* Order Info */}
            <div className="mb-4 p-3 bg-surface rounded-xl border border-subtle">
              <div className="flex items-center gap-2 text-content font-medium mb-1">
                {orderType === 'dine_in' ? <Utensils className="w-4 h-4 text-primary" /> : orderType === 'pickup' ? <Store className="w-4 h-4 text-primary" /> : <MapPin className="w-4 h-4 text-primary" />}
                <span>{orderType === 'dine_in' ? 'Sur place' : orderType === 'pickup' ? 'À emporter' : 'Livraison'}</span>
              </div>
              {orderType === 'delivery' && (
                <p className={`text-sm ${deliveryAddress ? 'text-content-muted' : 'text-red-500'}`}>
                  {deliveryAddress || 'Veuillez renseigner votre adresse sur la page menu.'}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-content-muted">Total TTC</span>
              <span className="text-2xl font-bold text-content">{totalPrice.toFixed(2)}€</span>
            </div>
            <div className="space-y-3">
              <button 
                onClick={handleCheckout}
                disabled={isCheckoutDisabled}
                className={`w-full py-3.5 font-bold rounded-xl transition-colors shadow-sm ${
                  isCheckoutDisabled 
                    ? 'bg-border-default text-content-muted cursor-not-allowed' 
                    : 'bg-primary hover:bg-primary-hover text-content-inverted'
                }`}
              >
                Valider la commande
              </button>
              <button 
                onClick={() => setIsClearModalOpen(true)} 
                className="w-full py-3.5 bg-surface border border-subtle text-content-muted hover:bg-background hover:text-red-500 font-medium rounded-xl transition-colors"
              >
                Vider le panier
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales de confirmation personnalisées */}
      <ConfirmModal 
        isOpen={!!itemToRemove} 
        onClose={() => setItemToRemove(null)} 
        onConfirm={handleRemoveConfirm} 
        title="Retirer l'article" 
        message="Êtes-vous sûr de vouloir retirer cet article de votre panier ?" 
        confirmText="Retirer" 
      />
      
      <ConfirmModal 
        isOpen={isClearModalOpen} 
        onClose={() => setIsClearModalOpen(false)} 
        onConfirm={handleClearConfirm} 
        title="Vider le panier" 
        message="Êtes-vous sûr de vouloir vider entièrement votre panier ? Cette action est irréversible." 
        confirmText="Vider le panier" 
      />
    </>
  );
}

