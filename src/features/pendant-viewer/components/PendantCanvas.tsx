'use client';

import { useEffect, useRef } from 'react';

export default function PendantCanvas() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const wasm = await import('../../../../public/wasm/pendant.js');
      await wasm.default();
    })();
  }, []);

  return (
    <div className='w-full h-[480px]'>
      <canvas id="pendant-canvas" />
    </div>
  )
}
