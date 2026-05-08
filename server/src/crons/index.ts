import { subscriptionExpiryCron } from './subscriptionExpiry.js'

export function registerCrons(): void {
  subscriptionExpiryCron.start()
}

export function stopCrons(): void {
  subscriptionExpiryCron.stop()
}

export { subscriptionExpiryCron }
