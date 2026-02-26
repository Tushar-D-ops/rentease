import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center">
      <SignIn />
    </div>
  )
}