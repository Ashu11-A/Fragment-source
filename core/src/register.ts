import { lang } from './lang'
import { storage } from './storage'

const data = await storage.load('.data', { isJson: true })

if (!data?.language) {
  const language = await lang.select()
  await storage.append('.data', { language }, { isJson: true })
}