/**
 * ثوابت وأنواع نظام متابعة الآبار
 * Wells Tracking System Constants & Types
 */

// ==================== أنواع المهام (Well Task Types) ====================

export const WELL_TASK_TYPES = {
  EXCAVATION: 'excavation',
  CARPENTRY: 'carpentry',
  CONCRETE: 'concrete',
  PLUMBING: 'plumbing',
  ELECTRICAL: 'electrical',
  PANEL_INSTALLATION: 'panel_installation',
  PUMP_INSTALLATION: 'pump_installation',
  TESTING: 'testing',
  FINISHING: 'finishing',
} as const;

export type WellTaskType = typeof WELL_TASK_TYPES[keyof typeof WELL_TASK_TYPES];

export const WELL_TASK_LABELS: Record<WellTaskType, string> = {
  [WELL_TASK_TYPES.EXCAVATION]: 'حفر',
  [WELL_TASK_TYPES.CARPENTRY]: 'نجارة',
  [WELL_TASK_TYPES.CONCRETE]: 'صبة',
  [WELL_TASK_TYPES.PLUMBING]: 'سباكة',
  [WELL_TASK_TYPES.ELECTRICAL]: 'كهرباء',
  [WELL_TASK_TYPES.PANEL_INSTALLATION]: 'تركيب ألواح',
  [WELL_TASK_TYPES.PUMP_INSTALLATION]: 'تركيب مضخة',
  [WELL_TASK_TYPES.TESTING]: 'اختبار',
  [WELL_TASK_TYPES.FINISHING]: 'تشطيب',
};

export const WELL_TASK_TYPE_OPTIONS = Object.entries(WELL_TASK_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// ==================== حالات المهام (Task Status) ====================

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ACCOUNTED: 'accounted',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TASK_STATUS.PENDING]: 'قيد الانتظار',
  [TASK_STATUS.IN_PROGRESS]: 'قيد التنفيذ',
  [TASK_STATUS.COMPLETED]: 'منجز',
  [TASK_STATUS.ACCOUNTED]: 'تم محاسبته',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TASK_STATUS.PENDING]: 'bg-gray-100 text-gray-800',
  [TASK_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [TASK_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
  [TASK_STATUS.ACCOUNTED]: 'bg-purple-100 text-purple-800',
};

export const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// ==================== حالات البئر (Well Status) ====================

export const WELL_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
} as const;

export type WellStatus = typeof WELL_STATUS[keyof typeof WELL_STATUS];

export const WELL_STATUS_LABELS: Record<WellStatus, string> = {
  [WELL_STATUS.PENDING]: 'قيد الانتظار',
  [WELL_STATUS.IN_PROGRESS]: 'قيد التنفيذ',
  [WELL_STATUS.COMPLETED]: 'مكتمل',
  [WELL_STATUS.ON_HOLD]: 'متوقف',
};

export const WELL_STATUS_COLORS: Record<WellStatus, string> = {
  [WELL_STATUS.PENDING]: 'bg-gray-100 text-gray-800',
  [WELL_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [WELL_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
  [WELL_STATUS.ON_HOLD]: 'bg-yellow-100 text-yellow-800',
};

export const WELL_STATUS_OPTIONS = Object.entries(WELL_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// ==================== تصنيفات المواد (Material Categories) ====================

export const MATERIAL_TYPES = {
  OPERATIONAL: 'operational',
  CONSUMABLE: 'consumable',
} as const;

export type MaterialType = typeof MATERIAL_TYPES[keyof typeof MATERIAL_TYPES];

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  [MATERIAL_TYPES.OPERATIONAL]: 'مواد تشغيلية',
  [MATERIAL_TYPES.CONSUMABLE]: 'مواد مستهلكة',
};

export const MATERIAL_TYPE_DESCRIPTIONS: Record<MaterialType, string> = {
  [MATERIAL_TYPES.OPERATIONAL]: 'مواد تبقى جزءاً دائماً من البئر (ألواح، مضخات، مواسير)',
  [MATERIAL_TYPES.CONSUMABLE]: 'مواد تُستهلك أثناء العمل (أسمنت، حديد، نيس، كري)',
};

export const MATERIAL_TYPE_OPTIONS = Object.entries(MATERIAL_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
  description: MATERIAL_TYPE_DESCRIPTIONS[value as MaterialType],
}));

