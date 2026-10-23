import { describe, it, expect } from 'vite-plus/test';
import { act, render } from '@testing-library/react';
import { Suspense, startTransition, useState, type ReactNode } from 'react';
import { useMemoByContent } from './utils';

describe('useMemoByContent and abandoned renders', () => {
  it('keeps the committed value when a transition that changed it never commits', async () => {
    const seen: unknown[] = [];
    let setValue!: (value: { comments: boolean }) => void;
    let suspend!: (on: boolean) => void;
    const never = new Promise(() => {});

    function Probe({ value }: { value: { comments: boolean } }) {
      seen.push(useMemoByContent(value));
      return null;
    }
    function Suspender({ on }: { on: boolean }): ReactNode {
      if (on) throw never;
      return null;
    }
    function App() {
      const [value, set] = useState({ comments: false });
      const [on, setOn] = useState(false);
      setValue = set;
      suspend = setOn;
      return (
        <Suspense fallback={null}>
          <Probe value={value} />
          <Suspender on={on} />
        </Suspense>
      );
    }

    render(<App />);
    const committed = seen.at(-1);
    await act(async () =>
      startTransition(() => {
        setValue({ comments: true });
        suspend(true);
      }),
    );
    await act(async () => {
      setValue({ comments: false });
      suspend(false);
    });
    expect(seen.at(-1)).toBe(committed);
  });
});
