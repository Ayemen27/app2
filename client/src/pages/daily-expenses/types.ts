import type { LucideIcon } from "lucide-react";
import type {
  WorkerAttendance,
  TransportationExpense,
  FundTransfer,
  MaterialPurchase,
  WorkerTransfer,
  Worker,
  Project,
  Supplier,
  ProjectFundTransfer,
} from "@shared/schema";
import type { OverpaymentData } from "@/components/overpayment-split-dialog";
import type { FinancialGuardData } from "@/components/financial-guard-dialog";
import type { StatsRowConfig, FilterConfig, ActionButton } from "@/components/ui/unified-filter-dashboard/types";

export interface DailyExpensesHookReturn {
  toast: any;
  selectedProjectId: string | undefined;
  selectProject: (id: string) => void;
  isAllProjects: boolean;
  isWellsProject: boolean;

  selectedDate: string | undefined;
  setSelectedDate: (d: string | undefined) => void;
  carriedForward: string;
  setCarriedForward: (v: string) => void;
  showProjectTransfers: boolean;
  searchValue: string;
  setSearchValue: (v: string) => void;
  filterValues: Record<string, any>;
  handleFilterChange: (key: string, value: any) => void;
  handleResetFilters: () => void;
  isExporting: boolean;
  isRefreshing: boolean;

  selectedWellIds: number[];
  setSelectedWellIds: (v: number[]) => void;
  selectedCrewTypes: string[];
  setSelectedCrewTypes: (v: string[]) => void;
  selectedTeamNames: string[];
  setSelectedTeamNames: (v: string[]) => void;
  purchaseCrewTypes: string[];
  setPurchaseCrewTypes: (v: string[]) => void;
  purchaseTeamNames: string[];
  setPurchaseTeamNames: (v: string[]) => void;

  isAddFormOpen: boolean;
  setIsAddFormOpen: (v: boolean) => void;
  isFundTransfersExpanded: boolean;
  setIsFundTransfersExpanded: (v: boolean) => void;
  isTransportationExpanded: boolean;
  setIsTransportationExpanded: (v: boolean) => void;
  isAttendanceExpanded: boolean;
  setIsAttendanceExpanded: (v: boolean) => void;
  isMaterialsExpanded: boolean;
  setIsMaterialsExpanded: (v: boolean) => void;
  isWorkerTransfersExpanded: boolean;
  setIsWorkerTransfersExpanded: (v: boolean) => void;
  isProjectTransfersExpanded: boolean;
  setIsProjectTransfersExpanded: (v: boolean) => void;
  isSummaryExpanded: boolean;
  setIsSummaryExpanded: (v: boolean) => void;
  isMiscExpanded: boolean;
  setIsMiscExpanded: (v: boolean) => void;

  dynamicTransportCategories: { value: string; label: string }[];

  fundAmount: string;
  setFundAmount: (v: string) => void;
  senderName: string;
  setSenderName: (v: string) => void;
  transferNumber: string;
  setTransferNumber: (v: string) => void;
  transferType: string;
  setTransferType: (v: string) => void;
  editingFundTransferId: string | null;
  fundTransferWellId: number | undefined;

  transportDescription: string;
  setTransportDescription: (v: string) => void;
  transportAmount: string;
  setTransportAmount: (v: string) => void;
  transportNotes: string;
  setTransportNotes: (v: string) => void;
  editingTransportationId: string | null;
  transportCategory: string;
  setTransportCategory: (v: string) => void;

  purchaseMaterialName: string;
  setPurchaseMaterialName: (v: string) => void;
  purchaseQuantity: string;
  setPurchaseQuantity: (v: string) => void;
  purchaseUnit: string;
  setPurchaseUnit: (v: string) => void;
  purchaseUnitPrice: string;
  setPurchaseUnitPrice: (v: string) => void;
  purchaseTotalAmount: string;
  setPurchaseTotalAmount: (v: string) => void;
  purchaseType: string;
  setPurchaseType: (v: string) => void;
  purchaseSupplierName: string;
  setPurchaseSupplierName: (v: string) => void;
  purchaseNotes: string;
  setPurchaseNotes: (v: string) => void;
  purchaseWellIds: number[];
  setPurchaseWellIds: (v: number[]) => void;
  editingMaterialPurchaseId: string | null;

  workerTransferWorkerId: string;
  setWorkerTransferWorkerId: (v: string) => void;
  workerTransferAmount: string;
  setWorkerTransferAmount: (v: string) => void;
  workerTransferRecipientName: string;
  setWorkerTransferRecipientName: (v: string) => void;
  workerTransferRecipientPhone: string;
  setWorkerTransferRecipientPhone: (v: string) => void;
  workerTransferMethod: string;
  setWorkerTransferMethod: (v: string) => void;
  workerTransferNumber: string;
  setWorkerTransferNumber: (v: string) => void;
  workerTransferSenderName: string;
  setWorkerTransferSenderName: (v: string) => void;
  workerTransferNotes: string;
  setWorkerTransferNotes: (v: string) => void;
  editingWorkerTransferId: string | null;

