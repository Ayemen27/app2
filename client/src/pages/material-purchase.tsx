import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowRight, Save, Plus, Camera, Package, ChartGantt, Edit, Trash2, Users, CreditCard, DollarSign, TrendingUp, ShoppingCart, ChevronDown, ChevronUp, Building2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { WellSelector } from "@/components/well-selector";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import type { Material, InsertMaterialPurchase, InsertMaterial, Supplier, InsertSupplier } from "@shared/schema";

export default function MaterialPurchase() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject, isAllProjects, getProjectIdForApi } = useSelectedProject();
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ paymentType: 'all', dateRange: undefined });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form states - Moved up before handleResetFilters
  const [materialName, setMaterialName] = useState<string>("");
  const [materialCategory, setMaterialCategory] = useState<string>("");
  const [materialUnit, setMaterialUnit] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [paymentType, setPaymentType] = useState<string>("نقد");
  const [supplierName, setSupplierName] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>(getCurrentDate());
  const [purchaseDate, setPurchaseDate] = useState<string>(getCurrentDate());
  const [notes, setNotes] = useState<string>("");
  const [invoicePhoto, setInvoicePhoto] = useState<string>("");
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);

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
  const [selectedWellId, setSelectedWellId] = useState<number | undefined>();
  const [showDateFilter, setShowDateFilter] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate());

  // Get URL parameters for editing - also moved up for safety
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchValue("");
    if (showDateFilter) {
      setSelectedDate(getCurrentDate());
    }
    setFilterValues({ paymentType: 'all', dateRange: undefined });
    toast({
      title: "تم إعادة التعيين",
      description: "تم مسح جميع الفلاتر وتعيين تاريخ اليوم",
    });
  }, [showDateFilter, toast, setSelectedDate, setFilterValues, setSearchValue]);

  // تعيين تاريخ اليوم تلقائياً عند الفتح
  useEffect(() => {
    if (showDateFilter && !selectedDate) {
      setSelectedDate(getCurrentDate());
    }
  }, [showDateFilter, selectedDate, setSelectedDate]);

  // إجراء الحفظ لاستخدامه مع الزر العائم
  const handleFloatingSave = () => {
    if (!selectedProjectId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار مشروع أولاً",
        variant: "destructive",
      });
      return;
    }
    // محاكاة كليك زر الحفظ
    (document.querySelector('[type="submit"]') as HTMLElement)?.click();
  };

  // تعيين إجراء الزر العائم
  useEffect(() => {
    setFloatingAction(handleFloatingSave, "حفظ المشتريات");
    return () => setFloatingAction(null);
  }, [setFloatingAction, selectedProjectId]);

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
      console.log(`Failed to save autocomplete value for ${category}:`, error);
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
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
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
      isActive: true,
    };

    addSupplierMutation.mutate(supplierData);
  };

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/materials", "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as Material[];
        }
        return Array.isArray(response) ? response as Material[] : [];
      } catch (error) {
        console.error("Error fetching materials:", error);
        return [];
      }
    },
    staleTime: 300000, // 5 دقائق
    gcTime: 600000, // 10 دقائق
  });

  // جلب بيانات الموردين من قاعدة البيانات
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/suppliers", "GET");
        // معالجة الهيكل المتداخل للاستجابة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as Supplier[];
        }
        return Array.isArray(response) ? response as Supplier[] : [];
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        return [];
      }
    },
    staleTime: 300000, // 5 دقائق
    gcTime: 600000, // 10 دقائق
  });

  // Fetch purchase data for editing
  const { data: purchaseToEdit, isLoading: isLoadingEdit } = useQuery({
    queryKey: ["/api/material-purchases", editId],
    queryFn: async () => {
      if (!editId) return null;

      try {
        console.log(`🔄 جلب بيانات المشترية للتعديل: ${editId}`);
        const response = await apiRequest(`/api/material-purchases/${editId}`, "GET");

        console.log('📊 استجابة جلب بيانات التعديل:', response);

        // معالجة الهيكل المتداخل للاستجابة
        let purchaseData = null;
        if (response && response.data) {
          purchaseData = response.data;
        } else if (response && response.id) {
          purchaseData = response;
        } else {
          console.warn('⚠️ لا توجد بيانات في الاستجابة');
          return null;
        }

        console.log('✅ تم جلب بيانات المشترية للتعديل:', purchaseData);
        return purchaseData;
      } catch (error) {
        console.error("❌ خطأ في جلب بيانات المشترية للتعديل:", error);
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
      console.log('🔄 ملء النموذج ببيانات التعديل:', purchaseToEdit);

      // استخدام البيانات المحفوظة في الجدول أولاً، ثم البيانات المرتبطة
      const materialNameValue = purchaseToEdit.materialName || purchaseToEdit.material?.name || "";
      const materialCategoryValue = purchaseToEdit.materialCategory || purchaseToEdit.material?.category || "";
      const materialUnitValue = purchaseToEdit.materialUnit || purchaseToEdit.unit || purchaseToEdit.material?.unit || "";

      setMaterialName(materialNameValue);
      setMaterialCategory(materialCategoryValue);
      setMaterialUnit(materialUnitValue);
      setQuantity(purchaseToEdit.quantity?.toString() || "");
      setUnitPrice(purchaseToEdit.unitPrice?.toString() || "");
      setPaymentType(purchaseToEdit.purchaseType || "نقد");
      setSupplierName(purchaseToEdit.supplierName || "");
      setInvoiceNumber(purchaseToEdit.invoiceNumber || "");
      setInvoiceDate(purchaseToEdit.invoiceDate || "");
      setPurchaseDate(purchaseToEdit.purchaseDate || "");
      setNotes(purchaseToEdit.notes || "");
      setInvoicePhoto(purchaseToEdit.invoicePhoto || "");
      setEditingPurchaseId(purchaseToEdit.id);
    }
  }, [purchaseToEdit, editId]);

  const addMaterialMutation = useMutation({
    mutationFn: (data: InsertMaterial) => apiRequest("/api/materials", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
    },
    onError: (error: any) => {
      console.error("Material creation error:", error);
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
  const materialCategories = Array.isArray(materials) ? Array.from(new Set(materials.map(m => m.category))) : [];
  const materialUnits = Array.isArray(materials) ? Array.from(new Set(materials.map(m => m.unit))) : [];

  // الموردين النشطين من قاعدة البيانات
  const activeSuppliers = Array.isArray(suppliers) ? suppliers.filter(supplier => supplier.isActive) : [];

  const addMaterialPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
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
      return apiRequest("/api/material-purchases", "POST", data);
    },
    onMutate: async (data) => {
      // فوري - تحديث البيانات محلياً قبل انتظار الخادم
      await queryClient.cancelQueries({ queryKey: ["/api/projects", selectedProjectId, "material-purchases"] });
      const previousData = queryClient.getQueryData(["/api/projects", selectedProjectId, "material-purchases"]);

      queryClient.setQueryData(["/api/projects", selectedProjectId, "material-purchases"], (old: any) => {
        const newPurchase = { id: `temp-${Date.now()}`, ...data, createdAt: new Date().toISOString() };
        return old ? [...old, newPurchase] : [newPurchase];
      });

      toast({
        title: "جاري الحفظ",
        description: "البيانات تحدثت فوراً",
      });

      return { previousData };
    },
    onSuccess: async () => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      toast({
        title: "تم الحفظ",
        description: "تم حفظ شراء المواد بنجاح",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "material-purchases"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      console.error("Material purchase error:", error);
      let errorMessage = "حدث خطأ أثناء حفظ شراء المواد";
      let errorDetails: string[] = [];

      if (error?.response?.data) {
        const errorData = error.response.data;
        if (errorData.message) errorMessage = errorData.message;
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
        title: "خطأ في حفظ شراء المواد",
        description: fullMessage,
        variant: "destructive",
        duration: 8000,
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
  };

  // Update Material Purchase Mutation
  const updateMaterialPurchaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      console.log('🔄 [PATCH] بدء تحديث المشترية:', { id, data });

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
      console.log('✅ [PATCH] استجابة تحديث المشترية:', response);
      return response;
    },
    onSuccess: async () => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      toast({
        title: "تم التعديل",
        description: "تم تعديل شراء المواد بنجاح",
      });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "material-purchases"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      console.error("Material purchase update error:", error);
      let errorMessage = "حدث خطأ أثناء تحديث شراء المواد";
      let errorDetails: string[] = [];

      if (error?.response?.data) {
        const errorData = error.response.data;
        if (errorData.message) errorMessage = errorData.message;
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
    }
  });

  // Delete Material Purchase Mutation
  const deleteMaterialPurchaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/material-purchases/${id}`, "DELETE"),
    onMutate: async (id) => {
      // فوري - حذف البيانات محلياً قبل انتظار الخادم
      await queryClient.cancelQueries({ queryKey: ["/api/projects", selectedProjectId, "material-purchases"] });
      const previousData = queryClient.getQueryData(["/api/projects", selectedProjectId, "material-purchases"]);

      queryClient.setQueryData(["/api/projects", selectedProjectId, "material-purchases"], (old: any) => {
        return old ? old.filter((p: any) => p.id !== id) : [];
      });

      return { previousData };
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف شراء المواد بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "material-purchases"] });
    },
    onError: (error, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["/api/projects", selectedProjectId, "material-purchases"], context.previousData);
      }
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف شراء المواد",
        variant: "destructive",
      });
    },
  });

  // Rest of the component logic and render...
  // (Note: The remaining lines would be kept as they were in the original file)
}
