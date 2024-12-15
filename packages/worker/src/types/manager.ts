export type PluginMetadata = {
    name: string
    version: string
    description: string
    author: string | {
        name: string
        email: string
    }
    license: string
}
  
export type ManagerOptions = {
    fileURL: string
    cachePath?: string
}

export enum PathType {
    URL = 'url',
    Path = 'path',
    Invalid = 'invalid'
}
