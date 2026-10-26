import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Input, Select, Textarea, Card } from '../../components/ui'
import { createCase } from '../../api/cases'
import { listBureaus } from '../../api/bureaus'
import { listInstitutions } from '../../api/institutions'
import { toast } from '../../hooks/useToast'
import { CasePriority } from '../../types'

interface FormValues {
  title: string
  summary: string
  category: string
  priority: string
  institution_id: string
  bureau_id: string
  source_case_id: string
  due_date: string
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select category…' },
  { value: 'Affiliation', label: 'Affiliation' },
  { value: 'Fee Refund', label: 'Fee Refund' },
  { value: 'Faculty', label: 'Faculty' },
  { value: 'Infrastructure', label: 'Infrastructure' },
  { value: 'Admission', label: 'Admission' },
  { value: 'Examination', label: 'Examination' },
  { value: 'Other', label: 'Other' },
]

const PRIORITY_OPTIONS = Object.values(CasePriority).map(p => ({
  value: p,
  label: p.charAt(0).toUpperCase() + p.slice(1),
}))

export default function CreateCasePage() {
  const navigate = useNavigate()

  const { data: bureausData } = useQuery({
    queryKey: ['bureaus'],
    queryFn: listBureaus,
  })

  const { data: instData } = useQuery({
    queryKey: ['institutions', 0, '', '', ''],
    queryFn: () => listInstitutions({ limit: 100 }),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { priority: CasePriority.medium },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createCase({
        title: values.title,
        summary: values.summary || undefined,
        category: values.category,
        priority: values.priority,
        institution_id: values.institution_id ? Number(values.institution_id) : undefined,
        bureau_id: values.bureau_id ? Number(values.bureau_id) : undefined,
        source_case_id: values.source_case_id || undefined,
        due_date: values.due_date || undefined,
      }),
    onSuccess: (c) => {
      toast.success('Case created')
      navigate(`/cases/${c.id}`, { replace: true })
    },
    onError: () => toast.error('Failed to create case'),
  })

  const bureauOptions = [
    { value: '', label: 'No bureau' },
    ...(bureausData ?? []).map(b => ({ value: String(b.id), label: b.name })),
  ]

  const instOptions = [
    { value: '', label: 'No institution' },
    ...(instData?.items ?? []).map(i => ({ value: String(i.id), label: i.canonical_name })),
  ]

  return (
    <>
      <PageHeader
        title="Create Case"
        breadcrumbs={[{ label: 'Cases', href: '/cases' }, { label: 'New' }]}
      />
      <DataNote />

      <div className="mt-4 max-w-2xl">
        <Card>
          <form
            onSubmit={handleSubmit(v => mutation.mutate(v))}
            className="space-y-4"
          >
            <Input
              label="Title"
              required
              error={errors.title?.message}
              {...register('title', { required: 'Title is required' })}
            />

            <Textarea
              label="Summary"
              {...register('summary')}
            />

            <Select
              label="Category"
              required
              options={CATEGORY_OPTIONS}
              error={errors.category?.message}
              {...register('category', { required: 'Category is required' })}
            />

            <Select
              label="Priority"
              required
              options={PRIORITY_OPTIONS}
              {...register('priority', { required: true })}
            />

            <Select
              label="Bureau"
              options={bureauOptions}
              {...register('bureau_id')}
            />

            <Select
              label="Institution"
              options={instOptions}
              {...register('institution_id')}
            />

            <Input
              label="Source Case ID"
              placeholder="Original ticket / reference number"
              {...register('source_case_id')}
            />

            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                id="due_date"
                type="datetime-local"
                {...register('due_date')}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" loading={mutation.isPending}>
                Create Case
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/cases')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  )
}
