import { useState, useMemo } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/PageHeader'
import { SearchWithBadge } from '@/components/SearchWithBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog'
import { createSortableHeader } from '@/lib/table-utils'
import { formatDate } from '@/lib/format-utils'
import {
  Users,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Shield,
  User,
  Trash2,
  UserCog,
} from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'

interface UserData {
  id: number
  name: string
  username: string
  email: string
  role: string
  createdAt: string
}

export function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null)
  const [deleteUserName, setDeleteUserName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const usersQuery = trpc.users.list.useQuery({ page: String(page), pageSize: '10' })
  const deleteMutation = trpc.users.delete.useMutation()

  const allUsers = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data?.data])
  const metadata = usersQuery.data?.metadata

  const handleDelete = async () => {
    if (!deleteUserId) return
    setLoading(true)
    setError('')
    try {
      await deleteMutation.mutateAsync({ id: deleteUserId })
      await usersQuery.refetch()
      setDeleteOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo<ColumnDef<UserData>[]>(
    () => [
      {
        accessorKey: 'name',
        ...createSortableHeader<UserData>('User'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px]">
                {row.original.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-surface-200">{row.original.name}</p>
              <p className="text-xs text-surface-500">@{row.original.username}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        ...createSortableHeader<UserData>('Email'),
        cell: ({ getValue }) => (
          <span className="text-sm text-surface-400">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'role',
        ...createSortableHeader<UserData>('Role'),
        cell: ({ getValue }) => {
          const role = getValue() as string
          return (
            <Badge variant={role === 'administrator' ? 'default' : 'secondary'}>
              <span className="flex items-center gap-1">
                {role === 'administrator' ? (
                  <Shield className="w-3 h-3" />
                ) : (
                  <User className="w-3 h-3" />
                )}
                {role}
              </span>
            </Badge>
          )
        },
      },
      {
        accessorKey: 'createdAt',
        ...createSortableHeader<UserData>('Joined'),
        cell: ({ getValue }) => (
          <span className="text-sm text-surface-500">
            {formatDate(getValue() as string)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => (
          <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">
            Actions
          </span>
        ),
        cell: ({ row }) => {
          const user = row.original
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="w-4 h-4 text-surface-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <UserCog className="w-4 h-4 mr-2" /> Edit Role
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-danger focus:text-danger"
                    onClick={() => {
                      setDeleteUserId(user.id)
                      setDeleteUserName(user.name)
                      setError('')
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [],
  )

  const table = useReactTable({
    data: allUsers,
    columns,
    state: { sorting, columnFilters, globalFilter: search },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const filteredRowCount = table.getFilteredRowModel().rows.length

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        icon={Users}
        title="User Management"
        description="Manage users, roles, and permissions."
      />

      <SearchWithBadge
        inputId="users-search"
        value={search}
        onChange={setSearch}
        placeholder="Search users..."
        count={filteredRowCount}
        itemLabel="user"
      />

      <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <LoadingSpinner text="Loading users..." paddingY="py-16" size="sm" />
          ) : table.getRowModel().rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="w-8 h-8 text-surface-500 mb-3" />
              <p className="text-surface-400 text-sm font-medium">
                {search ? 'No users match your search' : 'No users found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-surface-800/50">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className={`text-left py-3 px-4 ${header.id === 'actions' ? 'text-right' : ''}`}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="ui-table-row border-b transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="py-3 px-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {metadata && metadata.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800/50">
              <p className="text-xs text-surface-500">
                Page {metadata.currentPage} of {metadata.totalPages} · {metadata.total} users
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => prev - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page >= metadata.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete User"
        description={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-surface-200">{deleteUserName}</span>?
            This action cannot be undone.
          </>
        }
        onConfirm={handleDelete}
        isLoading={loading}
        error={error}
        confirmLabel="Delete User"
      />
    </div>
  )
}
