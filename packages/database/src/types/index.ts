export interface DatabaseOptions {
  root: string
  log?: (message: string) => void
  spinner?: (message: string) => { succeed: (message: string) => void }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DatabaseRegistry {}

export type AnyConstructor = new (...args: unknown[]) => object
export type AnySchema = Record<string, AnyConstructor>
