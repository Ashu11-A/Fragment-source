import { storage, lang } from './singletons'

const data = await storage.load('.data', { isJson: true })

if (!data?.language) {
  const language = String(lang.set(process.env.FRAGMENT_LANGUAGE ?? 'en'))
  await storage.append('.data', { language }, { isJson: true })
}