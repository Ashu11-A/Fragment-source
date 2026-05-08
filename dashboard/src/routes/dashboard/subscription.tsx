import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { Badge, Button, Card, CardHeader, PageHeader, Section } from '@/components/fragment/primitives'
import { cn } from '@/lib/utils'
import { useTRPC } from '@/lib/trpc'
import { useSubscription } from '@/hooks/useSubscription'
import { usePlanStore } from '@/stores/planStore'
import { DashboardDataTable, type DashboardTableColumn } from '@/routes/shared/-DashboardDataTable'

const TIER_ORDER: Record<string, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

export const Route = createFileRoute('/dashboard/subscription')({
  component: Subscription,
})

function Subscription() {
  const trpc = useTRPC()
  const { subscriptions, refetch } = useSubscription('list')
  const plans = usePlanStore((state) => state.plans)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)

  const upgradeMutation = useMutation(trpc.subscriptions.upgrade.mutationOptions({
    onMutate: ({ planKey }) => setUpgrading(planKey),
    onSettled: () => setUpgrading(null),
    onSuccess: () => {
      window.location.reload()
    },
  }))

  const cancelMutation = useMutation(trpc.subscriptions.cancel.mutationOptions({
    onMutate: () => setCanceling(true),
    onSettled: () => setCanceling(false),
    onSuccess: () => {
      refetch()
    },
  }))

  const active = subscriptions.filter((item) => item.active)
  const currentSubscription = active[0] ?? null
  const currentPlanName = currentSubscription?.plan?.name ?? 'No active plan'
  const currentTier = currentSubscription?.plan?.tier ?? 'free'
  const isCanceled = !!currentSubscription?.canceledAt
  const nextRenewal = currentSubscription?.expiresAt ? new Date(currentSubscription.expiresAt).toLocaleDateString() : '—'

  const billingColumns: DashboardTableColumn[] = [
    { key: 'period', label: 'Period' },
    { key: 'status', label: 'Status' },
    { key: 'plan', label: 'Plan' },
  ]

  return (
    <>
      <PageHeader title="Subscription Plans" subtitle="Choose the right plan for your needs." />
      <Section>
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Plan</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold">{currentPlanName}</span>
              <span className="text-sm text-muted-foreground">
                {isCanceled ? `Valid until: ${nextRenewal}` : `Renews: ${nextRenewal}`}
              </span>
            </div>
            {isCanceled && (
              <Badge tone="warning" className="mt-2">Canceled</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!currentSubscription || isCanceled || canceling}
              onClick={() => cancelMutation.mutate({})}
            >
              {canceling ? 'Canceling...' : 'Cancel Subscription'}
            </Button>
          </div>
        </Card>

        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.name === currentPlanName
            const isPro = plan.key === 'pro'
            const isLowerTier = TIER_ORDER[plan.tier] < TIER_ORDER[currentTier]
            const canUpgrade = !isCurrent && !isLowerTier && plan.key !== 'enterprise'

            return (
              <Card key={plan.key} className={cn('relative flex flex-col p-6', isPro && 'ring-2 ring-primary')}>
                {isPro && <Badge tone="primary">Most Popular</Badge>}
                <div className="mt-3 font-display text-xl font-bold">{plan.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">${plan.monthlyPriceUsd}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {plan.highlights.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={isCurrent ? 'secondary' : isPro ? 'primary' : 'outline'}
                  disabled={!canUpgrade || upgradeMutation.isPending}
                  onClick={() => {
                    if (canUpgrade) {
                      upgradeMutation.mutate({ planKey: plan.key })
                    }
                  }}
                >
                  {isCurrent
                    ? 'Current Plan'
                    : isLowerTier
                      ? 'Not Available'
                      : upgradeMutation.isPending && upgrading === plan.key
                        ? 'Processing...'
                        : plan.key === 'enterprise'
                          ? 'Contact Sales'
                          : `Upgrade to ${plan.name}`}
                </Button>
              </Card>
            )
          })}
        </div>
      </Section>

      <Section className="pt-0">
        <Card>
          <CardHeader title="Subscription History" />
          <DashboardDataTable columns={billingColumns}>
            {subscriptions.map((subscription) => {
              const isActive = subscription.active
              const isCanceledSub = !!subscription.canceledAt
              let statusText = isActive ? 'Active' : 'Inactive'
              let statusTone: 'success' | 'warning' | 'muted' = isActive ? 'success' : 'muted'

              if (isActive && isCanceledSub) {
                statusText = 'Canceled'
                statusTone = 'warning'
              }

              return (
                <tr key={subscription.id} className="hover:bg-accent/30">
                  <td className="px-5 py-3 text-muted-foreground">{new Date(subscription.startAt).toLocaleDateString()} → {new Date(subscription.expiresAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3"><Badge tone={statusTone}>{statusText}</Badge></td>
                  <td className="px-5 py-3 text-muted-foreground">{subscription.plan.name}</td>
                </tr>
              )
            })}
          </DashboardDataTable>
        </Card>
      </Section>
    </>
  )
}
