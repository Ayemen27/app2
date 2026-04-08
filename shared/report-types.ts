export interface ReportKPI {
  label: string;
  value: number;
  format: 'currency' | 'number' | 'percentage' | 'days';
  color?: string;
  icon?: string;
}

export interface ReportChartDataPoint {
  date: string;
  wages: number;
  materials: number;
  transport: number;
  misc: number;
  transfers: number;
  income: number;
  total: number;
}

export interface AttendanceRecord {
  workerId: string;
  workerName: string;
  workerType: string;
  workDays: number;
  dailyWage: number;
  totalWage: number;
  paidAmount: number;
  remainingAmount: number;
  workDescription: string;
}

export interface MaterialRecord {
  id: number;
  materialName: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  supplierName: string;
  purchaseType: string;
}

export interface TransportRecord {
  id: number;
  amount: number;
  description: string;
  workerName: string;
}

export interface MiscExpenseRecord {
  id: number;
  amount: number;
  description: string;
  notes: string;
}

export interface WorkerTransferRecord {
  id: number;
  workerName: string;
  amount: number;
  recipientName: string;
  transferMethod: string;
}

export interface FundTransferRecord {
  id: number;
  amount: number;
  senderName: string;
  transferType: string;
  transferNumber: string;
}

export interface InventoryIssuedRecord {
  id: number;
  itemName: string;
  category: string;
  unit: string;
  issuedQty: number;
  receivedQty: number;
  remainingQty: number;
  projectName: string;
  notes: string;
}

export interface SupplierPaymentRecord {
  id: string;
  supplierName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber: string;
  purchaseMaterial?: string;
  notes: string;
}

export interface DailyReportData {
  reportType: 'daily';
  generatedAt: string;
  project: {
    id: string;
    name: string;
    location?: string;
    engineerName?: string;
    managerName?: string;
  };
  date: string;
  kpis: ReportKPI[];
  attendance: AttendanceRecord[];
  materials: MaterialRecord[];
  transport: TransportRecord[];
  miscExpenses: MiscExpenseRecord[];
  workerTransfers: WorkerTransferRecord[];
  fundTransfers: FundTransferRecord[];
  inventoryIssued?: InventoryIssuedRecord[];
  projectTransfersOut?: {
    id: number;
    amount: number;
    toProjectName: string;
    description: string;
  }[];
  totals: {
    totalWorkerWages: number;
    totalPaidWages: number;
    totalMaterials: number;
    totalTransport: number;
    totalMiscExpenses: number;
    totalWorkerTransfers: number;
    totalFundTransfers: number;
    totalExpenses: number;
    balance: number;
    workerCount: number;
    totalWorkDays: number;
  };
}

export interface WorkerStatementEntry {
  date: string;
  type: 'عمل' | 'حوالة' | 'دفعة' | 'تصفية';
  description: string;
  projectName: string;
  workDays: number;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
}

