'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api/client';
import type { Project } from '@/lib/api/projects';
import { Button } from '@/components/ui/button';
import { FormError, TextField } from '@/components/ui/field';

export function NewProjectForm() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    // files are added inside the project (FileTree), so a new project starts empty
    const res = await api('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('could not create project');
      return;
    }
    setName('');
    // straight into the new project: that is where files get added
    const project = (await res.json()) as Project;
    router.push(`/project/${project.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <TextField
            label="New project"
            name="name"
            required
            placeholder="checkout-service"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9"
          />
        </div>
        <Button type="submit" disabled={busy} aria-busy={busy} className="h-9 shrink-0 sm:mt-6">
          <Plus aria-hidden="true" />
          Create
        </Button>
      </div>
      {error && <FormError>{error}</FormError>}
    </form>
  );
}
