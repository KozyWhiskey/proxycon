import { unstable_rethrow } from 'next/navigation';
import { LiveSnapshot } from '@/components/events/live-snapshot';
import type { ReactNode } from 'react';

/** Redirects/notFound retain Next semantics; retrieval errors retain the prior client snapshot. */
export function withLiveSnapshot<Props>(page: (props: Props) => ReactNode | Promise<ReactNode>) {
  return async function LivePage(props: Props) {
    let content: ReactNode;
    let failed = false;
    try {
      content = await page(props);
    } catch (error) {
      unstable_rethrow(error);
      failed = true;
    }
    return <LiveSnapshot failed={failed} fetchedAt={new Date().toISOString()}>{content}</LiveSnapshot>;
  };
}
