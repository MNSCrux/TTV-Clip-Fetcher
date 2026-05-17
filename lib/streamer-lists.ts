import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getActiveStreamerList() {
  return prisma.streamerList.findFirst({
    where: { is_active: true },
    orderBy: { id: 'asc' },
  });
}

export async function resolveStreamerListId(
  listId?: number | string | null
): Promise<number> {
  if (listId != null && listId !== '') {
    const parsed = typeof listId === 'number' ? listId : parseInt(String(listId), 10);
    if (!Number.isFinite(parsed)) {
      throw new Error('Invalid listId');
    }
    const list = await prisma.streamerList.findUnique({ where: { id: parsed } });
    if (!list) {
      throw new Error('Streamer list not found');
    }
    return parsed;
  }

  const active = await getActiveStreamerList();
  if (!active) {
    throw new Error('No active streamer list');
  }
  return active.id;
}

export function parseOptionalListId(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
