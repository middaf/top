import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Custom404() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to signin page after a brief delay
    const timer = setTimeout(() => {
      router.push('/signin')
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  return null
}