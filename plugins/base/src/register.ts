import { Entry } from 'socket-client'
import { Package } from 'utils'
import pkg from '../package.json'

Package.setData(pkg)

Entry.setEntries({
  typescript: {
    'Config.entry.ts': '\n// src/entity/Config.entry.ts\nimport { BaseEntity, Entity, OneToOne, PrimaryGeneratedColumn } from \'typeorm\'\nimport Guild from \'./Guild.entry.js\'\n\n@Entity({ name: \'base_config\' })\nexport default class Config extends BaseEntity {\n  @PrimaryGeneratedColumn()\n    id!: number\n\n  @OneToOne(() => Guild, (guild) => guild.config)\n    guild!: Guild\n}',
    'User.entry.ts': '\n// src/entity/User.entry.ts\nimport { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from \'typeorm\'\n\n@Entity()\nexport default class User extends BaseEntity {\n  @PrimaryGeneratedColumn()\n    id!: number\n\n  @Column()\n    firstName!: string\n\n  @Column()\n    lastName!: string\n\n  @Column()\n    age!: number\n}',
    'Guild.entry.ts': '\n// src/entity/Guild.entry.ts\nimport { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from \'typeorm\'\nimport Config from \'./Config.entry.js\'\n\n@Entity({ name: \'guild_base\' })\nexport default class Guild extends BaseEntity {\n  @PrimaryGeneratedColumn()\n    id!: number\n\n  @Column({ type: \'text\' })\n    guildId!: string\n\n  @OneToOne(() => Config, (config) => config.guild)\n  @JoinColumn()\n    config!: Config\n}'
  },
  javascript: {
    'Config.entry.js': '// src/entity/Config.entry.ts\nvar u=Object.defineProperty;var s=Object.getOwnPropertyDescriptor;var a=(d,r,i,m)=>{for(var e=m>1?void 0:m?s(r,i):r,l=d.length-1,n;l>=0;l--)(n=d[l])&&(e=(m?n(r,i,e):n(e))||e);return m&&e&&u(r,i,e),e};import{BaseEntity as o,Entity as c,OneToOne as p,PrimaryGeneratedColumn as y}from\'typeorm\';import G from\'./Guild.entry.js\';let t=class extends o{id;guild};a([y()],t.prototype,\'id\',2),a([p(()=>G,r=>r.config)],t.prototype,\'guild\',2),t=a([c({name:\'base_config\'})],t);export{t as default};\n',
    'User.entry.js': '// src/entity/User.entry.ts\nvar r=Object.defineProperty;var f=Object.getOwnPropertyDescriptor;var a=(e,m,l,i)=>{for(var n=i>1?void 0:i?f(m,l):m,o=e.length-1,u;o>=0;o--)(u=e[o])&&(n=(i?u(m,l,n):u(n))||n);return i&&n&&r(m,l,n),n};import{BaseEntity as g,Column as d,Entity as y,PrimaryGeneratedColumn as b}from\'typeorm\';let t=class extends g{id;firstName;lastName;age};a([b()],t.prototype,\'id\',2),a([d()],t.prototype,\'firstName\',2),a([d()],t.prototype,\'lastName\',2),a([d()],t.prototype,\'age\',2),t=a([y()],t);export{t as default};\n',
    'Guild.entry.js': '// src/entity/Guild.entry.ts\nvar f=Object.defineProperty;var s=Object.getOwnPropertyDescriptor;var o=(r,t,i,m)=>{for(var e=m>1?void 0:m?s(t,i):t,a=r.length-1,g;a>=0;a--)(g=r[a])&&(e=(m?g(t,i,e):g(e))||e);return m&&e&&f(t,i,e),e};import{BaseEntity as C,Column as p,Entity as y,JoinColumn as x,OneToOne as b,PrimaryGeneratedColumn as c}from\'typeorm\';import d from\'./Config.entry.js\';let n=class extends C{id;guildId;config};o([c()],n.prototype,\'id\',2),o([p({type:\'text\'})],n.prototype,\'guildId\',2),o([b(()=>d,t=>t.guild),x()],n.prototype,\'config\',2),n=o([y({name:\'guild_base\'})],n);export{n as default};\n'
  }
})

// Commands
import './discord/commands/teste.ts'

// Events
import './discord/events/joinGuild.ts'

// Components
import './discord/components/test.ts'

// Configs

// Crons