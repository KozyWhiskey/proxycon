import Image from 'next/image';
import badgeImg from '@/public/proxycon_badge.png';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image
              src={badgeImg}
              alt="ProxyCon 2025 crest"
              priority
              sizes="(max-width: 640px) 240px, (max-width: 1024px) 304px, 360px"
              className="w-48 sm:w-60 h-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.35)]"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ProxyCon Platform</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to access tournaments and track your stats
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />
      </div>
    </div>
  );
}