// ==================== تصنيفات المواد التفصيلية ====================

export const OPERATIONAL_MATERIALS = {
  SOLAR_PANELS: 'solar_panels',
  PUMPS: 'pumps',
  PIPES: 'pipes',
  BASES: 'bases',
  FANS: 'fans',
  CABLES: 'cables',
  INVERTERS: 'inverters',
} as const;

export const OPERATIONAL_MATERIAL_LABELS: Record<string, string> = {
  [OPERATIONAL_MATERIALS.SOLAR_PANELS]: 'ألواح شمسية',
  [OPERATIONAL_MATERIALS.PUMPS]: 'مضخات',
  [OPERATIONAL_MATERIALS.PIPES]: 'مواسير',
  [OPERATIONAL_MATERIALS.BASES]: 'قواعد',
  [OPERATIONAL_MATERIALS.FANS]: 'مراوح',
  [OPERATIONAL_MATERIALS.CABLES]: 'كوابل',
  [OPERATIONAL_MATERIALS.INVERTERS]: 'انفرترات',
};

export const OPERATIONAL_MATERIAL_UNITS: Record<string, string> = {
  [OPERATIONAL_MATERIALS.SOLAR_PANELS]: 'عدد',
  [OPERATIONAL_MATERIALS.PUMPS]: 'عدد',
  [OPERATIONAL_MATERIALS.PIPES]: 'عدد',
  [OPERATIONAL_MATERIALS.BASES]: 'عدد',
  [OPERATIONAL_MATERIALS.FANS]: 'عدد',
  [OPERATIONAL_MATERIALS.CABLES]: 'متر',
  [OPERATIONAL_MATERIALS.INVERTERS]: 'عدد',
};

export const CONSUMABLE_MATERIALS = {
  CEMENT: 'cement',
  STEEL: 'steel',
  SAND: 'sand',
  GRAVEL: 'gravel',
  FUEL: 'fuel',
  WELDING: 'welding',
  BOLTS: 'bolts',
} as const;

export const CONSUMABLE_MATERIAL_LABELS: Record<string, string> = {
  [CONSUMABLE_MATERIALS.CEMENT]: 'أسمنت',
  [CONSUMABLE_MATERIALS.STEEL]: 'حديد',
  [CONSUMABLE_MATERIALS.SAND]: 'نيس',
  [CONSUMABLE_MATERIALS.GRAVEL]: 'كري',
  [CONSUMABLE_MATERIALS.FUEL]: 'وقود',
  [CONSUMABLE_MATERIALS.WELDING]: 'لحام',
  [CONSUMABLE_MATERIALS.BOLTS]: 'براغي',
};

export const CONSUMABLE_MATERIAL_UNITS: Record<string, string> = {
  [CONSUMABLE_MATERIALS.CEMENT]: 'كيس',
  [CONSUMABLE_MATERIALS.STEEL]: 'طن',
  [CONSUMABLE_MATERIALS.SAND]: 'م³',
  [CONSUMABLE_MATERIALS.GRAVEL]: 'م³',
  [CONSUMABLE_MATERIALS.FUEL]: 'لتر',
  [CONSUMABLE_MATERIALS.WELDING]: 'قطعة',
  [CONSUMABLE_MATERIALS.BOLTS]: 'عدد',
};

// ==================== أنواع المصاريف (Expense Types) ====================

export const EXPENSE_TYPES = {
  LABOR: 'labor',
  OPERATIONAL_MATERIAL: 'operational_material',
  CONSUMABLE_MATERIAL: 'consumable_material',
  TRANSPORT: 'transport',
  SERVICE: 'service',
} as const;

