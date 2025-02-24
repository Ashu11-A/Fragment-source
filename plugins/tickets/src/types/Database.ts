// Template Types
export interface Properties {
  [key: string]: boolean | string
}

export enum TypeTemplate {
  Button = 'button',
  Select = 'select',
  Modal = 'modal'
}

export interface Select {
  title: string
  description: string
  emoji: string
}

export interface Category {
  title: string
  emoji: string
}

export interface System {
  name: string
  isEnabled: boolean
}