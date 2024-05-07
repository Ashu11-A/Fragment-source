import { glob } from 'glob'
import { join } from 'path'
import { cwd } from 'process'
import { type BaseEntity, DataSource, type DataSourceOptions } from 'typeorm'

export class Database {
  public static entries: BaseEntity[] = []
  public static client: DataSource
  private readonly options: DataSourceOptions

  constructor (options: DataSourceOptions) {
    this.options = options
  }

  async create () {
    Database.client = new DataSource({
      ...this.options,
      synchronize: true,
      logging: false,
      entities: await glob([`${join(cwd(), 'entries')}/**/*.{ts,js}`]),
      migrations: [],
      subscribers: []
    })
  }

  start () {
    Database.client.initialize().then(() => {
      console.log(`✨ Banco de dados inicializado com ${Database.entries.length} entries\n`)
    })
  }
}
