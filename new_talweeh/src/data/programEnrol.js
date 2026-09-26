// Warm-ups for a programme's enrolment path (programme page → /arabic/enroll or /hadith-specialization/enroll →
// /checkout): fetch the live catalog and load the next pages' code in the background, so each step opens
// without waiting. Failures are ignored; the pages fetch what they need themselves.
import { warmLiveCommerceCatalog } from './liveCommerceCatalog'

const ENROL_PAGES = {
  arabic: () => import('../pages/arabic-enrol'),
  hadith: () => import('../pages/hadith-enrol'),
}

export function warmProgramCheckout() {
  warmLiveCommerceCatalog()
  import('../pages/checkout-waha').catch(() => {})
}

export function warmProgramEnrol(programKey) {
  warmLiveCommerceCatalog()
  ENROL_PAGES[programKey]?.().catch(() => {})
}
