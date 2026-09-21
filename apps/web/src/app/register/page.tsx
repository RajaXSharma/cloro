import type { Metadata } from 'next';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a Cloro account to start a collaborative code project.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
