import { createFileRoute } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, PageHeader, Section } from '@/components/fragment/primitives'
import { useUser } from '@/hooks/useUser'
import { DashboardDataTable, type DashboardTableColumn } from '@/routes/shared/-DashboardDataTable'

export const Route = createFileRoute('/dashboard/admin/users')({
  component: UsersAdmin,
})

function UsersAdmin() {
  const [page, setPage] = useState(1)
  const { usersQuery, deleteMutation } = useUser(page)

  const users = usersQuery.data?.items ?? []
  const pageCount = usersQuery.data?.pageCount ?? 1

  const columns: DashboardTableColumn[] = [
    { key: 'user', label: 'User' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'joined', label: 'Joined' },
    { key: 'actions', label: 'Actions' },
  ]

  const removeUser = async (id: number) => {
    await deleteMutation.mutateAsync({ id })
    await usersQuery.refetch()
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Manage platform users and permissions." />
      <Section>
        <Card className="overflow-hidden">
          <DashboardDataTable columns={columns}>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-accent/30">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{user.name.slice(0, 2).toUpperCase()}</span>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-5 py-3">
                  <Badge tone={user.role === 'administrator' ? 'primary' : 'muted'}>{user.role}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone="success">Active</Badge>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void removeUser(user.id)} disabled={deleteMutation.isPending}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </DashboardDataTable>
          <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
            <div>Page {usersQuery.data?.page ?? page} of {pageCount}</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
              <Button size="sm" variant="ghost" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</Button>
            </div>
          </div>
        </Card>
      </Section>
    </>
  )
}
