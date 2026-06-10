/**
 * Immutable edit operations for the results-chain board shape
 * (`ResultsChainBoard`) shared by Advanced versions 2, 4 and 5.
 *
 * Each function returns a new board with the requested structural change —
 * add / delete / relabel a group, add (link) / delete / relabel / re-track a
 * chip — so the editable views can drive edits without duplicating the
 * spread-and-map plumbing.
 */
import type { Indicator } from './ecno-indicators';
import type {
  ResultsChainBoard,
  ResultsChainItem,
  ResultsGroup,
  ResultsTrack,
} from './results-chain-v2';

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Build a chip from a catalogue indicator (the link target picked in edit mode). */
export function chipFromIndicator(ind: Indicator, track: ResultsTrack): ResultsChainItem {
  return {
    refId: uid('rc'),
    code: ind.code ?? '•',
    label: ind.name,
    indicatorIds: [ind.id],
    track,
    sector: ind.category,
  };
}

export function updateGroup(
  board: ResultsChainBoard,
  groupId: string,
  patch: Partial<Pick<ResultsGroup, 'name' | 'blurb' | 'color'>>,
): ResultsChainBoard {
  return {
    ...board,
    groups: board.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
  };
}

export function deleteGroup(board: ResultsChainBoard, groupId: string): ResultsChainBoard {
  return {
    ...board,
    groups: board.groups
      .filter((g) => g.id !== groupId)
      .map((g, i) => ({ ...g, index: i + 1 })),
  };
}

export function addGroup(board: ResultsChainBoard): ResultsChainBoard {
  const group: ResultsGroup = {
    // Custom groups use a uid; the typed union only matters for the published
    // builders, which never run on an edited board.
    id: uid('grp') as ResultsGroup['id'],
    index: board.groups.length + 1,
    name: 'New group',
    blurb: 'Describe this group',
    color: '#3D6E8C',
    items: [],
  };
  return { ...board, groups: [...board.groups, group] };
}

export function addItem(
  board: ResultsChainBoard,
  groupId: string,
  track: ResultsTrack,
  ind: Indicator,
): ResultsChainBoard {
  const item = chipFromIndicator(ind, track);
  return {
    ...board,
    groups: board.groups.map((g) => (g.id === groupId ? { ...g, items: [...g.items, item] } : g)),
  };
}

export function updateItem(
  board: ResultsChainBoard,
  refId: string,
  patch: Partial<Pick<ResultsChainItem, 'label' | 'track'>>,
): ResultsChainBoard {
  return {
    ...board,
    groups: board.groups.map((g) => ({
      ...g,
      items: g.items.map((it) => (it.refId === refId ? { ...it, ...patch } : it)),
    })),
  };
}

export function deleteItem(board: ResultsChainBoard, refId: string): ResultsChainBoard {
  return {
    ...board,
    groups: board.groups.map((g) => ({
      ...g,
      items: g.items.filter((it) => it.refId !== refId),
    })),
  };
}
