import { NextRequest } from 'next/server';

const mockPrisma: any = {
  user: { findUnique: jest.fn() },
  weeklyMenu: { count: jest.fn() },
  mealSelection: { count: jest.fn() },
  recipeIngredient: { deleteMany: jest.fn() },
  recipe: { deleteMany: jest.fn(), delete: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const mockGetSession = jest.fn();
jest.mock('@/lib/session', () => ({
  getSessionUserId: (...a: unknown[]) => mockGetSession(...a),
  getAuthErrorResponse: (e: string) => {
    const { NextResponse } = require('next/server');
    return e === 'CONFIG_MISSING'
      ? NextResponse.json({ error: 'cfg' }, { status: 500 })
      : NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  },
}));

const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();
jest.mock('fs/promises', () => ({
  writeFile: (...a: unknown[]) => mockWriteFile(...a),
  mkdir: (...a: unknown[]) => mockMkdir(...a),
}));

import { deleteNutritionistRecipe } from '@/controllers/nutritionistController';
import { POST as upload } from '@/app/api/upload/route';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockPrisma.user.findUnique.mockResolvedValue({ role: 'NUTRITIONIST' });
  mockPrisma.$transaction.mockImplementation((arg: any) =>
    typeof arg === 'function' ? arg(mockPrisma) : Promise.all(arg));
  mockPrisma.weeklyMenu.count.mockResolvedValue(0);
  mockPrisma.mealSelection.count.mockResolvedValue(0);
  mockPrisma.recipeIngredient.deleteMany.mockReturnValue('DEL_INGREDIENTS');
  mockPrisma.recipe.deleteMany.mockReturnValue({ count: 1 });
  mockGetSession.mockResolvedValue({ userId: 'n1' });
  mockWriteFile.mockResolvedValue(undefined);
  mockMkdir.mockResolvedValue(undefined);
});

describe('deleteNutritionistRecipe', () => {
  it('deletes ingredient rows then the recipe in one $transaction', async () => {
    const r: any = await deleteNutritionistRecipe('n1', 'rec1');
    expect(r.status).toBe(200);
    expect(mockPrisma.recipeIngredient.deleteMany).toHaveBeenCalledWith({ where: { recipeId: 'rec1' } });
    expect(mockPrisma.recipe.deleteMany).toHaveBeenCalledWith({ where: { id: 'rec1' } });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction.mock.calls[0][0]).toEqual(['DEL_INGREDIENTS', { count: 1 }]);
  });

  it('409 when used in a weekly menu, nothing deleted', async () => {
    mockPrisma.weeklyMenu.count.mockResolvedValue(2);
    const r: any = await deleteNutritionistRecipe('n1', 'rec1');
    expect(r.status).toBe(409);
    expect(r.error).toContain('2 menu mingguan');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.recipeIngredient.deleteMany).not.toHaveBeenCalled();
  });

  it('409 when a customer meal selection uses it', async () => {
    mockPrisma.mealSelection.count.mockResolvedValue(1);
    expect(((await deleteNutritionistRecipe('n1', 'rec1')) as any).status).toBe(409);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('404 when the recipe does not exist', async () => {
    mockPrisma.recipe.deleteMany.mockReturnValue({ count: 0 });
    expect(((await deleteNutritionistRecipe('n1', 'nope')) as any).status).toBe(404);
  });

  it('ADMIN may delete', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    expect(((await deleteNutritionistRecipe('a1', 'rec1')) as any).status).toBe(200);
  });

  it('USER gets 403 and nothing is counted or deleted', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'USER' });
    expect(((await deleteNutritionistRecipe('u1', 'rec1')) as any).status).toBe(403);
    expect(mockPrisma.weeklyMenu.count).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('POST /api/upload', () => {
  const send = (file?: File | string) => {
    const fd = new FormData();
    if (file !== undefined) fd.append('file', file as any);
    return upload(new NextRequest('http://localhost/api/upload', { method: 'POST', body: fd }));
  };
  const img = (type: string, name = 'photo.jpg', size = 10) => new File([new Uint8Array(size)], name, { type });

  it.each([
    ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/gif', 'gif'],
  ])('accepts %s and names the file .%s', async (type, ext) => {
    const res = await send(img(type));
    expect(res.status).toBe(200);
    const { url } = await res.json();
    expect(url).toMatch(new RegExp(`^/uploads/recipe-[0-9a-f-]{36}\\.${ext}$`));
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(String(mockWriteFile.mock.calls[0][0])).toMatch(new RegExp(`public[\\\\/]uploads[\\\\/]recipe-.*\\.${ext}$`));
  });

  it('extension comes from MIME, not the filename (evil.html sent as image/png -> .png)', async () => {
    const { url } = await (await send(img('image/png', 'evil.html'))).json();
    expect(url).toMatch(/\.png$/);
    expect(url).not.toContain('evil');
  });

  it('path traversal in the filename is ignored', async () => {
    await send(img('image/png', '../../../etc/passwd.png'));
    expect(String(mockWriteFile.mock.calls[0][0])).not.toContain('..');
  });

  it.each([
    ['text/html', 'page.html'], ['image/svg+xml', 'x.svg'], ['application/javascript', 'x.js'], ['', 'photo.jpg'],
  ])('rejects %s (%s)', async (type, name) => {
    const res = await send(img(type, name));
    expect(res.status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('rejects files over 5 MB', async () => {
    const res = await send(img('image/png', 'big.png', 5 * 1024 * 1024 + 1));
    expect(res.status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('accepts exactly 5 MB', async () => {
    expect((await send(img('image/png', 'ok.png', 5 * 1024 * 1024))).status).toBe(200);
  });

  it('400 when no file is sent', async () => {
    expect((await send()).status).toBe(400);
  });

  it('400 when "file" is a text field, not a file', async () => {
    expect((await send('hello')).status).toBe(400);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('401 when logged out, before reading the body', async () => {
    mockGetSession.mockResolvedValue({ error: 'UNAUTHENTICATED' });
    expect((await send(img('image/png'))).status).toBe(401);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('403 for a USER', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'USER' });
    expect((await send(img('image/png'))).status).toBe(403);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('ADMIN may upload', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    expect((await send(img('image/png'))).status).toBe(200);
  });

  it('500 when the disk write fails', async () => {
    mockWriteFile.mockRejectedValue(new Error('EACCES'));
    expect((await send(img('image/png'))).status).toBe(500);
  });
});
