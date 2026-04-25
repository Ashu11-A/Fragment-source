import {
  Button as ConstaticButton,
  ChannelSelect as ConstaticChannelSelect,
  MentionableSelect as ConstaticMentionableSelect,
  Modal as ConstaticModal,
  ModalComponent as ConstaticModalComponent,
  Responder as ConstaticResponder,
  ResponderType,
  RoleSelect as ConstaticRoleSelect,
  StringSelect as ConstaticStringSelect,
  UserSelect as ConstaticUserSelect,
  type ButtonData,
  type ModalActionData,
  type ModalComponentActionData,
  type StringSelectData,
} from '@ashu11a/constatic'
import { Analyze } from 'url-ast'
import type { CacheType } from 'discord.js'
import { toPluginComponentPath } from '../utils/pluginComponentPath.js'

/* Cada `get data()` liga o `onClick`/`onSelect`/`onSubmit` ao `this` de `ResponderData` do Constatic. */
/* eslint-disable @typescript-eslint/no-this-alias -- padrão `const self` para .call(ResponderData) */
/* eslint-disable @typescript-eslint/no-explicit-any -- interação/params vêm de tipos genéricos do D.js */

export class Responder<
  Path extends string,
  Types extends readonly ResponderType[],
  Cache extends CacheType,
> extends ConstaticResponder<Path, Types, Cache> {
  public pluginName?: string
}

export class Button<const Parse extends string, const Cache extends CacheType = 'cached'> extends ConstaticButton<Parse, Cache> {
  public pluginName?: string

  constructor (options: ButtonData<Parse, Cache>) {
    super(options)
    this.ast = new Analyze(toPluginComponentPath(String(options.parser))) as this['ast']
  }

  get data () {
    const id = toPluginComponentPath(String(this.options.parser)) as Parse & string
    const self = this
    return {
      customId: id,
      types: [ResponderType.Button] as const,
      cache: this.options.cache,
      run (this: { customId: string; types: readonly ResponderType[]; cache?: Cache; run: unknown }, interaction: any, params: any) {
        return self.options.onClick.call(this as never, interaction, params)
      },
    }
  }
}

export class StringSelect<const Parse extends string, const Cache extends CacheType = 'cached'> extends ConstaticStringSelect<Parse, Cache> {
  public pluginName?: string

  constructor (options: StringSelectData<Parse, Cache>) {
    super(options)
    this.ast = new Analyze(toPluginComponentPath(String(options.parser))) as this['ast']
  }

  get data () {
    const id = toPluginComponentPath(String(this.options.parser)) as Parse & string
    const self = this
    return {
      customId: id,
      types: [ResponderType.StringSelect] as const,
      cache: this.options.cache,
      run (this: { customId: string; types: readonly ResponderType[]; cache?: Cache; run: unknown }, interaction: any, params: any) {
        return self.options.onSelect.call(this as never, interaction, params)
      },
    }
  }
}

export class UserSelect<const Parse extends string, const Cache extends CacheType = 'cached'> extends ConstaticUserSelect<Parse, Cache> {
  public pluginName?: string
}

export class RoleSelect<const Parse extends string, const Cache extends CacheType = 'cached'> extends ConstaticRoleSelect<Parse, Cache> {
  public pluginName?: string
}

export class ChannelSelect<const Parse extends string, const Cache extends CacheType = 'cached'> extends ConstaticChannelSelect<Parse, Cache> {
  public pluginName?: string
}

export class MentionableSelect<const Parse extends string, const Cache extends CacheType = 'cached'> extends ConstaticMentionableSelect<Parse, Cache> {
  public pluginName?: string
}

export class Modal<const Parse extends string, const Cache extends CacheType = 'cached'> extends ConstaticModal<Parse, Cache> {
  public pluginName?: string

  constructor (options: ModalActionData<Parse, Cache>) {
    super(options)
    this.ast = new Analyze(toPluginComponentPath(String(options.parser))) as this['ast']
  }

  get data () {
    const id = toPluginComponentPath(String(this.options.parser)) as Parse & string
    const self = this
    return {
      customId: id,
      types: [ResponderType.Modal] as const,
      cache: this.options.cache,
      run (this: { customId: string; types: readonly ResponderType[]; cache?: Cache; run: unknown }, interaction: any, params: any) {
        return self.options.onSubmit.call(this as never, interaction, params)
      },
    }
  }
}

export class ModalComponent<const Parse extends string, const Cache extends CacheType = 'cached'> extends ConstaticModalComponent<Parse, Cache> {
  public pluginName?: string

  constructor (options: ModalComponentActionData<Parse, Cache>) {
    super(options)
    this.ast = new Analyze(toPluginComponentPath(String(options.parser))) as this['ast']
  }

  get data () {
    const id = toPluginComponentPath(String(this.options.parser)) as Parse & string
    const self = this
    return {
      customId: id,
      types: [ResponderType.ModalComponent] as const,
      cache: this.options.cache,
      run (this: { customId: string; types: readonly ResponderType[]; cache?: Cache; run: unknown }, interaction: any, params: any) {
        return self.options.onSubmit.call(this as never, interaction, params)
      },
    }
  }
}
