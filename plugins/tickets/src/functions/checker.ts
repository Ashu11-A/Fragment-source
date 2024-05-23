export function checkHexCor (cor: string): [boolean, string] | [boolean] {
  if (cor === '') {
    return [false, '😒 | Você não pode definir a Cor como VAZIO, oque você esperava que ocorresse?']
  }
  // Expressão regular para verificar se a cor está no formato HEX válido
  const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/
  
  if (!regex.test(cor)) {
    return [false, 'A Cor expecificada não é valida!']
  }
  
  return [true]
}