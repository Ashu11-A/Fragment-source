export interface DatabaseOptions {
  root: string
  log?: (message: string) => void
  spinner?: (message: string) => { succeed: (message: string) => void }
}

export interface DatabaseRegistry {}

export type AnyConstructor = new (...args: unknown[]) => object
export type AnySchema = Record<string, AnyConstructor>
