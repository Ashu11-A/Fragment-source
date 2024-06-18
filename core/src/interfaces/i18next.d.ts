import 'i18next'
import 'i18next-fs-backend'
import { FsBackendOptions } from 'i18next-fs-backend'

/**
 * Os autocompletes serão com base neste arquivo
 */
import type base from '../../locales/pt-BR/translation.json'

declare module 'i18next'  {
    interface CustomTypeOptions {
        backend: FsBackendOptions
        resources: {
          translation: typeof base
        }
    }
}