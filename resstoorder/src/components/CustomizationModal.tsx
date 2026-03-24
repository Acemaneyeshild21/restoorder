import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MenuItem, SelectedOption, CustomizationOption, CustomizationChoice } from '../types';

interface CustomizationModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, selectedOptions: SelectedOption[], removedComponents: string[], notes?: string) => boolean | void;
}

export default function CustomizationModal({ item, isOpen, onClose, onAddToCart }: CustomizationModalProps) {
  // State to hold selected options: { optionId: [choiceId1, choiceId2] }
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  // State to hold removed components
  const [removedComponents, setRemovedComponents] = useState<string[]>([]);
  // State to hold special notes/allergies
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Initialize with empty selections or defaults if needed
      const initialSelections: Record<string, string[]> = {};
      item.customizations?.forEach(opt => {
        initialSelections[opt.id] = [];
      });
      setSelections(initialSelections);
      setRemovedComponents([]);
      setNotes('');
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleChoiceToggle = (option: CustomizationOption, choice: CustomizationChoice) => {
    setSelections(prev => {
      const currentChoices = prev[option.id] || [];
      
      if (option.type === 'single') {
        // For single choice, replace the array with just this choice
        return { ...prev, [option.id]: [choice.id] };
      } else {
        // For multiple choice, toggle the choice
        if (currentChoices.includes(choice.id)) {
          return { ...prev, [option.id]: currentChoices.filter(id => id !== choice.id) };
        } else {
          return { ...prev, [option.id]: [...currentChoices, choice.id] };
        }
      }
    });
  };

  const handleComponentToggle = (component: string) => {
    setRemovedComponents(prev => {
      if (prev.includes(component)) {
        return prev.filter(c => c !== component);
      } else {
        return [...prev, component];
      }
    });
  };

  const isFormValid = () => {
    // Check if all required options have at least one choice selected
    if (!item.customizations) return true;
    return item.customizations.every(opt => {
      if (opt.required) {
        return selections[opt.id] && selections[opt.id].length > 0;
      }
      return true;
    });
  };

  const handleSubmit = () => {
    if (!isFormValid()) return;

    // Convert selections state to SelectedOption[]
    const formattedSelections: SelectedOption[] = (item.customizations || []).map(opt => {
      const selectedChoiceIds = selections[opt.id] || [];
      const selectedChoices = opt.choices.filter(c => selectedChoiceIds.includes(c.id));
      return {
        optionId: opt.id,
        optionTitle: opt.title,
        choices: selectedChoices
      };
    }).filter(opt => opt.choices.length > 0); // Only keep options where something was selected

    const success = onAddToCart(item, formattedSelections, removedComponents, notes);
    if (success !== false) {
      onClose();
    }
  };

  // Calculate extra price
  let extraPrice = 0;
  if (item.customizations) {
    item.customizations.forEach(opt => {
      const selectedChoiceIds = selections[opt.id] || [];
      opt.choices.forEach(choice => {
        if (selectedChoiceIds.includes(choice.id) && choice.priceExtra) {
          extraPrice += choice.priceExtra;
        }
      });
    });
  }

  const totalPrice = item.price + extraPrice;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-subtle shrink-0">
          <div>
            <h3 className="text-xl font-bold text-content">{item.name}</h3>
            <p className="text-sm text-content-muted">Personnalisez votre plat</p>
          </div>
          <button onClick={onClose} className="p-2 text-content-muted hover:text-content-muted hover:bg-surface-hover rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-8">
          {/* Ingredients Section (New) */}
          {item.components && item.components.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-baseline border-b border-subtle pb-2">
                <h4 className="font-bold text-content">Ingrédients</h4>
                <span className="text-xs font-medium text-content-muted">
                  Décochez pour retirer
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {item.components.map(component => {
                  const isRemoved = removedComponents.includes(component);
                  return (
                    <button
                      key={component}
                      onClick={() => handleComponentToggle(component)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isRemoved 
                          ? 'border-subtle bg-surface-hover opacity-60' 
                          : 'border-primary bg-primary-50/30 text-primary-hover shadow-sm'
                      }`}
                    >
                      <div className={`w-5 h-5 flex items-center justify-center rounded-md border transition-colors ${
                        isRemoved ? 'border-default bg-surface' : 'border-primary bg-primary'
                      }`}>
                        {!isRemoved && (
                          <div className="bg-surface w-2.5 h-2.5 rounded-sm" />
                        )}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {component}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customizations Section */}
          {item.customizations && item.customizations.map(option => (
            <div key={option.id} className="space-y-3">
              <div className="flex justify-between items-baseline">
                <h4 className="font-bold text-content">{option.title}</h4>
                {option.required && (
                  <span className="text-xs font-medium text-primary bg-primary-50 px-2 py-1 rounded-md">
                    Obligatoire
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                {option.choices.map(choice => {
                  const isSelected = (selections[option.id] || []).includes(choice.id);
                  return (
                    <label 
                      key={choice.id} 
                      onClick={(e) => {
                        e.preventDefault(); // Prevent default label behavior since we don't have a real input
                        handleChoiceToggle(option, choice);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary-50/50' : 'border-subtle hover:border-default'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 flex items-center justify-center rounded-full border ${
                          option.type === 'single' ? 'rounded-full' : 'rounded-md'
                        } ${
                          isSelected ? 'border-primary bg-primary' : 'border-default bg-surface'
                        }`}>
                          {isSelected && (
                            <div className={`bg-surface ${option.type === 'single' ? 'w-2 h-2 rounded-full' : 'w-3 h-3 rounded-sm'}`} />
                          )}
                        </div>
                        <span className={`font-medium ${isSelected ? 'text-primary-hover' : 'text-content'}`}>
                          {choice.label}
                        </span>
                      </div>
                      {choice.priceExtra && (
                        <span className="text-sm font-medium text-content-muted">
                          +{choice.priceExtra.toFixed(2)}€
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special Notes / Allergies Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <h4 className="font-bold text-content">Notes spéciales / Allergies</h4>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Allergie aux arachides, pas de sel, etc."
              className="w-full p-3 rounded-xl border border-subtle bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none h-24 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-subtle bg-background shrink-0">
          <button 
            onClick={handleSubmit}
            disabled={!isFormValid()}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm ${
              isFormValid() 
                ? 'bg-primary hover:bg-primary-hover text-content-inverted' 
                : 'bg-surface-hover text-content-muted cursor-not-allowed'
            }`}
          >
            Ajouter au panier • {totalPrice.toFixed(2)}€
          </button>
        </div>
      </div>
    </div>
  );
}
