/**
 * /frameworks — Sector assessment frameworks from the ESABCC report
 * 'Towards EU climate neutrality', rendered as an interactive, editable board
 * of connected cards whose indicator nodes link into the indicator database.
 */
import type { Metadata } from 'next';
import FrameworkExplorer from '@/components/frameworks/FrameworkExplorer';

export const metadata: Metadata = {
  title: 'Sector frameworks · ESABCC MethodHub',
  description:
    "The ESABCC report's sector assessment frameworks as a connected, editable board of cards linked to the indicator database.",
};

export default function FrameworksPage() {
  return <FrameworkExplorer />;
}
