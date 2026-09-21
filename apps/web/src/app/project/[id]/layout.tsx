import type { Metadata } from 'next';

/**
 * The page itself is a client component, so the route title lives here.
 */
export const metadata: Metadata = {
  title: 'Project',
  description: 'A collaborative Cloro project.',
};

export default function ProjectLayout({ children }: LayoutProps<'/project/[id]'>) {
  return children;
}
