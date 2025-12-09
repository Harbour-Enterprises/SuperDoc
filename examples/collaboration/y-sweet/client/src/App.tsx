import { useEffect, useRef, useState } from 'react';
import { createYjsProvider } from '@y-sweet/client';
import * as Y from 'yjs';
import 'superdoc/style.css';
import { SuperDoc } from 'superdoc';

const AUTH_ENDPOINT = (import.meta.env.VITE_Y_SWEET_AUTH_ENDPOINT as string) || 'http://localhost:3001/api/auth';
const DOC_ID = (import.meta.env.VITE_DOC_ID as string) || 'superdoc-room';

export default function App() {
  const superdocRef = useRef<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = createYjsProvider(ydoc, DOC_ID, AUTH_ENDPOINT);

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
    };
  }, []);

  return (
    <div className='app'>
      <header>
        <h1>SuperDoc + Y-Sweet</h1>
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
