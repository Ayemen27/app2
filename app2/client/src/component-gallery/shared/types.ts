export type ComponentState = 
  | 'default'
  | 'hover'
  | 'focused'
  | 'active'
  | 'disabled'
  | 'loading'
  | 'error'
  | 'success'
  | 'selected';

export type SearchState = 
  | 'idle'
  | 'focused'
  | 'typing'
  | 'loading'
  | 'no-results'
  | 'error';

export type CardState = 
  | 'normal'
  | 'hover'
  | 'focused'
  | 'selected'
  | 'disabled'
  | 'loading';

export interface GalleryComponent {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: 'search' | 'card' | 'layout' | 'utility';
  tags: string[];
  states: ComponentState[];
  preview: React.ReactNode;
  code: {
    html: string;
    tailwind: string;
    react: string;
  };
  props?: ComponentProp[];
  events?: ComponentEvent[];
}

export interface ComponentProp {
  name: string;
  type: string;
  default?: string;
  required: boolean;
  description: string;
  descriptionAr: string;
}

export interface ComponentEvent {
  name: string;
  payload: string;
  description: string;
  descriptionAr: string;
}

export interface SearchDesign {
  id: string;
  number: number;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  variant: SearchVariant;
  states: SearchState[];
  features: SearchFeature[];
}

export type SearchVariant = 
  | 'minimal-inline'
  | 'card-style'
  | 'sidebar-filters'
  | 'floating-bar'
  | 'multi-field'
  | 'advanced-modal'
  | 'tag-driven'
  | 'voice-search';

export type SearchFeature = 
  | 'typeahead'
  | 'filters'
  | 'date-picker'
  | 'range-slider'
  | 'tags'
  | 'voice'
  | 'recent-searches'
  | 'geolocation'
  | 'debounce'
  | 'keyboard-nav';

export interface CardDesign {
  id: string;
  number: number;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  variant: CardVariant;
  states: CardState[];
  features: CardFeature[];
}

export type CardVariant = 
  | 'worker'
  | 'expense'
  | 'project'
  | 'product'
  | 'activity'
  | 'generic';

export type CardFeature = 
  | 'avatar'
  | 'progress-bar'
  | 'status-badge'
  | 'actions-menu'
  | 'checkbox'
  | 'drag-handle'
  | 'quick-actions'
  | 'expandable';

export interface GalleryCatalog {
  searchDesigns: SearchDesign[];
  cardDesigns: CardDesign[];
  version: string;
  lastUpdated: string;
}

export interface InspectorState {
  isOpen: boolean;
  selectedComponent: GalleryComponent | null;
  activeTab: 'preview' | 'html' | 'tailwind' | 'react' | 'props';
  currentState: ComponentState;
}

export interface GallerySettings {
  viewMode: 'grid' | 'list';
  theme: 'light' | 'dark' | 'system';
  showCode: boolean;
  columns: 1 | 2 | 3 | 4 | 6;
  language: 'ar' | 'en';
}

export interface ApiSearchRequest {
  query: string;
  page: number;
  perPage: number;
  filters: Record<string, string | number | boolean>;
}

export interface ApiSearchResponse<T> {
  results: T[];
  total: number;
  page: number;
  perPage: number;
  facets?: Record<string, Record<string, number>>;
}

export interface CardData {
  id: string;
  type: CardVariant;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  meta: Record<string, unknown>;
  badges?: string[];
  progress?: number;
  status?: 'active' | 'paused' | 'completed' | 'overdue';
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'suggestion';
  icon?: string;
}

export interface FilterOption {
  id: string;
  label: string;
  labelAr: string;
  value: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  name: string;
  nameAr: string;
  type: 'checkbox' | 'radio' | 'range' | 'date' | 'tags';
  options: FilterOption[];
  multiple?: boolean;
}
