import { apiRequest } from "./queryClient";

export async function syncLocalData(table: string, data: any[]) {
  try {
    const response = await apiRequest("POST", "/api/sync", { table, data });
    return await response.json();
  } catch (error) {
    console.error("Sync error:", error);
    throw error;
  }
}

export async function syncEncryptedData(table: string, data: any) {
  try {
    const response = await apiRequest("POST", "/api/sync", { 
      encrypted: true, 
      data: JSON.stringify(data) 
    });
    return await response.json();
  } catch (error) {
    console.error("Encrypted sync error:", error);
    throw error;
  }
}
