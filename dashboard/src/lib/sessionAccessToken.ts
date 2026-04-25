/**
 * JWT de acesso após login/OAuth — enviado em `Authorization` porque cookies da API (:3500)
 * nem sempre são gravados no browser quando o front usa o proxy do Vite (:5173).
 * `localStorage` (como o persist do Zustand) permite outras abas na mesma origem.
 */
const KEY = 'fragment-access-token'

export function setSessionAccessToken (token: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(KEY, token)
}

export function getSessionAccessToken (): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(KEY)
}

export function clearSessionAccessToken (): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(KEY)
}
