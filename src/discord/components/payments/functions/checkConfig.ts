import {
  type ButtonInteraction,
  type CacheType,
  type CommandInteraction
} from 'discord.js'
import { type productData } from '@/interfaces'
import { db } from '@/app'

export async function checkProduct (options: {
  interaction: ButtonInteraction<CacheType> | CommandInteraction<CacheType>
  productData: productData
}): Promise<[boolean, string] | [boolean]> {
  const { interaction, productData } = options
  const { guildId } = interaction
  const methodTax = ['pix', 'debit_card', 'credit_card']
  const taxData = await db.payments.get(`${guildId}.config.taxes`)
  const errors: string[] = []

  for (const tax of methodTax) {
    if (taxData[tax] === undefined) errors.push('Método de taxa ``' + tax + '`` não configurado')
  }
  if (errors.length > 0) errors.push('Use o comando ``/config pagamentos config:Mercado Pago``')

  if (productData !== undefined) {
    if (
      productData.properties?.SetCtrlPanel === undefined &&
      productData.properties?.SetEstoque === undefined &&
      productData.properties?.SetPterodactyl === undefined
    ) {
      errors.push('Nenhum método de envio foi configurado.')
    }

    if (productData.properties?.SetCtrlPanel) {
      const ctrlPanelData = await db.payments.get(
        `${guildId}.config.ctrlPanel`
      )

      if (productData.coins === undefined) {
        errors.push(
          'Método de envio é `CtrlPanel`, mas não foi setado as moedas a serem adquiridas.'
        )
      }

      if (
        ctrlPanelData?.token === undefined &&
        ctrlPanelData?.url === undefined
      ) {
        errors.push(
          'Propriedades do ctrlPanel não configurados, use o comando: /config ctrlpanel'
        )
      }
    }

    if (productData?.properties?.SetPterodactyl !== undefined) {
      if (productData?.pterodactyl === undefined) {
        errors.push('O metodo `Pterodactyl` foi selecionado, mas nenhum elemento como: `Egg`, `CPU`, `Ram`, `Disco`, `Período`, foi configurado!')
      } else {
        const configured = []
        const existingItems = ['egg', 'cpu', 'ram', 'disk', 'time']
        const missingItem = []

        for (const item in productData.pterodactyl) {
          configured.push(item)
        }
        for (const item of existingItems) {
          if (!configured.includes(item)) {
            missingItem.push(item)
          }
        }

        if (missingItem.length > 0) {
          errors.push(`Faltam configurar os elementos: ${missingItem.join(', ')}.`)
        }
      }
    }

    if (productData.price === undefined) {
      errors.push('Preço do produto não foi configurado')
    }
  } else {
    errors.push(
      'Um erro muito grave ocorreu, nenhum dado foi encontrado no database'
    )
  }

  return errors.length === 0
    ? [true]
    : [false, errors.map((error) => `> ${error}`).join('\n')]
}