export interface WorkerProjectWageInfo {
  projectName: string;
  dailyWage: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface WorkerStatementData {
  reportType: 'worker-statement';
  generatedAt: string;
  worker: {
    id: string;
    name: string;
    type: string;
    dailyWage: number;
    phone?: string;
    nationality?: string;
  };
  period: {
    from: string;
    to: string;
  };
  kpis: ReportKPI[];
  statement: WorkerStatementEntry[];
  projectWages?: WorkerProjectWageInfo[];
  projectSummary: Array<{
    projectName: string;
    totalDays: number;
    totalEarned: number;
    totalPaid: number;
    balance: number;
  }>;
  totals: {
    totalWorkDays: number;
    totalEarned: number;
    totalPaid: number;
    totalTransfers: number;
    finalBalance: number;
  };
}

export interface PeriodFinalReportData {
  reportType: 'period-final';
  generatedAt: string;
  project: {
    id: string;
    name: string;
    location?: string;
    engineerName?: string;
    managerName?: string;
    budget?: number;
    startDate?: string;
    status?: string;
  };
  period: {
    from: string;
    to: string;
  };
  kpis: ReportKPI[];
  chartData: ReportChartDataPoint[];
  sections: {
    attendance: {
      summary: Array<{
        date: string;
        workerCount: number;
        totalWorkDays: number;
        totalWages: number;
        totalPaid: number;
      }>;
      byWorker: Array<{
        workerId: string;
        workerName: string;
        workerType: string;
        totalDays: number;
        totalEarned: number;
        totalDirectPaid: number;
        totalTransfers: number;
        totalPaid: number;
        balance: number;
        rebalanceDelta?: number;
        adjustedBalance?: number;
      }>;
    };
    materials: {
      total: number;
      totalPaid: number;
      items: Array<{
        materialName: string;
        totalQuantity: number;
        totalAmount: number;
        supplierName: string;
      }>;
    };
    transport: {
      total: number;
      tripCount: number;
    };
    miscExpenses: {
      total: number;
      count: number;
    };
    fundTransfers: {
      total: number;
      count: number;
      items: Array<{
        date: string;
        amount: number;
        senderName: string;
        transferType: string;
      }>;
    };
    workerTransfers: {
      total: number;
      count: number;
    };
    projectTransfers: {
      totalOutgoing: number;
      totalIncoming: number;
      net: number;
      items: Array<{
        date: string;
        amount: number;
        fromProjectName: string;
        toProjectName: string;
        reason: string;
        direction: 'incoming' | 'outgoing';
      }>;
    };
    supplierPayments?: {
      total: number;
      count: number;
      items: SupplierPaymentRecord[];
    };
    inventoryIssued?: {
      totalItems: number;
      totalIssuedQty: number;
      items: InventoryIssuedRecord[];
    };
  };
  totals: {
    totalIncome: number;
    totalExpenses: number;
    totalWages: number;
    totalMaterials: number;
    totalTransport: number;
    totalMisc: number;
    totalWorkerTransfers: number;
    totalProjectTransfersOut: number;
    totalProjectTransfersIn: number;
    totalSupplierPayments?: number;
    balance: number;
    budgetUtilization?: number;
  };
}

export interface ProjectBreakdown {
  projectId: string;
  projectName: string;
  location?: string;
  managerName?: string;
  budget?: number;
  status?: string;
  totals: {
    totalIncome: number;
    totalExpenses: number;
    totalWages: number;
    totalMaterials: number;
    totalTransport: number;
    totalMisc: number;
    totalWorkerTransfers: number;
    totalProjectTransfersOut: number;
    totalProjectTransfersIn: number;
    balance: number;
  };
  sections: PeriodFinalReportData['sections'];
}

export interface MultiProjectFinalReportData {
  reportType: 'multi-project-final';
  generatedAt: string;
  projectNames: string[];
  period: {
    from: string;
    to: string;
  };
  kpis: ReportKPI[];
  chartData: ReportChartDataPoint[];
  projects: ProjectBreakdown[];
  interProjectTransfers: Array<{
    date: string;
    amount: number;
    fromProjectName: string;
    toProjectName: string;
    reason: string;
  }>;
  combinedTotals: {
    totalIncome: number;
    totalFundTransfers: number;
    totalProjectTransfersIn: number;
    totalProjectTransfersOut: number;
    totalExpenses: number;
    totalWages: number;
    totalMaterials: number;
    totalTransport: number;
    totalMisc: number;
    totalWorkerTransfers: number;
    totalInterProjectTransfers: number;
    balance: number;
  };
  combinedSections: {
    attendance: {
      byWorker: Array<{
        workerId: string;
        workerName: string;
        workerType: string;
        projectName: string;
        totalDays: number;
        totalEarned: number;
        totalDirectPaid: number;
        totalTransfers: number;
        totalPaid: number;
        balance: number;
        rebalanceDelta?: number;
        adjustedBalance?: number;
      }>;
    };
    materials: {
      total: number;
      totalPaid: number;
      items: Array<{
        materialName: string;
        totalQuantity: number;
        totalAmount: number;
        supplierName: string;
        projectName: string;
      }>;
    };
    fundTransfers: {
      total: number;
      count: number;
      items: Array<{
        date: string;
        amount: number;
        senderName: string;
        transferType: string;
        projectName: string;
      }>;
    };
  };
}

export interface ProjectComprehensiveReportData {
  reportType: 'project-comprehensive';
  generatedAt: string;
  project: {
    id: string;
    name: string;
    location?: string;
    engineerName?: string;
    managerName?: string;
    budget?: number;
    startDate?: string;
    status?: string;
  };
  period: {
    from: string;
    to: string;
  };
  kpis: ReportKPI[];
  workforce: {
    totalWorkers: number;
    activeWorkers: number;
    workersByType: Array<{
      type: string;
      count: number;
      totalDays: number;
      totalWages: number;
    }>;
    topWorkers: Array<{
      name: string;
      type: string;
      totalDays: number;
      totalEarned: number;
      totalPaid: number;
      totalTransfers: number;
      totalSettled: number;
      rebalanceDelta: number;
      balance: number;
    }>;
  };
  wells: {
    totalWells: number;
    byStatus: Array<{
      status: string;
      count: number;
    }>;
    avgCompletionPercentage: number;
    totalDepth: number;
    totalPanels: number;
    totalBases: number;
    totalPipes: number;
    wellsList: Array<{
      wellNumber: number;
      ownerName: string;
      region: string;
      depth: number;
      panelCount: number;
      baseCount: number;
      pipeCount: number;
      status: string;
      completionPercentage: number;
      crewCount: number;
      totalCrewWages: number;
      transportCost: number;
      materialsCost: number;
      laborCost: number;
      serviceCost: number;
      totalExpenses: number;
      totalCost: number;
    }>;
  };
  attendance: {
    totalWorkDays: number;
    totalWages: number;
    totalPaid: number;
    dailySummary: Array<{
      date: string;
      workerCount: number;
      totalWorkDays: number;
      totalWages: number;
    }>;
  };
  expenses: {
    materials: {
      total: number;
      totalPaid: number;
      byCategory: Array<{
        category: string;
        total: number;
        count: number;
      }>;
    };
    transport: {
      total: number;
      tripCount: number;
    };
    miscExpenses: {
      total: number;
      count: number;
    };
    workerTransfers: {
      total: number;
      count: number;
    };
    supplierPayments?: {
      total: number;
      count: number;
      items?: Array<{
        supplierName: string;
        amount: number;
        paymentDate: string;
        paymentMethod: string;
        referenceNumber: string;
        notes: string;
      }>;
    };
  };
  cashCustody: {
    totalFundTransfersIn: number;
    totalProjectTransfersIn: number;
    totalProjectTransfersOut: number;
    totalExpenses: number;
    netBalance: number;
    fundTransferItems: Array<{
      date: string;
      amount: number;
      senderName: string;
      transferType: string;
    }>;
  };
  equipmentSummary: {
    totalEquipment: number;
    byStatus: Array<{
      status: string;
      count: number;
    }>;
    items: Array<{
      name: string;
      code: string;
      type: string;
      status: string;
      condition: string;
      quantity: number;
    }>;
  };
  totals: {
    totalIncome: number;
    totalExpenses: number;
    totalWages: number;
    totalMaterials: number;
    totalTransport: number;
    totalMisc: number;
    totalWorkerTransfers: number;
    totalSupplierPayments?: number;
    totalProjectTransfersOut?: number;
    totalProjectTransfersIn?: number;
    balance: number;
    budgetUtilization?: number;
  };
}

export interface ReportExportOptions {
  format: 'pdf' | 'xlsx';
  type: 'daily' | 'worker-statement' | 'period-final' | 'daily-range' | 'multi-project-final' | 'project-comprehensive';
  companyInfo?: {
    name: string;
    subtitle?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };
}
