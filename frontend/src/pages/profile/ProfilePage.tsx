import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Input, Card, Badge } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../api/client'
import { toast } from '../../hooks/useToast'
import type { BadgeColor } from '../../components/ui'
import { AccountStatus } from '../../types'

const roleColor = (r: string): BadgeColor =>
  r === 'system_admin'
    ? 'red'
    : r === 'senior_management'
    ? 'purple'
    : r === 'bureau_officer'
    ? 'blue'
    : r === 'regional_officer'
    ? 'indigo'
    : r === 'data_admin'
    ? 'orange'
    : r === 'coordination_reviewer'
    ? 'green'
    : 'gray'

const statusColor = (s: string): BadgeColor =>
  s === AccountStatus.active
    ? 'green'
    : s === AccountStatus.pending_approval
    ? 'yellow'
    : s === AccountStatus.suspended
    ? 'red'
    : 'gray'

const fmtRole = (r: string) =>
  r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

interface FormValues {
  full_name: string
  designation: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      full_name: user?.full_name ?? '',
      designation: user?.designation ?? '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    try {
      await apiClient.put('/auth/me', {
        full_name: values.full_name,
        designation: values.designation,
      })
      toast.success('Profile updated')
    } catch {
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" />
      <DataNote />

      {/* Info Card */}
      <Card title="Profile">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Full Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{user?.full_name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Role</dt>
            <dd className="mt-1">
              <Badge color={roleColor(user?.role ?? '')}>
                {fmtRole(user?.role ?? '')}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Designation</dt>
            <dd className="mt-1 text-sm text-gray-900">{user?.designation ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Bureau ID</dt>
            <dd className="mt-1 text-sm text-gray-900">{user?.bureau_id ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Account Status</dt>
            <dd className="mt-1">
              <Badge color={statusColor(user?.account_status ?? '')}>
                {fmtRole(user?.account_status ?? '')}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">Last Login</dt>
            <dd className="mt-1 text-sm text-gray-900">—</dd>
          </div>
        </dl>
      </Card>

      {/* Edit Form */}
      <Card title="Edit Profile">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <Input
            label="Full Name"
            required
            error={errors.full_name?.message}
            {...register('full_name', { required: 'Full name is required' })}
          />
          <Input
            label="Designation"
            {...register('designation')}
          />
          <Button type="submit" loading={saving}>
            Save
          </Button>
        </form>
      </Card>

      {/* Change Password */}
      <Card title="Change Password">
        <p className="text-sm text-gray-600">
          Contact your system administrator to change your password.
        </p>
      </Card>
    </div>
  )
}
