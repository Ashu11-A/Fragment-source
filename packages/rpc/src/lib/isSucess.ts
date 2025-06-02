import type { ErrorResponse, SuccessResponse, ZodResponse } from '../app'

export type APIResponse<T> = ErrorResponse | ZodResponse | SuccessResponse<T>

export function isSuccessResponse<T>(response?: APIResponse<T>): response is SuccessResponse<T> {
  return response ? ('data' in response) : false
}