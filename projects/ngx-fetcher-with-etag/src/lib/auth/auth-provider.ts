import { HttpHeaders } from "@angular/common/http";

/**
 * Base authentication provider for supplying HTTP headers.
 *
 * Extend this class to implement custom authentication strategies
 * (e.g., JWT, API key, OAuth). By default, it returns an empty
 * {@link HttpHeaders} instance.
 *
 * @example
 * ```ts
 * export class MyAuthProvider extends AuthProvider {
 *   override getAuthHeaders(): HttpHeaders {
 *     return new HttpHeaders({
 *       Authorization: `Bearer ${localStorage.getItem('token')}`,
 *     });
 *   }
 * }
 * ```
 */
export class AuthProvider {
  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders();
  }
}
