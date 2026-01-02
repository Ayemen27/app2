
// عميل API محسن لمعالجة الأخطاء والاتصالات
class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = 'https://app2.binarjoinanelytic.info/api';
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`🔄 API Request: ${options.method || 'GET'} ${endpoint}`, options.body || '');
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`✅ API Response: ${options.method || 'GET'} ${endpoint}`, data);
        return data;
      } else {
        const text = await response.text();
        console.log(`✅ API Response (non-JSON): ${options.method || 'GET'} ${endpoint}`);
        return text as unknown as T;
      }
    } catch (error) {
      console.error(`❌ API Error: ${options.method || 'GET'} ${endpoint}`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
