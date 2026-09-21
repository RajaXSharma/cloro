import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Cloro with GitHub or your email and password.',
};

export default function LoginPage() {
  return <LoginForm showGithub={Boolean(process.env.AUTH_GITHUB_ID)} />;
}
