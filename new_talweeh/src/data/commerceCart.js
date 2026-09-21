const CART_STORAGE_KEY = 'talweeh-commerce-cart-v1'
const HANDOFF_STORAGE_KEY = 'talweeh_commerce_handoff_v1'
const CART_EVENT = 'talweeh-commerce-cart-change'

function browserStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function readCommerceCartItems() {
  const storage = browserStorage()
  if (!storage) return []
  try {
    const raw = JSON.parse(storage.getItem(CART_STORAGE_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .map((item) => ({
        optionId: String(item?.optionId || '').trim(),
        productKey: String(item?.productKey || '').trim(),
      }))
      .filter((item) => item.optionId)
  } catch {
    return []
  }
}

function writeCommerceCartItems(items) {
  const storage = browserStorage()
  if (!storage) return
  const clean = Array.isArray(items)
    ? items
        .map((item) => ({
          optionId: String(item?.optionId || '').trim(),
          productKey: String(item?.productKey || '').trim(),
        }))
        .filter((item) => item.optionId)
        .slice(0, 20)
    : []
  storage.setItem(CART_STORAGE_KEY, JSON.stringify(clean))
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: clean }))
}

export function commerceCartOptionIds() {
  return readCommerceCartItems().map((item) => item.optionId)
}

export function addCommerceCartOption(optionId, productKey = '') {
  const id = String(optionId || '').trim()
  const product = String(productKey || '').trim()
  if (!id) return readCommerceCartItems()

  const current = readCommerceCartItems()
  const next = current.filter((item) => {
    if (item.optionId === id) return false
    if (product && item.productKey && item.productKey === product) return false
    return true
  })
  next.push({ optionId: id, productKey: product })
  writeCommerceCartItems(next)
  return next
}

export function removeCommerceCartOption(optionId) {
  const id = String(optionId || '').trim()
  const next = readCommerceCartItems().filter((item) => item.optionId !== id)
  writeCommerceCartItems(next)
  return next
}

export function clearCommerceCart() {
  writeCommerceCartItems([])
}

export function subscribeCommerceCart(listener) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => listener(readCommerceCartItems())
  window.addEventListener(CART_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(CART_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function rememberCommerceHandoff(value) {
  const handoff = String(value || '').trim().slice(0, 4096)
  if (typeof window === 'undefined') return handoff
  try {
    if (handoff) window.sessionStorage.setItem(HANDOFF_STORAGE_KEY, handoff)
  } catch {
    // Session storage is optional; checkout still works for guests.
  }
  return handoff
}

export function readCommerceHandoff() {
  if (typeof window === 'undefined') return ''
  try {
    return String(window.sessionStorage.getItem(HANDOFF_STORAGE_KEY) || '').trim()
  } catch {
    return ''
  }
}

export { CART_STORAGE_KEY, CART_EVENT }
