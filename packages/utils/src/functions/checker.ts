export function checkHexCor (cor: string | null): [boolean, string] | [boolean] {
  if (cor === null) {
    return [false, '😒 | Você não pode definir a Cor como VAZIO, oque você esperava que ocorresse?']
  }
  // Expressão regular para verificar se a cor está no formato HEX válido
  const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/
  
  if (!regex.test(cor)) {
    return [false, 'A Cor expecificada não é valida!']
  }
  
  return [true]
}

export function checkURL (url: string | null): [boolean, string] {
  try {
    if (url === null) return [false, 'O link é invalido!']
    const parsedURL = new URL(url)
    return [true, `${parsedURL.protocol}//${parsedURL.host}`]
  } catch {
    return [false, 'O link é invalido!']
  }
}