  selectedWorkerId: string;
  setSelectedWorkerId: (v: string) => void;
  workerDays: string;
  setWorkerDays: (v: string) => void;
  workerAmount: string;
  setWorkerAmount: (v: string) => void;
  workerNotes: string;
  setWorkerNotes: (v: string) => void;
  editingAttendanceId: string | null;
  setEditingAttendanceId: (v: string | null) => void;

  showOverpaymentDialog: boolean;
  setShowOverpaymentDialog: (v: boolean) => void;
  overpaymentData: OverpaymentData | null;
  setOverpaymentData: (v: OverpaymentData | null) => void;
  showGuardTransferDialog: boolean;
  setShowGuardTransferDialog: (v: boolean) => void;
  guardTransferData: FinancialGuardData | null;
  setGuardTransferData: (v: FinancialGuardData | null) => void;
  showGuardPurchaseDialog: boolean;
  setShowGuardPurchaseDialog: (v: boolean) => void;
  guardPurchaseData: FinancialGuardData | null;
  setGuardPurchaseData: (v: FinancialGuardData | null) => void;

  editingProjectTransferId: string | null;
  projectTransferFromId: string;
  setProjectTransferFromId: (v: string) => void;
  projectTransferToId: string;
  setProjectTransferToId: (v: string) => void;
  projectTransferAmount: string;
  setProjectTransferAmount: (v: string) => void;
  projectTransferReason: string;
  setProjectTransferReason: (v: string) => void;
  projectTransferDescription: string;
  setProjectTransferDescription: (v: string) => void;

  workers: Worker[];
  projects: Project[];
  suppliers: Supplier[];
  activeSuppliers: Supplier[];
  materials: any[];
  projectWells: any[];
  availableWorkers: Worker[];
  workerMiscExpenses: any[];

  safeFundTransfers: any[];
  safeTransportation: any[];
  safeMaterialPurchases: any[];
  safeWorkerTransfers: any[];
  safeMiscExpenses: any[];
  safeAttendance: any[];
  safeProjectTransfers: any[];

  filteredFundTransfers: any[];
  filteredAttendance: any[];
  filteredTransportation: any[];
  filteredMaterialPurchases: any[];
  filteredWorkerTransfers: any[];
  filteredMiscExpenses: any[];

  dailyExpensesData: any;
  dailyExpensesLoading: boolean;
  dailyExpensesError: any;

  totals: any;
  totalsValue: any;
  financialSummary: any;
  summaryLoading: boolean;
  displayBalance: number;
  carriedForwardDisplay: any;

  statsRowsConfig: StatsRowConfig[];
  filtersConfig: FilterConfig[];
  actionsConfig: ActionButton[];

  nextDate: () => void;
  prevDate: () => void;

  handleAddFundTransfer: () => void;
  handleEditFundTransfer: (transfer: FundTransfer) => void;
  resetFundTransferForm: () => void;
  addFundTransferMutation: any;
  updateFundTransferMutation: any;
  deleteFundTransferMutation: any;

  handleAddTransportation: () => void;
  handleEditTransportation: (expense: TransportationExpense) => void;
  resetTransportationForm: () => void;
  addTransportationMutation: any;
  updateTransportationMutation: any;
  deleteTransportationMutation: any;

  handleQuickAddAttendance: () => void;
  addWorkerAttendanceMutation: any;
  updateWorkerAttendanceMutation: any;
  deleteWorkerAttendanceMutation: any;

  handleAddMaterialPurchase: () => void;
  handleEditMaterialPurchase: (purchase: any) => void;
  resetMaterialPurchaseForm: () => void;
  addMaterialPurchaseMutation: any;
  updateMaterialPurchaseMutation: any;
  deleteMaterialPurchaseMutation: any;

  handleAddWorkerTransfer: () => void;
  handleEditWorkerTransfer: (transfer: any) => void;
  resetWorkerTransferForm: () => void;
  addWorkerTransferMutation: any;
  updateWorkerTransferMutation: any;
  deleteWorkerTransferMutation: any;

  handleAddProjectTransfer: () => void;
  handleEditProjectTransfer: (transfer: any) => void;
  resetProjectTransferForm: () => void;
  addProjectTransferMutation: any;
  updateProjectTransferMutation: any;
  deleteProjectTransferMutation: any;

  handleSaveSummary: () => void;
  saveDailySummaryMutation: any;

  handleRefresh: () => void;
  handleExportToExcel: () => void;

  refreshAllData: () => void;

  summaryData: any;
  dataIndicators: any;
  totalDataSections: number;
  sectionsWithData: number;
}
