import { createDraft } from '../jobs';

// The written review of the week, kept outside the screen so it survives going to another tab while it is being written.
export const reviewDraft = createDraft({ text: '', week: '' });
