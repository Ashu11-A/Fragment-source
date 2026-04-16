import { type APITextInputComponent, ComponentType, EmbedBuilder } from 'discord.js'

export const notFound = new EmbedBuilder({ title: '❌ Não encontrei o template no database!' }).setColor('Red')

export const elementsSelect: APITextInputComponent[] = [
  { label: '❓| Qual será o Título?', placeholder: 'Ex: Parceria', style: 1, max_length: 256, custom_id: 'title', type: ComponentType.TextInput },
  { label: '❓| Qual será a Descrição?', placeholder: 'Ex: Quero me tornar um parceiro.', style: 1, max_length: 256, custom_id: 'description', type: ComponentType.TextInput },
  { label: '❓| Qual será o Emoji? (somente um)', placeholder: 'Ex: 🎟️🎫💰🎲💵🗂️.', value: '💰', style: 1, max_length: 10, custom_id: 'emoji', type: ComponentType.TextInput },
]
