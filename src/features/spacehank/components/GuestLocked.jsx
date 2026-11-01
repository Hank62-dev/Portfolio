import { LockKeyhole } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader } from '../../../design-system';

/** What a guest sees in place of a private area: what it is, and why it is closed. */
export default function GuestLocked({ eyebrow, title, description, why, onSignIn }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <Card>
        <EmptyState
          icon={LockKeyhole}
          title="Private to the owner"
          description={why}
          action={
            <Button size="sm" onClick={onSignIn}>
              Sign in
            </Button>
          }
        />
      </Card>
    </div>
  );
}
