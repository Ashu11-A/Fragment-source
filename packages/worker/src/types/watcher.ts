export type WatcherOptions = {
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