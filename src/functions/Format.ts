import axios from 'axios'

export function zeroPad (number: number): string {
  return number < 10 ? String(number) : `0${number}`
}

export async function calculateImageSize (url: string): Promise<number> {
  try {
    const response = await axios.head(url)

    const contentLengthHeader = response.headers['content-length']
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

export function numerosParaLetras (str: string): string {
  const numeroParaLetra = (numero: number): string => {
    if (numero >= 1 && numero <= 26) {
      return String.fromCharCode(96 + numero).toUpperCase()
    } else {
      return ''
    }
  }

  let resultado = ''
  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i)
    if (/[0-9]/.test(char)) {
      resultado += numeroParaLetra(Number(char))
    } else {
      resultado += char
    }
  }

  return resultado
}

export function convertStringToDate (str: string): Date {
  const regex = /(\d+)([smhd])/
  const matches = str.match(regex)

  if (matches === null) {
    throw new Error('Formato inválido')
  }

  const value = parseInt(matches[1])
  const unit = matches[2]
  const now = new Date()

  switch (unit) {
    case 's':
      now.setSeconds(now.getSeconds() + value)
      break
    case 'm':
      now.setMinutes(now.getMinutes() + value)
      break
    case 'h':
      now.setHours(now.getHours() + value)
      break
    case 'd':
      now.setDate(now.getDate() + value)
      break
    default:
      throw new Error('Unidade inválida')
  }

  return now
}
