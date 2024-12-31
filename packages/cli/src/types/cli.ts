export type CliOptions<CallbackFn> = {
  argv?: string[]
  functions: CallbackFn
  showHelp?: boolean
}