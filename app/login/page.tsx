import LoginForm from './login-form';
import { Brand } from '@/components/layout/brand';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
 const { next } = await searchParams;
 return <main className="login-page"><section className="login-story"><Brand /><div><p className="eyebrow" style={{color:'#bbacee'}}>FOR YOUR NEXT MAGIC WEEKEND</p><h1>Your next table.<br />Your whole weekend.</h1><p>Your table, your next opponent, and every result from the weekend. All in one place.</p></div><footer>PROXYCON · MADE FOR THE PLAYGROUP</footer></section><section className="login-form-area"><LoginForm nextPath={next} /></section></main>;
}
