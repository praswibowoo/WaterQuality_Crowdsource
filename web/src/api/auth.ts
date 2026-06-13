import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
  withCredentials: true,
});

export interface ResetRequest {
  id: string;
  reason: string | null;
  status: 'pending' | 'fulfilled' | 'rejected' | 'expired';
  rejectionReason: string | null;
  generatedPassword: string | null;
  resolvedAt: string | null;
  createdAt: string;
  user: { id: string; username: string; name: string | null };
  resolvedBy: { id: string; username: string } | null;
}

export interface ResetRequestsResponse {
  data: ResetRequest[];
  nextCursor: string | null;
  totalCount: number;
}

export const authApi = {
  // WQ-196v2: request password reset
  async forgotPassword(username: string, reason?: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/forgot-password', { username, reason });
    return response.data;
  },

  // WQ-196v2: list reset requests (admin)
  async listResetRequests(filters?: { status?: string; cursor?: string; limit?: number }): Promise<ResetRequestsResponse> {
    const response = await apiClient.get<ResetRequestsResponse>('/auth/reset-requests', { params: filters });
    return response.data;
  },

  // WQ-196v2: fulfill a reset request (admin)
  async fulfillResetRequest(id: string): Promise<{ userId: string; tempPassword: string; message: string }> {
    const response = await apiClient.post<{ userId: string; tempPassword: string; message: string }>(`/auth/reset-requests/${id}/fulfill`);
    return response.data;
  },

  // WQ-196v2: reject a reset request (admin)
  async rejectResetRequest(id: string, rejectionReason?: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/auth/reset-requests/${id}/reject`, { rejectionReason });
    return response.data;
  },
};
