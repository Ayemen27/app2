export const QUERY_KEYS = {
  projects: ["/api/projects"],
  materials: ["/api/materials"],
  suppliers: ["/api/suppliers"],
  workers: ["/api/workers"],
  notifications: ["/api/notifications"],
  autocomplete: ["/api/autocomplete"],
  materialPurchases: (projectId: string, date?: string) => 
    ["/api/projects", projectId, "material-purchases", date].filter(Boolean),
} as const;
