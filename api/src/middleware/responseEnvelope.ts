import { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
  const response: ApiSuccess<T> = { success: true, data };
  res.status(statusCode).json(response);
}

export function sendError(res: Response, code: string, message: string, statusCode: number = 400): void {
  const response: ApiError = { success: false, error: { code, message } };
  res.status(statusCode).json(response);
}
