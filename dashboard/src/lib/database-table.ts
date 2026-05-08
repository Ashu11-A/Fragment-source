export type DatabaseRow = Record<string, string>

export type TableDefinition = {
  name: string
  engine: 'sqlite' | 'mysql' | 'postgres'
  columns: string[]
  rows: DatabaseRow[]
}

type ActivityRow = {
  category: string
  level: string
  message: string
  source: string | null
  createdAt: string
}

export function buildTableDefinitions(botName: string, activityRows: ActivityRow[]): TableDefinition[] {
  const activityTable: TableDefinition = {
    name: 'activity_log',
    engine: 'sqlite',
    columns: ['category', 'level', 'message', 'source', 'created_at'],
    rows: activityRows.map((row) => ({
      category: row.category,
      level: row.level,
      message: row.message,
      source: row.source ?? '-',
      created_at: new Date(row.createdAt).toLocaleString(),
    })),
  }

  const settingsTable: TableDefinition = {
    name: 'bot_settings',
    engine: 'sqlite',
    columns: ['key', 'value'],
    rows: [
      { key: 'bot_name', value: botName },
      { key: 'runtime', value: 'fragment-core' },
      { key: 'storage_driver', value: 'local' },
    ],
  }

  const jobsTable: TableDefinition = {
    name: 'scheduled_jobs',
    engine: 'sqlite',
    columns: ['name', 'status', 'last_run'],
    rows: [
      { name: 'health_check', status: 'ok', last_run: new Date().toLocaleString() },
      { name: 'plugin_sync', status: 'idle', last_run: '-' },
      { name: 'metrics_flush', status: 'ok', last_run: new Date().toLocaleString() },
    ],
  }

  return [activityTable, settingsTable, jobsTable]
}
