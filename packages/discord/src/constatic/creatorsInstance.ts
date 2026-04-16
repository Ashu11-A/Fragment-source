import { setupCreators } from '@constatic/base'

/** Instância única — deve ser o mesmo `createCommand` usado em todo o pacote `discord`. */
export const { createCommand, createEvent, createResponder } = setupCreators()
