export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp?: string;
  };
}

class ApiClient {
  private csrfToken: string | null = null;

  setCsrfToken(token: string | null) {
    this.csrfToken = token;
  }

  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('/') ? endpoint : `/api/v1/${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
      headers['x-csrf-token'] = this.csrfToken;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // send cookies
    });

    let resData: ApiResponse<T>;
    try {
      resData = await response.json();
    } catch {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    if (!response.ok || !resData.success) {
      const message = resData.error?.message || `Request failed with status ${response.status}`;
      const err = new Error(message);
      (err as unknown as { code?: string; details?: unknown; status?: number }).code = resData.error?.code;
      (err as unknown as { code?: string; details?: unknown; status?: number }).details = resData.error?.details;
      (err as unknown as { code?: string; details?: unknown; status?: number }).status = response.status;
      throw err;
    }

    return resData.data as T;
  }

  get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      }
      const qs = query.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? (body as FormData) : JSON.stringify(body ?? {}),
    });
  }

  patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body ?? {}),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
