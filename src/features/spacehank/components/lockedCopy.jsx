// What a guest sees in place of each private tab: what it is, and why it is closed. (Dev Pulse is public data, so it is open.)

const lock = (eyebrow, title, accent, description, why) => ({
  eyebrow,
  title: (
    <>
      {title} <em>{accent}</em>
    </>
  ),
  description,
  why,
});

const own = 'It lives in the owner\'s browser and is never shared, so there is nothing to show here. Sign in on your own device to use it.';

export const LOCKED = {
  rag: lock('HANK RAG / PRIVATE CHANNEL', 'Hank', 'RAG.', 'Ask questions of your own documents and data, with sources.', 'It reads private documents, so it is closed in the demo. Sign in to ask Hank.'),
  docs: lock('KNOWLEDGE', 'Document', 'Vault.', 'Upload files and make them searchable.', 'The vault holds private files, so it is closed in the demo. Sign in to open it.'),
  notes: lock('PRIVATE NOTES', 'Second', 'Brain.', 'Notes and a daily journal you can ask questions of.', `Notes are personal. ${own}`),
  constellation: lock('KNOWLEDGE', 'Your', 'Constellation.', 'Your notes as a sky, drawn together by tags and links.', `It is made from private notes. ${own}`),
  memos: lock('CAPTURE', 'Voice', 'Memos.', 'Record a thought and keep it, with a transcript.', `Recordings are personal. ${own}`),
  music: lock('PRIVATE LIBRARY', 'Hank', 'Music.', 'A private player for the owner\'s own songs, kept on their device.', own),
  missions: lock('PLAN', 'Mission', 'Board.', 'A board of cards you can hand to AI agents.', `It holds the owner's tasks and can send work to the agents. ${own}`),
  study: lock('LEARN', 'Study', 'Hub.', 'Courses, deadlines, flashcards and a focus timer.', `It holds personal study plans. ${own}`),
  habits: lock('LIFE', 'Habit', 'Garden.', 'Habits as plants that grow when you keep them up.', `It holds personal habits. ${own}`),
  wallet: lock('MONEY', 'My', 'Wallet.', 'A spending log that understands "ăn trưa 45k".', `Money is private. ${own}`),
  shell: lock('BUILD', 'Hank', 'Shell.', 'A command line for the whole workspace.', 'It can give tasks to agents and change private data, so it is closed in the demo. Sign in to use it.'),
};
