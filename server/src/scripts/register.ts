import { User } from '@/database/entity/User'
import { Role } from '@/database/enums'
import { isDev } from '@/lib/dev'
import { faker } from '@faker-js/faker'
import { nanoid } from 'nanoid'

export async function seedDatabase(): Promise<void> {
  if (!isDev) {
    console.log('[seed] produção detectada — seed ignorado')
    return
  }

  let admin = await User.findOneBy({ email: 'admin@admin.com' })
  if (!admin) {
    admin = await (
      await User.create({
        name: 'Matheus',
        username: 'Ashu',
        email: 'admin@admin.com',
        language: 'pt-BR',
        uuid: nanoid(),
        role: Role.Administrator,
      }).setPassword('admin1234')
    ).save()
    console.log('[seed] admin criado')
  }

  let testUser = await User.findOneBy({ email: 'user@user.com' })
  if (!testUser) {
    testUser = await (
      await User.create({
        name: 'User Teste',
        username: 'user',
        email: 'user@user.com',
        language: 'pt-BR',
        uuid: nanoid(),
        role: Role.User,
      }).setPassword('user1234')
    ).save()
    console.log('[seed] usuário de teste criado')
  }

  const totalUsers = await User.count()
  const MAX_USERS = 20

  if (totalUsers < MAX_USERS) {
    const countToGenerate = MAX_USERS - totalUsers

    const fakeUsersData = Array.from({ length: countToGenerate }).map(() => ({
      name: faker.person.fullName(),
      username: faker.internet.username().toLowerCase(),
      email: faker.internet.email().toLowerCase(),
      language: faker.helpers.arrayElement(['pt-BR', 'en-US']),
      role: Role.User,
    }))

    for (const userData of fakeUsersData) {
      const exists = await User.findOneBy({ email: userData.email })
      if (!exists) {
        await (
          await User.create({
            name: userData.name,
            username: userData.username,
            email: userData.email,
            language: userData.language,
            uuid: nanoid(),
            role: userData.role,
          }).setPassword('password123')
        ).save()
      }
    }
    console.log(`[seed] ${countToGenerate} usuários fake gerados`)
  } else {
    console.log(`[seed] já existem ${totalUsers} usuários — seed de fakes ignorado`)
  }
}
