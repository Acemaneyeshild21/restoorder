export interface Category {
  id: string;
  name: string;
}

export interface CustomizationChoice {
  id: string;
  label: string;
  priceExtra?: number;
}

export interface CustomizationOption {
  id: string;
  title: string;
  type: 'single' | 'multiple';
  required: boolean;
  choices: CustomizationChoice[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  allergens: string[];
  categoryId: string;
  isAvailable: boolean;
  stock?: number;
  customizations?: CustomizationOption[];
  components?: string[]; // New field for default ingredients
}

export interface SelectedOption {
  optionId: string;
  optionTitle: string;
  choices: CustomizationChoice[];
  removedComponents?: string[]; // New field for removed ingredients
}

export interface CartItem extends MenuItem {
  cartItemId: string;
  quantity: number;
  selectedOptions?: SelectedOption[];
  removedComponents?: string[]; // New field for removed ingredients
  unitPrice: number;
  notes?: string; // Special instructions or allergies
}


