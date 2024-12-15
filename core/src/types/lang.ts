/* eslint-disable no-var */
import * as lang from '../register'

declare global {
    var i18: typeof lang.i18
    
    interface globalThis {
        i18: typeof lang.i18
    }
}