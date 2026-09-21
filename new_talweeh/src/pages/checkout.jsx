import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import CheckoutExperience from '../components/CheckoutExperience'
import { PageFooter, PageHeader } from './_shared'
import { commerceCartOptionIds, readCommerceHandoff, rememberCommerceHandoff } from '../data/commerceCart'

function normalizeOptions(value) {
  return Array.from(new Set(
    String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )).slice(0, 20)
}

export default function CommerceCheckoutPage() {
  const [params] = useSearchParams()
  const queryHandoff = String(params.get('handoff') || '').trim().slice(0, 4096)
  const handoff = queryHandoff || readCommerceHandoff()
  if (queryHandoff) rememberCommerceHandoff(queryHandoff)

  const optionIds = useMemo(() => {
    const fromQuery = normalizeOptions(params.get('options'))
    return fromQuery.length ? fromQuery : commerceCartOptionIds()
  }, [params])

  return (
    <div className="page-shell commerce-surface-shell">
      <PageHeader />
      <main className="talweeh-checkout-page">
        <CheckoutExperience initialOptionIds={optionIds} initialHandoff={handoff} />
      </main>
      <PageFooter />
    </div>
  )
}
