import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuItem, SelectedOption } from '../types';
import { Plus, Info, Settings2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import CustomizationModal from './CustomizationModal';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ajout direct au panier (sans ouvrir la modale)
  const handleAddToCartDirect = () => {
    if (!isAuthenticated) {
      toast.info('Veuillez vous connecter pour commander');
      navigate('/login');
      return;
    }

    // Si l'article a des options obligatoires, on sélectionne la première par défaut
    const defaultOptions: SelectedOption[] = [];
    if (item.customizations) {
      item.customizations.forEach(opt => {
        if (opt.required && opt.choices.length > 0) {
          defaultOptions.push({
            optionId: opt.id,
            optionTitle: opt.title,
            choices: [opt.choices[0]]
          });
        }
      });
    }
    
    const success = addToCart(item, defaultOptions);
    if (success) {
      toast.success(`${item.name} ajouté au panier !`);
    }
  };

  const handleCustomizeClick = () => {
    if (!isAuthenticated) {
      toast.info('Veuillez vous connecter pour commander');
      navigate('/login');
      return;
    }
    setIsModalOpen(true);
  };

  const handleModalAddToCart = (item: MenuItem, selectedOptions: SelectedOption[], removedComponents: string[], notes?: string) => {
    const success = addToCart(item, selectedOptions, removedComponents, notes);
    if (success) {
      toast.success(`${item.name} ajouté au panier !`);
    }
    return success;
  };

  const hasCustomizations = (item.customizations && item.customizations.length > 0) || (item.components && item.components.length > 0);

  return (
    <>
      <div className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-subtle hover:shadow-md transition-shadow group flex flex-col h-full">
        {/* Image Container */}
        <div className="relative h-48 overflow-hidden bg-surface-hover">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          {!item.isAvailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-surface text-content px-3 py-1 rounded-full text-sm font-bold">
                Épuisé
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-content leading-tight">{item.name}</h3>
            <span className="text-lg font-bold text-primary ml-3">
              {item.price.toFixed(2)}€
            </span>
          </div>
          
          <p className="text-content-muted text-sm mb-4 line-clamp-2 flex-grow">
            {item.description}
          </p>

          {/* Allergens */}
          {item.allergens.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-content-muted mb-4">
              <Info className="w-3 h-3" />
              <span>Allergènes : {item.allergens.join(', ')}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-auto">
            <button 
              onClick={handleAddToCartDirect}
              disabled={!item.isAvailable}
              className={`flex-1 py-2.5 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-colors ${
                item.isAvailable 
                  ? 'bg-surface-hover text-content hover:bg-surface-hover' 
                  : 'bg-surface-hover text-content-muted cursor-not-allowed'
              }`}
              title="Ajouter directement"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
            <button 
              onClick={handleCustomizeClick}
              disabled={!item.isAvailable}
              className={`flex-1 py-2.5 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-colors ${
                item.isAvailable 
                  ? 'bg-primary-50 text-primary-hover hover:bg-primary hover:text-content-inverted' 
                  : 'bg-surface-hover text-content-muted cursor-not-allowed'
              }`}
              title="Personnaliser les options"
            >
              <Settings2 className="w-4 h-4" />
              Personnaliser
            </button>
          </div>
        </div>
      </div>

      <CustomizationModal 
        item={item} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAddToCart={handleModalAddToCart} 
      />
    </>
  );
}

