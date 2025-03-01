export type TProcessEnv = {
  PRODUCTION: boolean
  PORT: number
  REDIS_HOST: string
  REDIS_PORT: number
  REDIS_PASSWORD: number
  ROOT_DATABASE_TYPE: string
  ROOT_DATABASE_HOST: string
  ROOT_DATABASE_PORT: number
  ROOT_DATABASE_USERNAME: string
  ROOT_DATABASE_PASSWORD: number
  ROOT_DATABASE: string
  DATABASE_TYPE: string
  DATABASE_HOST: string
  DATABASE_PORT: number
  DATABASE_USERNAME: string
  DATABASE_PASSWORD: number
  DATABASE: string
  JWT_TOKEN: string
  JWT_EXPIRE: string
  REFRESH_TOKEN: string
  REFRESH_EXPIRE: string
  COOKIE_TOKEN: string
  FRONT_END_URL: string
  STORAGE_TYPE: string
  LOCAL_STORAGE_PATH: string
}

type Generic = Dict<string | number | boolean>

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Generic, TProcessEnv {}
  }
}

export {}