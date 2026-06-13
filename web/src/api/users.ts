import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
  withCredentials: true,
});

export interface AdminUser {
  id: string;
  name: string | null;
  username: string;
  role: string;
  active: boolean;
  createdAt: string;
  _count: {
    samples: number;
    loginLogs: number;
  };
}

export interface UsersFilters {
  cursor?: string;
  limit?: number;
  sortBy?: 'name' | 'username' | 'role' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface UsersResponse {
  data: AdminUser[];
  nextCursor: string | null;
  totalCount: number;
}

export const usersApi = {
  async list(filters?: UsersFilters): Promise<UsersResponse> {
    const response = await apiClient.get<UsersResponse>('/users', { params: filters });
    return response.data;
  },

  async count(filters?: Omit<UsersFilters, 'cursor' | 'limit'>): Promise<number> {
    const response = await apiClient.get<{ data: unknown[]; totalCount: number }>('/users', { params: { ...filters, limit: 1 } });
    return response.data.totalCount;
  },

  async get(id: string): Promise<{ user: AdminUser }> {
    const response = await apiClient.get<{ user: AdminUser }>(`/users/${id}`);
    return response.data;
  },

  async create(data: {
    name: string;
    username: string;
    password?: string;
    role?: string;
  }): Promise<{ user: AdminUser; tempPassword?: string }> {
    const response = await apiClient.post<{ user: AdminUser; tempPassword?: string }>('/users', data);
    return response.data;
  },

  async update(id: string, data: {
    name?: string;
    active?: boolean;
  }): Promise<{ user: AdminUser }> {
    const response = await apiClient.put<{ user: AdminUser }>(`/users/${id}`, data);
    return response.data;
  },

  async resetPassword(id: string): Promise<{ message: string; tempPassword: string }> {
    const response = await apiClient.put<{ message: string; tempPassword: string }>(
      `/users/${id}/reset-password`,
      {}
    );
    return response.data;
  },
};
