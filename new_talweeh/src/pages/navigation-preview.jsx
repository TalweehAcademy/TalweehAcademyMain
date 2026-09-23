import { Link, useParams } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'

export default function NavigationPreviewPage() {
  const { section } = useParams()
  return (
    <div className="page-shell">
      <PageHeader />
      <main className="academy-navigation-preview">
        <p className="academy-preview-label">Design preview</p>
        <h1>{section === 'Student Portal' ? 'Legacy Portal' : section}</h1>
        {/* The portal button is now "Legacy Portal"; the old /navigation-preview/Student Portal address still works. */}
        <p>{section === 'Legacy Portal' || section === 'Student Portal'
          ? 'The legacy portal will be linked here once its address is confirmed.'
          : 'This section is part of the proposed website navigation. Its content has not been added to this preview yet.'}</p>
        <Link className="green-button" to="/">Back to Home</Link>
      </main>
      <PageFooter />
    </div>
  )
}
