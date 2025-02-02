import { BearerStrategy } from './BearerStrategy.js'
import { CookiesStrategy } from './CookiesStrategy.js'

export const strategies = [new BearerStrategy(), new CookiesStrategy()]