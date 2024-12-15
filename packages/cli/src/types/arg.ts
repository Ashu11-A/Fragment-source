export type ArgTyped<HasString extends boolean> = {
  command: string
  alias: readonly string[]
  description: string
  rank: number
  hasString: HasString
  exec: (
    content: HasString extends true
      ? string
      : undefined
  ) => Promise<void> | void
}