import LoginForm from './login-form';
import { Brand } from '@/components/layout/brand';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="login-page arena-login">
      <section className="login-form-area">
        <LoginForm nextPath={next} />
      </section>
      <section className="login-story">
        <Brand />
        <div>
          <p className="eyebrow">FOR YOUR NEXT MAGIC WEEKEND</p>
          <h1>
            Your next table.
            <br />
            <em>Your whole weekend.</em>
          </h1>
          <p>Your table, your next opponent, and every result from the weekend. All in one place.</p>
          <span className="login-card-motif" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
        <footer>PROXYCON · MADE FOR THE PLAYGROUP</footer>
      </section>
    </main>
  );
}
