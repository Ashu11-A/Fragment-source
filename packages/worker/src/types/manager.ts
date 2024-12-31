export type Metadata = {
    name: string
    version: string
    description: string
    author: string | {
        name: string
        email: string
    }
    license: string
}
export type MetadataKeys = keyof Metadata
  
export type ManagerOptions = {
    fileURL: string
    port: number
    cachePath?: string
}

export enum PathType {
    URL = 'url',
    Path = 'path',
    Invalid = 'invalid'
}
