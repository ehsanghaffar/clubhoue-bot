import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';


type AuthHeader = {
  Authorization: string;
  "Content-Type": string;
};

export interface HttpServiceOptions {
  baseURL: string;
}

export class HttpService {
  private axiosInstance: AxiosInstance;

  constructor(private readonly options: HttpServiceOptions) {
    this.axiosInstance = axios.create({
      baseURL: options.baseURL,
    });
  }

  async get<T>(url: string, token: string): Promise<T> {
    const headers: AuthHeader = { 
      Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    };
    try {
      const response = await this.axiosInstance.get<T>(url, { headers });
      return response.data;
    } catch (error: AxiosError | any) {
      throw error;
    }
  }

  async post<T>(url: string, data: any, token: string): Promise<T> {
    const headers: AuthHeader = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    try {
      const response = await this.axiosInstance.post<T>(url, data, { headers });
      return response.data;
    } catch (error: AxiosError | any) {
      throw error;
    }
  }

  async put<T>(url: string, data: any, token: string): Promise<T> {
    const headers: AuthHeader = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    try {
      const response = await this.axiosInstance.put<T>(url, data, { headers });
      return response.data;
    } catch (error: AxiosError | any) {
      throw error;
    }
  }

  async delete<T>(url: string, token: string): Promise<AxiosResponse<T>> {
    const headers: AuthHeader = { 
      Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    };
    try {
      const response = await this.axiosInstance.delete<T>(url, { headers });
      return response;
    } catch (error: AxiosError | any) {
      throw error;
    }
  }
}
