import { useEffect, useRef, useState } from 'react';
import { TiptapCollabProvider } from '@tiptap-pro/provider';
import * as Y from 'yjs';
import 'superdoc/style.css';
import { SuperDoc } from 'superdoc';

const APP_ID = import.meta.env.VITE_TIPTAP_APP_ID as string;
const TOKEN = import.meta.env.VITE_TIPTAP_TOKEN as string;
const ROOM_ID = (import.meta.env.VITE_ROOM_ID as string) || 'superdoc-room';

export default function App() {
  const superdocRef = useRef<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!APP_ID || !TOKEN) {
      console.error('Missing VITE_TIPTAP_APP_ID or VITE_TIPTAP_TOKEN');
      return;
    }

    const ydoc = new Y.Doc();
    const provider = new TiptapCollabProvider({
      appId: APP_ID,
      name: ROOM_ID,
      document: ydoc,
      token: TOKEN,
    });

    provider.on('synced', () => {
      superdocRef.current = new SuperDoc({
        selector: '#superdoc',
        documentMode: 'editing',
        user: { name: `User ${Math.floor(Math.random() * 1000)}`, email: 'user@example.com' },
        modules: {
          collaboration: { ydoc, provider },
        },
        onAwarenessUpdate: ({ states }: any) => setUsers(states.filter((s: any) => s.user)),
      });
    });

    return () => {
      superdocRef.current?.destroy();
      provider.destroy();
    };
  }, []);

  return (
    <div className="app">
      <header>
        <h1>SuperDoc + TipTap Cloud</h1>
        <div className="users">
          {users.map((u, i) => (
            <span key={i} className="user" style={{ background: u.user?.color || '#666' }}>
              {u.user?.name}
            </span>
          ))}
        </div>
      </header>
      <main>
        <div id="superdoc" className="superdoc-container" />
      </main>
    </div>
  );
}
