import { useState, useEffect, useMemo, useCallback } from "react";
import SelectedProjectBadge from "@/components/selected-project-badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowRight, Save, Plus, Camera, Package, ChartGantt, Edit, Trash2, Users, CreditCard, DollarSign, TrendingUp, ShoppingCart, ChevronDown, ChevronUp, Building2, Calendar, FileSpreadsheet, ArrowRightLeft, Wrench, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { getCurrentDate, formatCurrency } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { MultiWellSelector } from "@/components/multi-well-selector";
import { CrewTypeSelector } from "@/components/crew-type-selector";
import { TeamSelector } from "@/components/team-selector";
import { API_ENDPOINTS } from "@/constants/api";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import { FinancialGuardDialog, type FinancialGuardData } from "@/components/financial-guard-dialog";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { exportMaterialPurchasesToExcel } from "@/components/ui/export-material-purchases-excel";
import type { Material, InsertMaterialPurchase, InsertMaterial, Supplier, InsertSupplier } from "@shared/schema";

export default function MaterialPurchase() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject, isAllProjects, getProjectIdForApi, isWellsProject } = useSelectedProject();
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ 
    paymentType: 'all', 
    category: 'all',
    dateRange: undefined,
    dateFrom: '',
    dateTo: '',
    specificDate: ''
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleFilterChange = useCallback((key: string, value: any) => {
    if (key === 'selectedDate') {
      setSelectedDate(value ? format(new Date(value), "yyyy-MM-dd") : "");
    } else {
      setFilterValues(prev => ({ ...prev, [key]: value }));
    }
  }, []);

  // Get URL parameters for editing
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  // Form states
  const [materialName, setMaterialName] = useState<string>("");
  const [materialCategory, setMaterialCategory] = useState<string>("");
  const [materialUnit, setMaterialUnit] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [paymentType, setPaymentType] = useState<string>("نقد");

  const isFreeStorage = paymentType === "مخزن";

  // Effect to handle zeroing prices when "مخزن" is selected
  useEffect(() => {
    if (isFreeStorage) {
      setUnitPrice("0");
    }
  }, [isFreeStorage]);
  const [supplierName, setSupplierName] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>(getCurrentDate());
  const [purchaseDate, setPurchaseDate] = useState<string>(getCurrentDate());
  const [notes, setNotes] = useState<string>("");
  const [invoicePhoto, setInvoicePhoto] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("0");
  const [remainingAmount, setRemainingAmount] = useState<string>("0");
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [addToInventory, setAddToInventory] = useState<boolean>(false);

  // حالة طي النموذج - مطوي افتراضياً
  const [isFormCollapsed, setIsFormCollapsed] = useState(true);

  // حالات نموذج إضافة المورد
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [supplierFormName, setSupplierFormName] = useState("");
  const [supplierFormContactPerson, setSupplierFormContactPerson] = useState("");
  const [supplierFormPhone, setSupplierFormPhone] = useState("");
  const [supplierFormAddress, setSupplierFormAddress] = useState("");
  const [supplierFormPaymentTerms, setSupplierFormPaymentTerms] = useState("نقد");
  const [supplierFormNotes, setSupplierFormNotes] = useState("");
  const [selectedWellIds, setSelectedWellIds] = useState<number[]>([]);
  const [selectedCrewTypes, setSelectedCrewTypes] = useState<string[]>([]);
  const [selectedTeamNames, setSelectedTeamNames] = useState<string[]>([]);
  const [showGuardPurchaseDialog, setShowGuardPurchaseDialog] = useState(false);
  const [guardPurchaseData, setGuardPurchaseData] = useState<FinancialGuardData | null>(null);
  const [guardEditPurchaseId, setGuardEditPurchaseId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('date') || "";
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    setSelectedDate(""); 
    setFilterValues({ 
      paymentType: 'all', 
      category: 'all',
      dateRange: undefined,
      dateFrom: '',
      dateTo: '',
      specificDate: '' 
    });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر وعرض كافة المشتريات",
    });
  }, [toast]);

  // إزالة التعيين التلقائي لتاريخ اليوم لجلب الكل افتراضياً
  useEffect(() => {
    // لا نفعل شيئاً هنا للسماح بجلب الكل افتراضياً
  }, []);

  // إزالة الزر العائم من صفحة المشتريات
  useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // دالة مساعدة لحفظ القيم في autocomplete_data
  const saveAutocompleteValue = async (category: string, value: string | null | undefined) => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { 
        category, 
        value: value.trim() 
      });
    } catch (error) {
      // تجاهل الأخطاء لأن هذه عملية مساعدة
    }
  };

  // دالة إعادة تعيين نموذج المورد
  const resetSupplierForm = () => {
    setSupplierFormName("");
    setSupplierFormContactPerson("");
    setSupplierFormPhone("");
    setSupplierFormAddress("");
    setSupplierFormPaymentTerms("نقد");
    setSupplierFormNotes("");
  };

  // إضافة مورد جديد
  const addSupplierMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      // حفظ القيم في autocomplete_data قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('supplier_name', supplierFormName),
        saveAutocompleteValue('supplier_contact_person', supplierFormContactPerson),
        saveAutocompleteValue('supplier_phone', supplierFormPhone),
        saveAutocompleteValue('supplier_address', supplierFormAddress),
        saveAutocompleteValue('supplier_payment_terms', supplierFormPaymentTerms)
      ]);

      return apiRequest("/api/suppliers", "POST", data);
    },
    onSuccess: (newSupplier) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
      toast({
        title: "تم إضافة المورد بنجاح",
        description: `تم إضافة المورد "${supplierFormName}" إلى قاعدة البيانات`,
      });

      // تحديد المورد الجديد في قائمة الاختيار
      setSupplierName(supplierFormName);

      // إغلاق النموذج وإعادة تعيين القيم
      setIsSupplierDialogOpen(false);
      resetSupplierForm();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إضافة المورد",
        description: error?.message || "حدث خطأ أثناء إضافة المورد. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    },
  });

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierFormName.trim()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال اسم المورد",
        variant: "destructive",
      });
      return;
    }

    const supplierData: InsertSupplier = {
      name: supplierFormName.trim(),
      contactPerson: supplierFormContactPerson.trim() || undefined,
      phone: supplierFormPhone.trim() || undefined,
      address: supplierFormAddress.trim() || undefined,
      paymentTerms: supplierFormPaymentTerms || undefined,
      notes: supplierFormNotes.trim() || undefined,
      is_active: true,
    };

    addSupplierMutation.mutate(supplierData);
  };

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: QUERY_KEYS.materials,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/materials", "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as Material[];
        }
        return Array.isArray(response) ? response as Material[] : [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 300000, // 5 دقائق
    gcTime: 600000, // 10 دقائق
    refetchOnWindowFocus: false,
    retry: false
  });

  // جلب بيانات الموردين من قاعدة البيانات
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: QUERY_KEYS.suppliers,
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suppliers", "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as Supplier[];
        }
        return Array.isArray(response) ? response as Supplier[] : [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 300000, // 5 دقائق
    gcTime: 600000, // 10 دقائق
    refetchOnWindowFocus: false,
    retry: false
  });

  // Fetch purchase data for editing
  const { data: purchaseToEdit, isLoading: isLoadingEdit } = useQuery({
    queryKey: QUERY_KEYS.materialPurchaseEdit(editId ?? ""),
    queryFn: async () => {
      if (!editId) return null;

      try {
        const response = await apiRequest(`/api/material-purchases/${editId}`, "GET");

        // معالجة الهيكل المتداخل للاستجابة
        let purchaseData = null;
        if (response && response.data) {
          purchaseData = response.data;
        } else if (response && response.id) {
          purchaseData = response;
        } else {
          return null;
        }

        return purchaseData;
      } catch (error) {
        return null;
      }
    },
    enabled: !!editId,
    retry: 1,
    staleTime: 0, // Always fetch fresh data for editing
  });

  // Effect to populate form when editing
  useEffect(() => {
    if (purchaseToEdit && editId) {

      // تشخيص مفصل لحقول المادة

      // استخدام البيانات المحفوظة في الجدول أولاً، ثم البيانات المرتبطة
      const materialName = purchaseToEdit.materialName || purchaseToEdit.material?.name || "";
      const materialCategory = purchaseToEdit.materialCategory || purchaseToEdit.material?.category || "";
      const materialUnit = purchaseToEdit.materialUnit || purchaseToEdit.unit || purchaseToEdit.material?.unit || "";

      setMaterialName(materialName);
      setMaterialCategory(materialCategory);
      setMaterialUnit(materialUnit);
      setQuantity(purchaseToEdit.quantity?.toString() || "");
      setUnitPrice(purchaseToEdit.unitPrice?.toString() || "");
      setPaymentType(purchaseToEdit.purchaseType || "نقد");
      setSupplierName(purchaseToEdit.supplierName || "");
      setInvoiceNumber(purchaseToEdit.invoiceNumber || "");
      setInvoiceDate(purchaseToEdit.invoiceDate || "");
      setPurchaseDate(purchaseToEdit.purchaseDate || "");
      setPaidAmount(purchaseToEdit.paidAmount?.toString() || "0");
      setRemainingAmount(purchaseToEdit.remainingAmount?.toString() || "0");
      setNotes(purchaseToEdit.notes || "");
      setInvoicePhoto(purchaseToEdit.invoicePhoto || "");
      setEditingPurchaseId(purchaseToEdit.id);
      setAddToInventory(purchaseToEdit.addToInventory || false);
      const wellIds = purchaseToEdit.well_ids ? JSON.parse(purchaseToEdit.well_ids) : (purchaseToEdit.well_id ? [Number(purchaseToEdit.well_id)] : []);
      setSelectedWellIds(wellIds);
      const crewTypes = purchaseToEdit.crew_type ? (purchaseToEdit.crew_type.startsWith('[') ? JSON.parse(purchaseToEdit.crew_type) : [purchaseToEdit.crew_type]) : [];
      setSelectedCrewTypes(crewTypes);

    }
  }, [purchaseToEdit, editId]);

  const addMaterialMutation = useMutation({
    mutationFn: (data: InsertMaterial) => apiRequest("/api/materials", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materials });
    },
    onError: (error: any) => {
      let errorMessage = "حدث خطأ أثناء إضافة المادة";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Get unique material names, categories, units, and suppliers
  const materialNames = Array.isArray(materials) ? materials.map(m => m.name) : [];
  const materialUnits = Array.isArray(materials) ? Array.from(new Set(materials.map(m => m.unit))) : [];

  const { data: purchaseListData = [] } = useQuery<any>({
    queryKey: QUERY_KEYS.materialPurchases(selectedProjectId, selectedDate),
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const response = await apiRequest(`/api/projects/${selectedProjectId}/material-purchases?date=${selectedDate}`, "GET");
      return response;
    },
    refetchOnWindowFocus: false,
    retry: false
  });

  const purchaseList = useMemo(() => {
    if (purchaseListData && purchaseListData.data && Array.isArray(purchaseListData.data)) {
      return purchaseListData.data;
    }
    return Array.isArray(purchaseListData) ? purchaseListData : [];
  }, [purchaseListData]);

  const materialCategories = useMemo(() => {
    const categoriesFromMaterials = Array.isArray(materials) ? materials.map(m => m.category) : [];
    const categoriesFromPurchases = Array.isArray(purchaseList) ? purchaseList.map(p => p.materialCategory) : [];
    // تنظيف الفئات من القيم الفارغة والمكررة
    const allCategories = Array.from(new Set([...categoriesFromMaterials, ...categoriesFromPurchases]))
      .filter(Boolean)
      .map(c => c.trim())
      .filter(c => c !== "");
    
    return allCategories;
  }, [materials, purchaseList]);

  // الموردين النشطين من قاعدة البيانات
  const activeSuppliers = Array.isArray(suppliers) ? suppliers.filter(supplier => supplier.is_active) : [];

  const addMaterialPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      // ✅ التأكد من وجود معرف المشروع قبل الإرسال
      if (!data.project_id || data.project_id === "all") {
        throw new Error("يرجى اختيار مشروع محدد أولاً قبل إضافة المشتريات");
      }

      // حفظ القيم في autocomplete_data قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('materialNames', materialName),
        saveAutocompleteValue('materialCategories', materialCategory),
        saveAutocompleteValue('materialUnits', materialUnit),
        saveAutocompleteValue('supplierNames', supplierName),
        saveAutocompleteValue('invoiceNumbers', invoiceNumber),
        saveAutocompleteValue('notes', notes)
      ]);

      // تنفيذ العملية الأساسية
      // تم تغيير المسار ليتوافق مع الخادم: /api/projects/:project_id/material-purchases
      return apiRequest(`/api/projects/${data.project_id}/material-purchases`, "POST", data);
    },
    onMutate: async (data) => {
      // فوري - تحديث البيانات محلياً قبل انتظار الخادم
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.materialPurchases(selectedProjectId, selectedDate) });
      const previousData = queryClient.getQueryData(QUERY_KEYS.materialPurchases(selectedProjectId, selectedDate));

      queryClient.setQueryData(QUERY_KEYS.materialPurchases(selectedProjectId, selectedDate), (old: any) => {
        const newPurchase = { id: `temp-${Date.now()}`, ...data, created_at: new Date().toISOString() };
        const safeOld = Array.isArray(old) ? old : (old && typeof old === 'object' && Array.isArray(old.data) ? old.data : []);
        return [...safeOld, newPurchase];
      });

      toast({
        title: "جاري الحفظ",
        description: "البيانات تحدثت فوراً",
      });

      return { previousData };
    },
    onSuccess: async (response: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      const wasAddedToInventory = response?.equipmentCreated;
      
      toast({
        title: "تم الحفظ",
        description: wasAddedToInventory 
          ? "تم حفظ المشتراة وإضافتها للمخزن (المعدات) بنجاح"
          : "تم حفظ شراء المواد بنجاح",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materialPurchases(selectedProjectId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
      
      if (wasAddedToInventory) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.equipment });
      }
    },
    onError: async (error: any) => {
      // حفظ القيم في autocomplete_data حتى في حالة الخطأ
      await Promise.all([
        saveAutocompleteValue('materialNames', materialName),
        saveAutocompleteValue('materialCategories', materialCategory),
        saveAutocompleteValue('materialUnits', materialUnit),
        saveAutocompleteValue('supplierNames', supplierName),
        saveAutocompleteValue('invoiceNumbers', invoiceNumber),
        saveAutocompleteValue('notes', notes)
      ]);

      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      if (error?.status === 422 && error?.responseData?.requiresConfirmation) {
        const rd = error.responseData;
        setGuardPurchaseData({
          type: rd.guardType === 'budget_overrun' ? 'overpaid_purchase' : 'large_amount',
          title: rd.title || 'تنبيه مالي',
          enteredAmount: rd.guardData?.totalAmount || 0,
          suggestions: rd.suggestions || [],
          details: rd.details || [],
          originalData: rd._originalBody || {},
        });
        setShowGuardPurchaseDialog(true);
        return;
      }

      let errorMessage = "حدث خطأ أثناء حفظ شراء المواد";
      let errorDetails: string[] = [];

      if (error?.response?.data) {
        const errorData = error.response.data;
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.details && Array.isArray(errorData.details)) {
          errorDetails = errorData.details;
        } else if (errorData.validationErrors && Array.isArray(errorData.validationErrors)) {
          errorDetails = errorData.validationErrors;
        }
      }

      let fullMessage = errorMessage;
      if (errorDetails.length > 0) {
        fullMessage = `${errorMessage}:\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`;
      } else if (error?.response?.data?.error) {
        fullMessage = `${errorMessage}: ${error.response.data.error}`;
      }

      toast({
        title: "خطأ في حفظ شراء المواد",
        description: fullMessage,
        variant: "destructive",
        duration: 10000, 
      });
    },
  });

  const resetForm = () => {
    setMaterialName("");
    setMaterialCategory("");
    setMaterialUnit("");
    setQuantity("");
    setUnitPrice("");
    setPaymentType("نقد");
    setSupplierName("");
    setInvoiceNumber("");
    setInvoiceDate(getCurrentDate());
    setPurchaseDate(getCurrentDate());
    setNotes("");
    setInvoicePhoto("");
    setEditingPurchaseId(null);
    setAddToInventory(false);
    setSelectedWellIds([]);
    setSelectedCrewTypes([]);
  };

  // Update Material Purchase Mutation
  const updateMaterialPurchaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {

      // حفظ القيم في autocomplete_data قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('materialNames', materialName),
        saveAutocompleteValue('materialCategories', materialCategory),
        saveAutocompleteValue('materialUnits', materialUnit),
        saveAutocompleteValue('supplierNames', supplierName),
        saveAutocompleteValue('invoiceNumbers', invoiceNumber),
        saveAutocompleteValue('notes', notes)
      ]);

      const response = await apiRequest(`/api/material-purchases/${id}`, "PATCH", data);
      return response;
    },
    onSuccess: async (response: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      const wasAddedToInventory = response?.equipmentCreated;
      if (wasAddedToInventory) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.equipment });
      }

      toast({
        title: wasAddedToInventory ? "تم التعديل والإضافة للمخزن" : "تم التعديل",
        description: wasAddedToInventory
          ? "تم تعديل المشتراة وإنشاء المعدة في المخزن تلقائياً"
          : "تم تعديل شراء المواد بنجاح",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materialPurchases(selectedProjectId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
    },
    onError: async (error: any, variables: any) => {
      await Promise.all([
        saveAutocompleteValue('materialNames', materialName),
        saveAutocompleteValue('materialCategories', materialCategory),
        saveAutocompleteValue('materialUnits', materialUnit),
        saveAutocompleteValue('supplierNames', supplierName),
        saveAutocompleteValue('invoiceNumbers', invoiceNumber),
        saveAutocompleteValue('notes', notes)
      ]);

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autocomplete });

      if (error?.status === 422 && error?.responseData?.requiresConfirmation) {
        const rd = error.responseData;
        setGuardEditPurchaseId(variables.id);
        setGuardPurchaseData({
          type: rd.guardType === 'budget_overrun' ? 'overpaid_purchase' : 'large_amount',
          title: rd.title || 'تنبيه مالي',
          enteredAmount: rd.guardData?.totalAmount || 0,
          suggestions: rd.suggestions || [],
          details: rd.details || [],
          originalData: rd._originalBody || variables.data || {},
        });
        setShowGuardPurchaseDialog(true);
        return;
      }

      let errorMessage = "حدث خطأ أثناء تحديث شراء المواد";
      let errorDetails: string[] = [];

      if (error?.response?.data) {
        const errorData = error.response.data;

        if (errorData.message) {
          errorMessage = errorData.message;
        }

        if (errorData.details && Array.isArray(errorData.details)) {
          errorDetails = errorData.details;
        } else if (errorData.validationErrors && Array.isArray(errorData.validationErrors)) {
          errorDetails = errorData.validationErrors;
        }
      }

      const fullMessage = errorDetails.length > 0 
        ? `${errorMessage}\n\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`
        : errorMessage;

      toast({
        title: "خطأ في تحديث شراء المواد",
        description: fullMessage,
        variant: "destructive",
        duration: 8000,
      });
      // لا تقم بإعادة تعيين النموذج عند حدوث خطأ
    }
  });

  // Delete Material Purchase Mutation
  const deleteMaterialPurchaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/material-purchases/${id}`, "DELETE"),
    onMutate: async (id) => {
      // فوري - حذف البيانات محلياً قبل انتظار الخادم
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.materialPurchases(selectedProjectId, selectedDate) });
      const previousData = queryClient.getQueryData(QUERY_KEYS.materialPurchases(selectedProjectId, selectedDate));

      queryClient.setQueryData(QUERY_KEYS.materialPurchases(selectedProjectId, selectedDate), (old: any) => {
        return old ? old.filter((p: any) => p.id !== id) : [];
      });

      toast({
        title: "جاري الحذف",
        description: "تم حذف السجل من الواجهة",
      });

      return { previousData };
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف شراء المواد بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materialPurchases(selectedProjectId, selectedDate) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectsWithStats });
    },
    onError: (error: any) => {
      let errorMessage = "حدث خطأ أثناء حذف شراء المواد";
      let errorDetails: string[] = [];

      if (error?.response?.data) {
        const errorData = error.response.data;

        if (errorData.message) {
          errorMessage = errorData.message;
        }

        if (errorData.details && Array.isArray(errorData.details)) {
          errorDetails = errorData.details;
        }
      }

      const fullMessage = errorDetails.length > 0 
        ? `${errorMessage}\n\n${errorDetails.map(detail => `• ${detail}`).join('\n')}`
        : errorMessage;

      toast({
        title: "خطأ في حذف شراء المواد",
        description: fullMessage,
        variant: "destructive",
        duration: 6000,
      });
    }
  });

  const calculateTotal = () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    return Math.round(qty * price).toString();
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setInvoicePhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (saveAndAddAnother = false) => {
    // التحقق من البيانات المطلوبة - نسمح بسعر 0 في حالة "مخزن"
    const isPriceRequired = paymentType !== "مخزن";
    
    if (!selectedProjectId || !materialName || !materialCategory?.trim() || !materialUnit || !quantity || (isPriceRequired && !unitPrice)) {
      toast({
        title: "خطأ",
        description: !materialCategory?.trim() ? "يرجى تحديد فئة المادة" : "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const totalAmountValue = calculateTotal();
    const totalAmount = parseFloat(totalAmountValue);
    
    const purchaseData = {
      project_id: selectedProjectId,
      materialName: materialName.trim(),
      materialCategory: materialCategory?.trim() || null,
      materialUnit: materialUnit.trim(),
      quantity: quantity.toString(),
      unitPrice: (isPriceRequired ? unitPrice : (unitPrice || "0")).toString(),
      totalAmount: (isPriceRequired ? totalAmountValue : (totalAmountValue || "0")).toString(),
      purchaseType: paymentType.trim(),
      paidAmount: paymentType.trim() === 'نقد' ? (totalAmountValue.toString() || "0") : "0",
      remainingAmount: (paymentType.trim() === 'آجل' || paymentType.trim() === 'توريد') ? (totalAmountValue.toString() || "0") : "0",
      supplierName: supplierName?.trim() || '',
      invoiceNumber: invoiceNumber?.trim() || '',
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
      notes: notes?.trim() || '',
      well_id: selectedWellIds[0] || null,
      well_ids: selectedWellIds.length > 0 ? JSON.stringify(selectedWellIds) : null,
      crew_type: selectedCrewTypes.length > 0 ? JSON.stringify(selectedCrewTypes) : null,
      team_name: selectedTeamNames.length > 0 ? JSON.stringify(selectedTeamNames) : null,
      invoicePhoto: invoicePhoto || '',
      addToInventory: addToInventory,
      status: 'completed'
    };

    if (editingPurchaseId) {
      updateMaterialPurchaseMutation.mutate({
        id: editingPurchaseId,
        data: purchaseData
      });
    } else {
      addMaterialPurchaseMutation.mutate(purchaseData);
    }

    if (!saveAndAddAnother && !editingPurchaseId) {
      setLocation("/daily-expenses");
    }
  };

  // Fetch Material Purchases - جلب جميع المشتريات مع تحسين الكاش
  const { data: allMaterialPurchases = [], isLoading: materialPurchasesLoading, refetch: refetchMaterialPurchases } = useQuery<any[]>({
    queryKey: QUERY_KEYS.materialPurchasesFiltered(getProjectIdForApi() ?? 'all', selectedDate),
    queryFn: async () => {
      const project_idForApi = getProjectIdForApi();
      const baseUrl = `/api/material-purchases`;
      
      const queryParams = new URLSearchParams();
      // إذا كان project_id هو 'all'، لا نرسله كمعامل project_id للخادم بل نتركه ليجلب الكل
      if (project_idForApi && project_idForApi !== 'all') {
        queryParams.append('project_id', project_idForApi);
      }
      
      // نرسل التاريخ فقط إذا كان محدداً، وإلا سيجلب السيرفر الكل
      if (selectedDate && selectedDate !== "") {
        queryParams.append('date', selectedDate);
      }
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `${baseUrl}?${queryString}` : baseUrl;
      
      const response = await apiRequest(endpoint, "GET");
      
      // توحيد شكل البيانات المسترجعة
      const data = response.data || response;
      return Array.isArray(data) ? data : [];
    },
    enabled: true,
    staleTime: 0, 
  });

  // استخدام البيانات المجلوبة بدلاً من تعريف useQuery مكرر
  const purchases = allMaterialPurchases;
  const isLoadingPurchases = materialPurchasesLoading;
  const refetchPurchases = refetchMaterialPurchases;

  // Filter purchases - عرض جميع المشتريات افتراضياً
  const filteredPurchases = useMemo(() => {
    return allMaterialPurchases.filter((purchase: any) => {
      // فلترة حسب المشروع المحدد - استخدام isAllProjects
      const matchesProject = isAllProjects || 
        !selectedProjectId || 
        purchase.project_id === selectedProjectId;

      const matchesSearch = searchValue === '' || 
        purchase.materialName?.toLowerCase().includes(searchValue.toLowerCase()) ||
        purchase.supplierName?.toLowerCase().includes(searchValue.toLowerCase()) ||
        purchase.notes?.toLowerCase().includes(searchValue.toLowerCase()) ||
        purchase.materialCategory?.toLowerCase().includes(searchValue.toLowerCase());

      const matchesPaymentType = filterValues.paymentType === 'all' || 
        purchase.purchaseType === filterValues.paymentType;

      const matchesCategory = !filterValues.category || filterValues.category === 'all' ||
        purchase.materialCategory === filterValues.category;

      // فلترة حسب التاريخ المختار من القائمة العلوية (إذا لم يكن "all")
      // ملاحظة: قمنا بإضافة المعامل للسيرفر، ولكن هنا نضمن الفلترة في الواجهة أيضاً
      const matchesSelectedDate = !selectedDate || purchase.purchaseDate === selectedDate;

      // فلترة حسب نطاق التاريخ من الفلتر المتقدم
      let matchesDateRange = true;
      if (filterValues.dateRange?.from || filterValues.dateRange?.to) {
        const purchaseDate = new Date(purchase.purchaseDate);
        if (filterValues.dateRange.from) {
          const fromDate = new Date(filterValues.dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          matchesDateRange = matchesDateRange && purchaseDate >= fromDate;
        }
        if (filterValues.dateRange.to) {
          const toDate = new Date(filterValues.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          matchesDateRange = matchesDateRange && purchaseDate <= toDate;
        }
      }

      let matchesSpecificDate = true;
      if (filterValues.specificDate) {
        const pDate = new Date(purchase.purchaseDate);
        const sDate = new Date(filterValues.specificDate);
        matchesSpecificDate = pDate.getFullYear() === sDate.getFullYear() &&
                             pDate.getMonth() === sDate.getMonth() &&
                             pDate.getDate() === sDate.getDate();
      }

      return matchesProject && matchesSearch && matchesPaymentType && matchesCategory && matchesDateRange && matchesSelectedDate && matchesSpecificDate;
    });
  }, [allMaterialPurchases, selectedProjectId, isAllProjects, searchValue, filterValues.paymentType, filterValues.category, filterValues.dateRange, filterValues.specificDate, selectedDate]);

  // Calculate stats - تستثني النوع غير المالي من حسابات المبالغ
  const NON_FIN = ['صرف مخزن', 'نقل مواد مستهلكة', 'نقل أصل'];
  const stats = useMemo(() => {
    const financialOnly = allMaterialPurchases.filter((p: any) => !NON_FIN.includes(p.purchaseType));
    const totalValueFinancial = financialOnly.reduce((sum: number, p: any) => sum + parseFloat(p.totalAmount || '0'), 0);
    return {
      total: allMaterialPurchases.length,
      cash: allMaterialPurchases.filter((p: any) => p.purchaseType === 'نقد').length,
      credit: allMaterialPurchases.filter((p: any) => p.purchaseType?.includes('آجل') || p.purchaseType?.includes('جل')).length,
      supply: allMaterialPurchases.filter((p: any) => p.purchaseType === 'توريد').length,
      transferConsumable: allMaterialPurchases.filter((p: any) => p.purchaseType === 'نقل مواد مستهلكة').length,
      transferAsset: allMaterialPurchases.filter((p: any) => p.purchaseType === 'نقل أصل').length,
      issueFromStock: allMaterialPurchases.filter((p: any) => p.purchaseType === 'صرف مخزن').length,
      totalValue: totalValueFinancial,
      avgValue: financialOnly.length > 0 ? totalValueFinancial / financialOnly.length : 0,
    };
  }, [allMaterialPurchases]);

  // فلترة المشتريات حسب المشروع المحدد، البحث، ونوع الدفع، والتاريخ
  // THIS IS THE LINE THAT WAS REMOVED: const materialPurchases = filteredPurchases;

  // دالة التحديث
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchMaterialPurchases();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchMaterialPurchases]);

  // Auto-refresh when page loads or project changes - محسّن
  useEffect(() => {
    if ((isAllProjects || selectedProjectId) && !allMaterialPurchases.length) {
      refetchMaterialPurchases();
    }
  }, [selectedProjectId, isAllProjects, refetchMaterialPurchases, allMaterialPurchases.length]);

  // Edit Function
  const handleEdit = (purchase: any) => {
    setMaterialName(purchase.materialName || purchase.material?.name || "");
    setMaterialCategory(purchase.materialCategory || purchase.material?.category || "");
    setMaterialUnit(purchase.materialUnit || purchase.material?.unit || purchase.unit || "");
    setQuantity(purchase.quantity);
    setUnitPrice(purchase.unitPrice);
    setPaymentType(purchase.purchaseType || purchase.paymentType || "نقد");
    setSupplierName(purchase.supplierName || "");
    setInvoiceNumber(purchase.invoiceNumber || "");
    setInvoiceDate(purchase.invoiceDate || "");
    setPurchaseDate(purchase.purchaseDate || "");
    setNotes(purchase.notes || "");
    setInvoicePhoto(purchase.invoicePhoto || "");
    setEditingPurchaseId(purchase.id);
    setAddToInventory(purchase.addToInventory || false);
    const wellIds = purchase.well_ids ? JSON.parse(purchase.well_ids) : (purchase.well_id ? [Number(purchase.well_id)] : []);
    setSelectedWellIds(wellIds);
    const crewTypes = purchase.crew_type ? (purchase.crew_type.startsWith('[') ? JSON.parse(purchase.crew_type) : [purchase.crew_type]) : [];
    setSelectedCrewTypes(crewTypes);
    setIsFormCollapsed(false);
  };

  // Helper function to format date for display in UnifiedCard footer
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      // Adjusting to ensure correct locale date string, e.g., 'en-GB' for DD/MM/YYYY
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (error) {
      return dateString; // Fallback to original string if parsing fails
    }
  };

  // Helper function to delete a purchase
  const handleDelete = (id: string) => {
    // Optionally show a confirmation dialog here
    if (window.confirm("هل أنت متأكد أنك تريد حذف هذا السجل؟")) {
      deleteMaterialPurchaseMutation.mutate(id);
    }
  };

  // تكوين صفوف الإحصائيات الموحدة - شبكة 3×2
  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'total',
          label: 'إجمالي المشتريات',
          value: stats.total,
          icon: Package,
          color: 'blue',
        },
        {
          key: 'cash',
          label: 'مشتريات نقد',
          value: stats.cash,
          icon: DollarSign,
          color: 'green',
        },
        {
          key: 'credit',
          label: 'مشتريات آجلة',
          value: stats.credit,
          icon: CreditCard,
          color: 'orange',
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'supply',
          label: 'توريدات',
          value: stats.supply,
          icon: ShoppingCart,
          color: 'purple',
        },
        {
          key: 'totalValue',
          label: 'إجمالي القيمة (المالية فقط)',
          value: formatCurrency(stats.totalValue),
          icon: TrendingUp,
          color: 'teal',
        },
        {
          key: 'avgValue',
          label: 'متوسط الشراء',
          value: formatCurrency(stats.avgValue),
          icon: ChartGantt,
          color: 'indigo',
        },
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'transferConsumable',
          label: 'مواد منقولة من مشاريع',
          value: stats.transferConsumable,
          icon: ArrowRightLeft,
          color: 'yellow',
        },
        {
          key: 'transferAsset',
          label: 'أصول منقولة من مشاريع',
          value: stats.transferAsset,
          icon: Wrench,
          color: 'orange',
        },
        {
          key: 'issueFromStock',
          label: 'صرف من المخزن',
          value: stats.issueFromStock,
          icon: ArrowUpFromLine,
          color: 'blue',
        },
      ]
    }
  ], [stats]);

  // تكوين الفلاتر
  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'selectedDate',
      label: 'التاريخ',
      type: 'date',
      placeholder: 'جميع التواريخ',
    },
    {
      key: 'category',
      label: 'الفئة',
      type: 'select',
      placeholder: 'جميع الفئات',
      options: [
        { value: 'all', label: 'جميع الفئات' },
        ...(materialCategories || []).map(cat => ({ value: cat, label: cat }))
      ],
    },
    {
      key: 'paymentType',
      label: 'نوع الدفع',
      type: 'select',
      placeholder: 'اختر نوع الدفع',
      options: [
        { value: 'all', label: 'جميع الأنواع' },
        { value: 'نقد', label: 'نقد' },
        { value: 'آجل', label: 'آجل' },
        { value: 'توريد', label: 'توريد' },
        { value: 'صرف مخزن', label: 'صرف من المخزن' },
        { value: 'نقل مواد مستهلكة', label: 'نقل مواد بين مشاريع' },
        { value: 'نقل أصل', label: 'نقل أصل بين مشاريع' },
      ],
    },
    {
      key: 'dateRange',
      label: 'نطاق التاريخ',
      type: 'date-range',
      placeholder: 'اختر نطاق التاريخ',
    },
    {
      key: 'specificDate',
      label: 'تاريخ يوم محدد',
      type: 'date',
      placeholder: 'تاريخ يوم محدد',
    },
  ], [materialCategories]);

  // Export to Excel function
  const handleExportExcel = useCallback(async () => {
    if (filteredPurchases.length === 0) {
      toast({
        title: "لا توجد بيانات",
        description: "لا توجد مشتريات لتصديرها بناءً على الفلاتر الحالية",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const downloadResult = await exportMaterialPurchasesToExcel(filteredPurchases);
      if (downloadResult) {
        toast({
          title: "تم التصدير بنجاح",
          description: `تم تصدير ${filteredPurchases.length} سجل إلى ملف Excel`,
        });
      } else {
        toast({ title: "تعذر التنزيل", description: "تم تجهيز الملف لكن فشل التنزيل. حاول مرة أخرى.", variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء محاولة تصدير البيانات",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [filteredPurchases, toast]);

  // تكوين الأزرار الإضافية - زر التصدير
  const actions = useMemo(() => [
    {
      key: 'export',
      label: isExporting ? 'جاري التصدير...' : 'تصدير إكسل',
      icon: FileSpreadsheet,
      onClick: handleExportExcel,
      variant: 'outline' as const,
      disabled: isExporting || filteredPurchases.length === 0,
    }
  ], [handleExportExcel, isExporting, filteredPurchases.length]);

  return (
    <div className="p-4 slide-in space-y-4">
      <SelectedProjectBadge />
      {/* لوحة الإحصائيات والفلترة الموحدة - شبكة 3×2 */}
      <UnifiedFilterDashboard
        hideHeader={true}
        title=""
        statsRows={statsRowsConfig}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="ابحث عن مادة أو مورد..."
        showSearch={true}
        filters={filtersConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={actions}
      />

      {/* مؤشر التحميل لبيانات التعديل */}
      {isLoadingEdit && editId && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-blue-700">جاري تحميل بيانات المشترية للتعديل...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Form */}
      <Collapsible open={!isFormCollapsed} onOpenChange={(open) => setIsFormCollapsed(!open)}>
        <Card className="mb-4">
          <CardContent className={isFormCollapsed ? "p-2" : "p-4"}>
            <CollapsibleTrigger asChild>
              <div className={`flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg transition-colors ${isFormCollapsed ? "p-2 -m-2" : "p-2 -m-2 mb-2"}`}>
                <h3 className={`font-semibold text-foreground flex items-center gap-2 ${isFormCollapsed ? "text-base" : "text-lg"}`}>
                  <Package className={isFormCollapsed ? "h-4 w-4 text-primary" : "h-5 w-5 text-primary"} />
                  {editingPurchaseId ? "تعديل مشترية" : "إضافة مشترية جديدة"}
                </h3>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isFormCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pt-2">
                {/* Material Name */}
                <div>
                  <Label className="block text-sm font-medium text-foreground">اسم المادة</Label>
              <AutocompleteInput
                value={materialName}
                onChange={setMaterialName}
                category="materialNames"
                placeholder="اختر أو أدخل اسم المادة..."
              />
            </div>

            {/* Material Category */}
            <div>
              <Label className="block text-sm font-medium text-foreground">فئة المادة</Label>
              <AutocompleteInput
                value={materialCategory}
                onChange={setMaterialCategory}
                category="materialCategories"
                placeholder="اختر أو أدخل فئة المادة..."
              />
            </div>

            {/* Material Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="block text-sm font-medium text-foreground">الكمية</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className="text-center arabic-numbers"
                  autoWidth
                  maxWidth={150}
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-foreground">الوحدة</Label>
                <AutocompleteInput
                  value={materialUnit}
                  onChange={setMaterialUnit}
                  category="materialUnits"
                  placeholder="طن، كيس، م³..."
                />
              </div>
            </div>

            {/* Price and Total */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="block text-sm font-medium text-foreground">سعر الوحدة</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                  disabled={isFreeStorage}
                  className={`text-center arabic-numbers ${isFreeStorage ? "cursor-not-allowed opacity-50 bg-muted" : ""}`}
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-foreground">المبلغ الإجمالي</Label>
                <Input
                  type="number"
                  value={calculateTotal()}
                  readOnly
                  disabled={isFreeStorage}
                  className={`text-center arabic-numbers ${isFreeStorage ? "bg-muted cursor-not-allowed" : "bg-muted"}`}
                />
              </div>
            </div>

            {/* Payment Type */}
            <div>
              <Label className="block text-sm font-medium text-foreground">نوع التوريد</Label>
              <RadioGroup value={paymentType} onValueChange={setPaymentType} className="flex gap-4">
                <div className="flex items-center space-x-reverse space-x-2">
                  <RadioGroupItem value="نقد" id="cash" />
                  <Label htmlFor="cash" className="text-sm">نقد</Label>
                </div>
                <div className="flex items-center space-x-reverse space-x-2">
                  <RadioGroupItem value="آجل" id="credit" />
                  <Label htmlFor="credit" className="text-sm">آجل</Label>
                </div>
                <div className="flex items-center space-x-reverse space-x-2">
                  <RadioGroupItem value="مخزن" id="storage" />
                  <Label htmlFor="storage" className="text-sm">مخزن</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Add to Inventory Checkbox */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Checkbox
                id="addToInventory"
                checked={addToInventory}
                onCheckedChange={(checked) => setAddToInventory(checked === true)}
                data-testid="checkbox-add-to-inventory"
              />
              <Label htmlFor="addToInventory" className="text-sm font-medium text-blue-700 dark:text-blue-300 cursor-pointer flex items-center gap-2">
                <Package className="h-4 w-4" />
                إضافة للمخزن (المعدات)
              </Label>
            </div>

            {isWellsProject && (
              <div className="grid grid-cols-3 gap-2">
                <MultiWellSelector
                  project_id={selectedProjectId}
                  value={selectedWellIds}
                  onChange={setSelectedWellIds}
                  optional={true}
                />
                <TeamSelector
                  project_id={selectedProjectId}
                  value={selectedTeamNames}
                  onChange={setSelectedTeamNames}
                />
                <CrewTypeSelector
                  value={selectedCrewTypes}
                  onChange={setSelectedCrewTypes}
                />
              </div>
            )}

            {/* Supplier/Store */}
            <div>
              <Label className="block text-sm font-medium text-foreground">اسم المورد/المحل</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  value={supplierName}
                  onValueChange={setSupplierName}
                  options={activeSuppliers.map((supplier) => ({
                    value: supplier.name,
                    label: supplier.name,
                    description: supplier.contactPerson || undefined
                  }))}
                  placeholder="اختر المورد..."
                  searchPlaceholder="ابحث عن مورد..."
                  emptyText="لا توجد موردين مسجلين"
                  className="flex-1"
                />
                <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="إضافة مورد جديد"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>إضافة مورد جديد</DialogTitle>
                      <DialogDescription>
                        أدخل معلومات المورد الجديد. جميع الحقول اختيارية عدا اسم المورد.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSupplier} className="form-grid">
                      <div className="form-field form-field-full">
                        <Label htmlFor="supplier-name">اسم المورد/المحل *</Label>
                        <Input
                          id="supplier-name"
                          value={supplierFormName}
                          onChange={(e) => setSupplierFormName(e.target.value)}
                          placeholder="مثال: مؤسسة الخضراء للمواد"
                          required
                        />
                      </div>

                      <div className="form-field">
                        <Label htmlFor="supplier-contact">الشخص المسؤول</Label>
                        <Input
                          id="supplier-contact"
                          value={supplierFormContactPerson}
                          onChange={(e) => setSupplierFormContactPerson(e.target.value)}
                          placeholder="مثال: أحمد محمد"
                        />
                      </div>

                      <div className="form-field">
                        <Label htmlFor="supplier-phone">رقم الهاتف</Label>
                        <Input
                          id="supplier-phone"
                          value={supplierFormPhone}
                          onChange={(e) => setSupplierFormPhone(e.target.value)}
                          placeholder="مثال: 777123456"
                          type="tel"
                        />
                      </div>

                      <div className="form-field form-field-full">
                        <Label htmlFor="supplier-address">العنوان</Label>
                        <Input
                          id="supplier-address"
                          value={supplierFormAddress}
                          onChange={(e) => setSupplierFormAddress(e.target.value)}
                          placeholder="مثال: شارع الستين، صنعاء"
                        />
                      </div>

                      <div className="form-field">
                        <Label htmlFor="supplier-payment">شروط الدفع</Label>
                        <Select value={supplierFormPaymentTerms} onValueChange={setSupplierFormPaymentTerms}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر شروط الدفع" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="نقد">نقد</SelectItem>
                            <SelectItem value="أجل">أجل</SelectItem>
                            <SelectItem value="نقد وأجل">نقد وأجل</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="form-field form-field-full">
                        <Label htmlFor="supplier-notes">ملاحظات</Label>
                        <Textarea
                          id="supplier-notes"
                          value={supplierFormNotes}
                          onChange={(e) => setSupplierFormNotes(e.target.value)}
                          placeholder="أي ملاحظات إضافية..."
                          autoHeight
                          minRows={3}
                          maxRows={6}
                        />
                      </div>

                      <div className="form-actions">
                        <Button
                          type="submit"
                          disabled={addSupplierMutation.isPending || !supplierFormName.trim()}
                        >
                          {addSupplierMutation.isPending ? "جاري الإضافة..." : "إضافة المورد"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsSupplierDialogOpen(false);
                            resetSupplierForm();
                          }}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              {activeSuppliers.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  لا توجد موردين مسجلين. اضغط + لإضافة مورد جديد
                </p>
              )}
            </div>

            {/* Purchase Date */}
            <DatePickerField
              label="تاريخ الشراء"
              value={purchaseDate}
              onChange={(date) => setPurchaseDate(date ? format(date, "yyyy-MM-dd") : "")}
            />

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="block text-sm font-medium text-foreground">رقم الفاتورة</Label>
                <AutocompleteInput
                  type="number"
                  inputMode="numeric"
                  value={invoiceNumber}
                  onChange={setInvoiceNumber}
                  category="invoiceNumbers"
                  placeholder="رقم الفاتورة"
                  className="arabic-numbers"
                />
              </div>
              <DatePickerField
                label="تاريخ الفاتورة"
                value={invoiceDate}
                onChange={(date) => setInvoiceDate(date ? format(date, "yyyy-MM-dd") : "")}
              />
            </div>

            {/* Invoice Photo Upload */}
            <div>
              <Label className="block text-sm font-medium text-foreground">صورة الفاتورة</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                {invoicePhoto ? (
                  <div className="space-y-2">
                    <img 
                      src={invoicePhoto} 
                      alt="Invoice" 
                      className="max-w-full max-h-32 mx-auto rounded"
                    />
                    <p className="text-sm text-success">تم رفع الصورة بنجاح</p>
                  </div>
                ) : (
                  <>
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">اضغط لإضافة صورة الفاتورة</p>
                  </>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="invoice-photo"
                />
                <Label
                  htmlFor="invoice-photo"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg cursor-pointer hover:bg-primary/90 transition-colors inline-block"
                >
                  {invoicePhoto ? "تغيير الصورة" : "اختر صورة"}
                </Label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="block text-sm font-medium text-foreground">ملاحظات</Label>
              <AutocompleteInput
                value={notes}
                onChange={setNotes}
                category="notes"
                placeholder="أي ملاحظات إضافية..."
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => handleSave(false)}
                disabled={addMaterialPurchaseMutation.isPending || updateMaterialPurchaseMutation.isPending}
                className="w-full bg-success hover:bg-success/90 text-success-foreground"
              >
                <Save className="ml-2 h-4 w-4" />
                {(addMaterialPurchaseMutation.isPending || updateMaterialPurchaseMutation.isPending) 
                  ? "جاري الحفظ..." 
                  : editingPurchaseId 
                    ? "تحديث الشراء" 
                    : "حفظ الشراء"}
              </Button>

              {!editingPurchaseId && (
                <Button
                  onClick={() => handleSave(true)}
                  disabled={addMaterialPurchaseMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="ml-2 h-4 w-4" />
                  حفظ وإضافة آخر
                </Button>
              )}

              {editingPurchaseId && (
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="w-full"
                >
                  إلغاء التحرير
                </Button>
              )}
            </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>

      {/* قائمة المشتريات - عرض جميع البطاقات افتراضياً */}
      {materialPurchasesLoading && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="text-center text-muted-foreground">جاري تحميل المشتريات...</div>
          </CardContent>
        </Card>
      )}

      {/* رسالة عدم وجود مشتريات */}
      {!materialPurchasesLoading && filteredPurchases.length === 0 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-lg font-medium">لا توجد مشتريات</h3>
              <p className="text-sm">
                {allMaterialPurchases.length > 0 
                  ? "لا توجد نتائج مطابقة للبحث أو الفلتر المحدد" 
                  : "لم يتم تسجيل أي مشتريات بعد"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* عرض جميع البطاقات باستخدام UnifiedCard */}
      {filteredPurchases.length > 0 && (
        <div className="mt-4">
          <UnifiedCardGrid columns={3}>
            {filteredPurchases.map((purchase) => {
              // تحديد لون الشريط حسب نوع الدفع
              const purchaseType = purchase.purchaseType || 'نقد';
              const isCash = purchaseType === 'نقد';
              const isCredit = purchaseType === 'آجل' || purchaseType === 'أجل';
              const isStorage = purchaseType === 'مخزن' || purchaseType === 'توريد' || purchaseType === 'مخزني';
              const isTransferConsumable = purchaseType === 'نقل مواد مستهلكة';
              const isTransferAsset = purchaseType === 'نقل أصل';
              const isIssueFromStock = purchaseType === 'صرف مخزن';
              const isNonFinancial = isTransferConsumable || isTransferAsset || isIssueFromStock;

              const headerColor = isCash ? '#22c55e'
                : isCredit ? '#f97316'
                : isStorage ? '#3b82f6'
                : isTransferConsumable ? '#eab308'
                : isTransferAsset ? '#a855f7'
                : isIssueFromStock ? '#0ea5e9'
                : '#6366f1';

              const cardIcon = isTransferConsumable ? ArrowRightLeft
                : isTransferAsset ? Wrench
                : isIssueFromStock ? ArrowUpFromLine
                : ShoppingCart;

              return (
                <UnifiedCard
                  key={purchase.id}
                  title={purchase.materialName || 'مادة غير محددة'}
                  subtitle={formatDate(purchase.purchaseDate)}
                  titleIcon={cardIcon}
                  headerColor={headerColor}
                  badges={[
                    {
                      label: purchaseType,
                      variant: (isCash ? 'success' : isCredit ? 'warning' : isStorage ? 'default' : isNonFinancial ? 'secondary' : 'default') as "success" | "warning" | "default" | "secondary",
                    },
                    ...(isNonFinancial ? [{
                      label: 'توثيق فقط (لا أثر مالي)',
                      variant: 'outline' as "outline",
                    }] : []),
                  ]}
                  fields={[
                    ...(isAllProjects || !selectedProjectId ? [{
                      label: "المشروع",
                      value: purchase.projectName || purchase.project?.name || 'غير محدد',
                      icon: Building2,
                      color: "info" as const,
                    }] : []),
                    {
                      label: "المورد",
                      value: purchase.supplierName || 'غير محدد',
                      icon: Users,
                      color: "default",
                    },
                    {
                      label: "الكمية",
                      value: `${purchase.quantity} ${purchase.materialUnit || purchase.unit}`,
                      icon: Package,
                      color: "warning",
                      emphasis: true,
                    },
                    {
                      label: "سعر الوحدة",
                      value: formatCurrency(purchase.unitPrice),
                      icon: DollarSign,
                      color: "default",
                    },
                    {
                      label: "الإجمالي",
                      value: formatCurrency(purchase.totalAmount),
                      icon: DollarSign,
                      color: isCash ? 'success' : isCredit ? 'warning' : isStorage ? 'info' : 'default',
                      emphasis: true,
                    },
                    {
                      label: "التاريخ",
                      value: formatDate(purchase.purchaseDate),
                      icon: Calendar,
                      color: "muted",
                    },
                  ]}
                  actions={[
                    {
                      icon: Edit,
                      label: "تعديل",
                      onClick: () => handleEdit(purchase),
                      color: "blue",
                    },
                    {
                      icon: Trash2,
                      label: "حذف",
                      onClick: () => handleDelete(purchase.id),
                      color: "red",
                    },
                  ]}
                  compact
                />
              );
            })}
          </UnifiedCardGrid>
        </div>
      )}
      <FinancialGuardDialog
        open={showGuardPurchaseDialog}
        onClose={() => {
          setShowGuardPurchaseDialog(false);
          setGuardPurchaseData(null);
          setGuardEditPurchaseId(null);
        }}
        data={guardPurchaseData}
        onConfirm={({ adjustedAmount, guardNote }) => {
          setShowGuardPurchaseDialog(false);
          const origData = guardPurchaseData?.originalData || {};
          const editId = guardEditPurchaseId;
          setGuardPurchaseData(null);
          setGuardEditPurchaseId(null);
          if (editId) {
            updateMaterialPurchaseMutation.mutate({
              id: editId,
              data: {
                ...origData,
                totalAmount: adjustedAmount,
                notes: guardNote || origData.notes || '',
                confirmGuard: true,
                guardNote,
              },
            });
          } else {
            addMaterialPurchaseMutation.mutate({
              ...origData,
              totalAmount: adjustedAmount,
              notes: guardNote || origData.notes || '',
              confirmGuard: true,
              guardNote,
            });
          }
        }}
      />
    </div>
  );
}