import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRestaurant, Order, OrderStatus } from '../context/RestaurantContext';
import { CheckCircle2, Clock, ChefHat, Bike, Package, ArrowLeft } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function TrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { orders } = useRestaurant();
  const [order, setOrder] = useState<Order | undefined>(orders.find(o => o.id === orderId));
  const [isLoading, setIsLoading] = useState(!order);

  useEffect(() => {
    if (!orderId) return;

    // First check if it's in the context
    const currentOrder = orders.find(o => o.id === orderId);
    if (currentOrder) {
      setOrder(currentOrder);
      setIsLoading(false);
      return;
    }

    // If not in context (e.g. anonymous user or direct link), fetch it directly
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOrder({
          id: docSnap.id,
          customerName: data.customerName,
          items: data.items || [],
          total: data.total,
          status: data.status as OrderStatus,
          time: data.time || new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: data.createdAt,
          type: data.type as 'pickup' | 'delivery' | 'dine_in',
          userId: data.userId
        });
      } else {
        setOrder(undefined);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching order:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [orders, orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Package className="w-16 h-16 text-content-muted mb-4" />
        <h1 className="text-2xl font-bold text-content mb-2">Commande introuvable</h1>
        <p className="text-content-muted mb-6">Désolé, nous ne trouvons pas la commande {orderId}.</p>
        <Link to="/menu" className="px-6 py-3 bg-primary text-content-inverted rounded-xl font-medium hover:bg-primary-hover transition-colors">
          Retour au menu
        </Link>
      </div>
    );
  }

  const steps = [
    { id: 'pending', label: 'En attente', icon: Clock, description: 'Commande reçue' },
    { id: 'confirmed', label: 'Confirmée', icon: CheckCircle2, description: 'Commande validée' },
    { id: 'preparing', label: 'En préparation', icon: ChefHat, description: 'En cuisine' },
    { id: 'ready', label: 'Prête', icon: Package, description: order.type === 'pickup' ? 'Prête à être retirée' : 'En attente du livreur' },
    { id: 'delivered', label: 'Terminée', icon: CheckCircle2, description: 'Commande livrée/retirée' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === order.status);
  const progressPercentage = currentStepIndex === -1 ? 0 : (currentStepIndex / (steps.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <Link to="/menu" className="inline-flex items-center text-content-muted hover:text-content mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au menu
        </Link>

        <div className="bg-surface rounded-2xl shadow-sm border border-subtle overflow-hidden">
          {/* En-tête de la commande */}
          <div className="p-6 sm:p-8 border-b border-subtle bg-inverted text-content-inverted">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">Suivi de commande</h1>
                <p className="text-content-muted">Commande #{order.id}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-content-muted mb-1">Passée à {order.time}</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-surface/10 text-sm font-medium">
                  {order.type === 'pickup' ? 'À emporter' : order.type === 'delivery' ? 'Livraison' : 'Sur place'}
                </div>
              </div>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="p-6 sm:p-8">
            <div className="relative">
              {/* Ligne de fond */}
              <div className="absolute top-6 left-0 w-full h-1 bg-surface-hover rounded-full overflow-hidden">
                {/* Ligne de progression */}
                <div 
                  className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {/* Étapes */}
              <div className="relative flex justify-between">
                {steps.map((step, index) => {
                  const isCompleted = currentStepIndex >= index;
                  const isCurrent = currentStepIndex === index;
                  const Icon = step.icon;

                  return (
                    <div key={step.id} className="flex flex-col items-center relative z-10">
                      <div 
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors duration-300 ${
                          isCompleted 
                            ? 'bg-primary border-primary-100 text-content-inverted' 
                            : 'bg-surface border-subtle text-content-muted'
                        } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="mt-3 text-center hidden sm:block">
                        <p className={`text-sm font-bold ${isCompleted ? 'text-content' : 'text-content-muted'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-content-muted mt-1 max-w-[100px]">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Message de statut mobile */}
            <div className="mt-8 text-center sm:hidden">
              <p className="text-lg font-bold text-content">
                {currentStepIndex !== -1 ? steps[currentStepIndex].label : 'Statut inconnu'}
              </p>
              <p className="text-sm text-content-muted mt-1">
                {currentStepIndex !== -1 ? steps[currentStepIndex].description : ''}
              </p>
            </div>
          </div>

          {/* Détails de la commande */}
          <div className="bg-background p-6 sm:p-8 border-t border-subtle">
            <h3 className="text-lg font-bold text-content mb-4">Détails de la commande</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-content-muted">
                      <span className="font-medium text-content mr-2">{item.quantity}x</span>
                      {item.name}
                    </span>
                    <span className="text-content font-medium">{(item.price * item.quantity).toFixed(2)}€</span>
                  </div>
                  {item.removedComponents && item.removedComponents.length > 0 && (
                    <div className="text-[10px] font-bold text-destructive uppercase tracking-wider pl-6">
                      SANS : {item.removedComponents.join(', ')}
                    </div>
                  )}
                  {item.customizations && item.customizations.map((opt, optIdx) => (
                    <div key={optIdx} className="text-[10px] text-content-muted pl-6 italic">
                      + {opt.optionTitle}: {opt.choices.map(c => c.label).join(', ')}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-subtle flex justify-between items-center">
              <span className="font-bold text-content">Total</span>
              <span className="text-xl font-bold text-primary">{order.total.toFixed(2)}€</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