export type ExpenseType = typeof EXPENSE_TYPES[keyof typeof EXPENSE_TYPES];

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  [EXPENSE_TYPES.LABOR]: 'أجور العمالة',
  [EXPENSE_TYPES.OPERATIONAL_MATERIAL]: 'المواد التشغيلية',
  [EXPENSE_TYPES.CONSUMABLE_MATERIAL]: 'المواد المستهلكة',
  [EXPENSE_TYPES.TRANSPORT]: 'النقل والمواصلات',
  [EXPENSE_TYPES.SERVICE]: 'خدمات أخرى',
};

export const EXPENSE_TYPE_ICONS: Record<ExpenseType, string> = {
  [EXPENSE_TYPES.LABOR]: '👷',
  [EXPENSE_TYPES.OPERATIONAL_MATERIAL]: '🔧',
  [EXPENSE_TYPES.CONSUMABLE_MATERIAL]: '🧱',
  [EXPENSE_TYPES.TRANSPORT]: '🚚',
  [EXPENSE_TYPES.SERVICE]: '🛠️',
};

export const EXPENSE_TYPE_COLORS: Record<ExpenseType, string> = {
  [EXPENSE_TYPES.LABOR]: 'bg-blue-500',
  [EXPENSE_TYPES.OPERATIONAL_MATERIAL]: 'bg-green-500',
  [EXPENSE_TYPES.CONSUMABLE_MATERIAL]: 'bg-yellow-500',
  [EXPENSE_TYPES.TRANSPORT]: 'bg-orange-500',
  [EXPENSE_TYPES.SERVICE]: 'bg-purple-500',
};

export const EXPENSE_TYPE_OPTIONS = Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
  icon: EXPENSE_TYPE_ICONS[value as ExpenseType],
}));

// ==================== المناطق الافتراضية (Default Regions) ====================

export const DEFAULT_REGIONS = [
  'دار حمدين',
  'بيت الشعيب',
  'الشبيطا',
  'الحندج',
  'محيران',
  'جربياح',
  'الربعي',
  'المزارع',
  'الوادي',
] as const;

// ==================== أنواع المضخات (Pump Types) ====================

export const PUMP_TYPES = [
  { value: 'sp_30_9', label: 'اس بي 30/9 ريشة', power: 92 },
  { value: 'sp_30_16', label: 'اس بي 30/16 ريشة', power: 15 },
  { value: 'sp_40_6', label: 'اس بي 40/6 ريشة', power: 75 },
  { value: 'sp_25_10', label: 'اس بي 25/10 ريشة', power: 55 },
] as const;

// ==================== أنواع المراوح (Fan Types) ====================

export const FAN_TYPES = [
  { value: 'sp_30_9_blade', label: 'اس بي 30/9 ريشة' },
  { value: 'sp_30_16_blade', label: 'اس بي 30/16 ريشة' },
] as const;

// ==================== وظائف مساعدة (Helper Functions) ====================

export function getTaskTypeLabel(type: WellTaskType): string {
  return WELL_TASK_LABELS[type] || type;
}

export function getTaskStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status] || status;
}

export function getTaskStatusColor(status: TaskStatus): string {
  return TASK_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
}

export function getWellStatusLabel(status: WellStatus): string {
  return WELL_STATUS_LABELS[status] || status;
}

export function getWellStatusColor(status: WellStatus): string {
  return WELL_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
}

export function getMaterialTypeLabel(type: MaterialType): string {
  return MATERIAL_TYPE_LABELS[type] || type;
}

export function getExpenseTypeLabel(type: ExpenseType): string {
  return EXPENSE_TYPE_LABELS[type] || type;
}

export function getExpenseTypeIcon(type: ExpenseType): string {
  return EXPENSE_TYPE_ICONS[type] || '📋';
}

export function getExpenseTypeColor(type: ExpenseType): string {
  return EXPENSE_TYPE_COLORS[type] || 'bg-gray-500';
}

export function calculateWellProgress(completedTasks: number, totalTasks: number): number {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-SA').format(num);
}
