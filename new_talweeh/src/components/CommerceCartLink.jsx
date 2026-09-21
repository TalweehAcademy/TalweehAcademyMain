import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { readCommerceCartItems, subscribeCommerceCart } from '../data/commerceCart'

export default function CommerceCartLink({ className = '', onNavigate }) {
  const [count, setCount] = useState(() => readCommerceCartItems().length)

  useEffect(() => subscribeCommerceCart((items) => setCount(items.length)), [])

  return (
    <Link
      className={`academy-cart-link ${className}`.trim()}
      to="/cart"
      onClick={onNavigate}
      aria-label={count ? `Enrollment cart with ${count} item${count === 1 ? '' : 's'}` : 'Enrollment cart'}
    >
      <span aria-hidden="true">Cart</span>
      {count > 0 && <b>{count}</b>}
    </Link>
  )
}
