export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Falha ao ler o ficheiro'))
        return
      }
      const base64 = result.split(',')[1]
      if (base64 == null) {
        reject(new Error('Base64 vazio'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
