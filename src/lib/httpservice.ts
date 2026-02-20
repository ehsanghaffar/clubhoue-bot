import axios, { AxiosInstance, AxiosResponse, RawAxiosRequestHeaders } from 'axios';

export interface HttpServiceOptions {
  baseURL: string;
  timeout?: number;
}

export class HttpService {
  private axiosInstance: AxiosInstance;

  constructor(private readonly options: HttpServiceOptions) {
    this.axiosInstance = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout ?? 30000,
    });
  }

  private getHeaders(token: string): RawAxiosRequestHeaders {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async get<T>(url: string, token: string): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, {
      headers: this.getHeaders(token),
    });
    return response.data;
  }

  async post<T>(url: string, data: Record<string, unknown>, token: string): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, {
      headers: this.getHeaders(token),
    });
    return response.data;
  }

  async put<T>(url: string, data: Record<string, unknown>, token: string): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, {
      headers: this.getHeaders(token),
    });
    return response.data;
  }

  async delete<T>(url: string, token: string): Promise<AxiosResponse<T>> {
    const response = await this.axiosInstance.delete<T>(url, {
      headers: this.getHeaders(token),
    });
    return response;
  }
}
