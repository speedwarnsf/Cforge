import { toast } from "@/hooks/use-toast";

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

class APIClient {
  private baseURL = '';
  
  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = 30000,
      retries = 2,
      retryDelay = 1000
    } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle specific error cases
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('retry-after') || '60');
            throw new APIError(
              `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
              429,
              'RATE_LIMITED',
              retryAfter
            );
          }
          
          if (response.status === 503) {
            throw new APIError(
              'Service temporarily unavailable. Please try again in a moment.',
              503,
              'SERVICE_UNAVAILABLE'
            );
          }
          
          if (response.status >= 500) {
            throw new APIError(
              'Server error occurred. Please try again.',
              response.status,
              'SERVER_ERROR'
            );
          }
          
          throw new APIError(
            errorData.message || errorData.error || `Request failed with status ${response.status}`,
            response.status,
            errorData.code
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry for certain errors
        if (error instanceof APIError && [400, 401, 403, 404].includes(error.status)) {
          break;
        }
        
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new APIError('Request timed out. Please check your connection and try again.', 408, 'TIMEOUT');
        }
        
        // Wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }
    
    // If we've exhausted retries, throw the last error
    if (lastError instanceof APIError) {
      throw lastError;
    }
    
    throw new APIError(
      'Network error. Please check your connection and try again.',
      0,
      'NETWORK_ERROR'
    );
  }

  // Convenience methods
  async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, body: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  // Streaming endpoint for AI generation
  async streamGeneration(
    endpoint: string, 
    body: any, 
    onProgress: (data: any) => void
  ): Promise<any> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.message || `Request failed with status ${response.status}`,
          response.status,
          errorData.code
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new APIError('Response body not available', 500, 'NO_RESPONSE_BODY');
      }

      const decoder = new TextDecoder();
      let finalResult: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              onProgress(event);
              
              if (event.type === 'complete') {
                finalResult = event.data;
              }
              
              if (event.type === 'error') {
                throw new APIError(event.data.message, 500, 'GENERATION_ERROR');
              }
            } catch (parseErr) {
              console.warn('Failed to parse SSE event:', parseErr);
            }
          }
        }
      }

      return finalResult;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      throw new APIError(
        'Failed to generate content. Please try again.',
        500,
        'GENERATION_FAILED'
      );
    }
  }
}

export const apiClient = new APIClient();

// Helper function to handle API errors with user-friendly toasts
export function handleAPIError(error: unknown) {
  console.error('API Error:', error);
  
  if (error instanceof APIError) {
    let title = 'Error';
    let description = error.message;
    
    switch (error.code) {
      case 'RATE_LIMITED':
        title = 'Too Many Requests';
        break;
      case 'TIMEOUT':
        title = 'Request Timed Out';
        break;
      case 'NETWORK_ERROR':
        title = 'Connection Error';
        break;
      case 'SERVICE_UNAVAILABLE':
        title = 'Service Unavailable';
        break;
      default:
        title = 'Something went wrong';
    }
    
    toast({
      variant: 'destructive',
      title,
      description
    });
  } else {
    toast({
      variant: 'destructive',
      title: 'Unexpected Error',
      description: 'Something went wrong. Please try again.'
    });
  }
}