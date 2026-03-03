/**
 * 🎯 Unified Types Across App2 (Web) and App2-Android (Expo)
 * This file ensures consistent data structures between platforms
 */

// ============================================================
// 📊 المشاريع
// ============================================================
export interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused';
  description?: string;
  budget?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectStats {
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  activeWorkers: number;
  completedDays?: number;
  materialPurchases?: number;
  lastActivity?: string;
}

export interface ProjectWithStats extends Project {
  stats?: ProjectStats;
}

// ============================================================
// 👥 العمال
// ============================================================
export interface Worker {
  id: string;
  name: string;
  phone?: string;
  type: string;
  dailyWage: number;
  status?: 'active' | 'inactive';
  created_at?: string;
}

// ============================================================
// 📈 الإحصائيات
// ============================================================
export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  activeWorkers: number;
}

// ============================================================
// 🔔 الإشعارات
// ============================================================
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

// ============================================================
// 🔐 المصادقة
// ============================================================
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: AuthUser;
  token?: string;
  message?: string;
}

// ============================================================
// 📡 API Responses
// ============================================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  message?: string;
}
