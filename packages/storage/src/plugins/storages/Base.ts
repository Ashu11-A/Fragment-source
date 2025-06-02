/* eslint-disable @typescript-eslint/no-explicit-any */
// packages/storage/src/plugins/storages/Base.ts
import { Readable } from 'stream'
import type { Crypt } from '../../controllers/Crypt'

export abstract class BaseStorage<
  FileMap extends Record<string, any> = Record<string, any>
> {
  name: string
  version: string
  crypt?: Crypt = undefined

  constructor(name: string, version: string) {
    this.name = name
    this.version = version
  }

  abstract save<K extends keyof FileMap>(
    key: K,
    data: FileMap[K] | string,
    options: { folder?: string; isJson: true }
  ): Promise<void> | void;
  abstract save<K extends string>(
    key: K,
    data: Blob | ArrayBuffer | Buffer | string | object,
    options?: { folder?: string; isJson?: boolean } 
  ): Promise<void> | void;

  abstract append<K extends keyof FileMap>(
    key: K,
    data: Partial<FileMap[K]> | string,
    options: { folder?: string; isJson: true }
  ): Promise<void> | void;
  abstract append<K extends string>(
    key: K,
    data: object | string,
    options: { folder?: string; isJson: true }
  ): Promise<void> | void;
  abstract append<K extends string>(
    key: K,
    data: Blob | ArrayBuffer | Buffer,
    options?: { folder?: string; isJson?: false | undefined }
  ): Promise<void> | void;

  abstract load<K extends keyof FileMap>(
    key: K,    
    options: { isJson: true, folder?: string, }
  ): Promise<FileMap[K] | undefined> | FileMap[K] | undefined;
  abstract load<T = any, K extends string = string>(
    key: K,
    options: { isJson: true, folder?: string }
  ): Promise<T | undefined> | T | undefined;
  abstract load<K extends string>(
    key: K,
    options?: { isJson?: false | undefined, folder?: string, } 
  ): Promise<Buffer | undefined> | Buffer | undefined;

  abstract list(folder?: string): Promise<string[]> | string[];
  abstract exist(key: string, folder?: string): Promise<boolean> | boolean;
  abstract delete(key: string, folder?: string): Promise<void> | void;
  abstract stream(key: string, folder?: string): Promise<Readable> | Readable;
}