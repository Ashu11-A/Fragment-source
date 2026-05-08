export type WatcherOptions = {
  /**
   * When true, existing files on disk do not emit `add` on the initial scan.
   * Use after {@link Plugin.load} so plugins are not registered twice.
   */
  ignoreInitial?: boolean
  onChange?: (filePath: string) => void
  onReady?: () => void
  onAdd?: (filename: string) => void
  onChangeFile?: (filename: string) => void
  onAddDir?: (directory: string) => void
  onUnlink?: (filename: string) => void
  onUnlinkDir?: (directory: string) => void
  onRaw?: (event: string, path: string, details: unknown) => void
  onError?: (error: Error) => void
}