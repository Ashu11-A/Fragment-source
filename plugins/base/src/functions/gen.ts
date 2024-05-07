export function gen (numero: number): string {
  numero = numero ?? 128
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  let valor = ''

  for (let i = 0; i < numero; i++) {
    const indiceAleatorio = Math.floor(Math.random() * caracteres.length)
    valor += caracteres.charAt(indiceAleatorio)
  }

  return valor
}
