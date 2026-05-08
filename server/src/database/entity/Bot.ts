import { Log } from '@/database/entity/Log'
import { Node } from '@/database/entity/Node.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Release } from '@/database/entity/Release.js'
import { User } from '@/database/entity/User.js'
import { Variable } from '@/database/entity/Variable'
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, type Relation } from 'typeorm'
import { BaseEntity } from './base'
import { Session } from './Session'

@Entity({ name: 'bots' })
export class Bot extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
    name!: string
  @Column({ type: 'text', nullable: true })
    description!: string | null
  @Column({ type: 'boolean', default: true })
    enabled!: boolean
  @Column({ type: 'text', nullable: true })
    token!: string | null
  @Column({ type: 'simple-json', nullable: true })
    envs!: Array<{ name: string; value: string }> | null

  @Column({ type: 'boolean', default: false })
    licenseAccepted!: boolean
  @Column({ type: 'datetime', nullable: true })
    licenseAcceptedAt!: Date | null
  @Column({ type: 'varchar', length: 64, nullable: true })
    licenseVersion!: string | null

  @ManyToOne(() => User, (user) => user.bots)
    user!: Relation<User>
  @ManyToMany(() => Plugin, (plugin) => plugin.bots)
  @JoinTable({
    name: 'bot_plugins',
    joinColumn: { name: 'bot_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'plugin_id', referencedColumnName: 'id' },
  })
    plugins!: Relation<Plugin[]>
  @ManyToOne(() => Release, (release) => release.bots)
    release!: Relation<Release>
  @OneToMany(() => Log, (log) => log.bot)
    logs!: Relation<Log[]>
  @OneToMany(() => Variable, (variable) => variable.bot)
    variables!: Relation<Variable[]>
  @ManyToOne(() => Node, (node) => node.bots)
    node!: Relation<Node>
  @OneToMany(() => Session, (session) => session.bot)
    sessions!: Relation<Session[]>
}
