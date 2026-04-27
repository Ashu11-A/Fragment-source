export type TProcessEnv = {
  PRODUCTION: object
  PORT: number
  REDIS_HOST: string
  REDIS_PORT: number
  REDIS_PASSWORD: string
  DATABASE_HOST: string
  DATABASE_PORT: number
  DATABASE_USERNAME: string
  DATABASE_PASSWORD: string
  DATABASE_NAME: string
  JWT_TOKEN: string
  JWT_EXPIRE: string
  REFRESH_TOKEN: string
  REFRESH_EXPIRE: string
  COOKIE_TOKEN: string
  FRONT_END_URL: string
  BACK_END_URL: string
  STORAGE_TYPE: string
  LOCAL_STORAGE_PATH: string
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string
  OAUTH_STATE_SECRET: string
}

type Generic = Dict<string | number | Boolean>

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Generic, TProcessEnv {}
  }
}

export {}