import { console } from "@/controller/console.js"
import fetch from 'node-fetch'

export async function calculateImageSize (url: string): Promise<number> {
  try {
    const headers = (await fetch(url)).headers
    

    const contentLengthHeader = headers.get('content-length')
    if (contentLengthHeader !== null) {
      const imageSize = parseInt(contentLengthHeader, 10)
      return imageSize
    } else {
      throw new Error('Content-Length header not found')
    }
  } catch (error) {
    console.error('Error calculating image size:', error)
    throw error
  }
}

export function formatBytes (bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}