import { User } from '@/database/entity/User'
import { Plan } from '@/database/entity/Plan'
import { Role } from '@/database/enums'
import { isDev } from '@/lib/dev'
import { faker } from '@faker-js/faker'

export async function seedDatabase(): Promise<void> {
  if (!isDev) {
    console.log('[seed] produção detectada — seed ignorado')
    return
  }

  const planCount = await Plan.count()
  if (planCount === 0) {
    await Plan.insert([
      {
        key: 'free',
        name: 'Free',
        description: 'For hobbyists and small projects.',
        tier: 'free',
        monthlyPriceUsd: 0,
        memory: 512,
        cpu: 1,
        maxBots: 1,
        maxPlugins: 3,
        supportLevel: 'community',
        highlights: ['1 Bot', '3 Plugins', 'Community Support'],
        active: true,
      },
      {
        key: 'pro',
        name: 'Pro',
        description: 'For growing communities.',
        tier: 'pro',
        monthlyPriceUsd: 9.99,
        memory: 2048,
        cpu: 2,
        maxBots: 5,
        maxPlugins: -1,
        supportLevel: 'priority',
        highlights: ['5 Bots', 'Unlimited Plugins', 'Priority Support', 'Custom Domain'],
        active: true,
      },
      {
        key: 'enterprise',
        name: 'Enterprise',
        description: 'For large-scale operations.',
        tier: 'enterprise',
        monthlyPriceUsd: 29.99,
        memory: 8192,
        cpu: 4,
        maxBots: -1,
        maxPlugins: -1,
        supportLevel: 'dedicated',
        highlights: ['Unlimited Bots', 'Unlimited Plugins', 'Dedicated Support', 'Custom Domain'],
        active: true,
      },
    ])
    console.log('[seed] planos criados')
  }

  let admin = await User.findOneBy({ email: 'admin@admin.com' })
  if (!admin) {
    admin = await (
      await User.create({
        name: 'Matheus',
        username: 'Ashu',
        email: 'admin@admin.com',
        language: 'pt-BR',
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
