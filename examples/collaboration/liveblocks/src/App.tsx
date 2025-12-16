import { useEffect, useRef, useState } from 'react';
import { createClient } from '@liveblocks/client';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import * as Y from 'yjs';
import 'superdoc/style.css';
import { SuperDoc } from 'superdoc';

const PUBLIC_KEY = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY as string;
const ROOM_ID = (import.meta.env.VITE_ROOM_ID as string) || 'superdoc-room';

export default function App() {
  const superdocRef = useRef<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!PUBLIC_KEY) return;

    const client = createClient({ publicApiKey: PUBLIC_KEY });
    const { room, leave } = client.enterRoom(ROOM_ID);
    const ydoc = new Y.Doc();
    const provider = new LiveblocksYjsProvider(room, ydoc);

    provider.on('sync', (synced: boolean) => {
      if (!synced) return;

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
      leave();
    };
  }, []);

  if (!PUBLIC_KEY) {
    return <div style={{ padding: '2rem' }}>Add VITE_LIVEBLOCKS_PUBLIC_KEY to .env</div>;
  }

  return (
    <div className='app'>
      <header>
        <h1>SuperDoc + Liveblocks</h1>
        <div className='users'>
          {users.map((u, i) => (
            <span key={i} className='user' style={{ background: u.user?.color || '#666' }}>
              {u.user?.name}
            </span>
          ))}
        </div>
      </header>
      <main>
        <div id='superdoc' className='superdoc-container' />
      </main>
    </div>
  );
}
