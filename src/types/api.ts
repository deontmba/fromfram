export interface ApiSuccess<T> {
  data: T;
  status: number;
}

export interface ApiError {
  error: string;
  status: number;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;