import { LoginForm } from './login-form';

export default function LoginPage() {
  return <LoginForm showGithub={Boolean(process.env.AUTH_GITHUB_ID)} />;
}
