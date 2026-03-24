import { useState } from 'react';
import MenuItemCard from '../components/MenuItemCard';
import { Search, MapPin, Store, Utensils } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useRestaurant } from '../context/RestaurantContext';

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { orderType, setOrderType, deliveryAddress, setDeliveryAddress } = useCart();
  const { menuItems, categories } = useRestaurant();

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.categoryId === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="bg-surface border-b border-subtle pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-content mb-4 tracking-tight">
            Découvrez notre <span className="text-primary">Menu</span>
          </h1>
          <p className="text-lg text-content-muted max-w-2xl mx-auto mb-8">
            Des plats préparés avec passion, des ingrédients frais et locaux. 
            Commandez en ligne pour manger sur place ou à emporter.
          </p>

          {/* Order Type Selection */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="flex bg-surface-hover p-1 rounded-xl mb-4">
              <button
                onClick={() => setOrderType('dine_in')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                  orderType === 'dine_in'
                    ? 'bg-surface text-content shadow-sm'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                <Utensils className="w-4 h-4" />
                Sur place
              </button>
              <button
                onClick={() => setOrderType('pickup')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                  orderType === 'pickup'
                    ? 'bg-surface text-content shadow-sm'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                <Store className="w-4 h-4" />
                À emporter
              </button>
              <button
                onClick={() => setOrderType('delivery')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                  orderType === 'delivery'
                    ? 'bg-surface text-content shadow-sm'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Livraison
              </button>
            </div>

            {/* Address Input for Delivery */}
            {orderType === 'delivery' && (
              <div className="relative animate-in fade-in slide-in-from-top-2 duration-200 mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-content-muted" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-default rounded-xl leading-5 bg-surface placeholder-content-muted focus:outline-none focus:placeholder-content-muted focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-shadow shadow-sm"
                  placeholder="Entrez votre adresse de livraison..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-content-muted" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-default rounded-xl leading-5 bg-surface placeholder-content-muted focus:outline-none focus:placeholder-content-muted focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-shadow shadow-sm"
              placeholder="Rechercher un plat, un ingrédient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Categories Navigation */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-subtle py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === 'all'
                  ? 'bg-inverted text-content-inverted shadow-md'
                  : 'bg-surface text-content-muted hover:bg-surface-hover border border-subtle'
              }`}
            >
              Tout voir
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-inverted text-content-inverted shadow-md'
                    : 'bg-surface text-content-muted hover:bg-surface-hover border border-subtle'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-20">
            <p className="text-content-muted text-lg">
              {searchQuery 
                ? "Aucun plat ne correspond à votre recherche." 
                : "Aucun plat disponible dans cette catégorie pour le moment."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
