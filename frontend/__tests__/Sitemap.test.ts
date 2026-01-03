import sitemap from '@/app/sitemap';

// 1. MOCKA CONFIG-MODULEN
jest.mock('@/lib/config', () => ({
  __esModule: true,
  default: 'http://mock-api', // API_URL
  BASE_URL: 'https://test.com', // Det värde vi vill testa
}));

// 2. MOCKA FETCH
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  const urlString = url.toString();

  if (urlString.includes('/categories')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ slug: 'test-kategori', updated_at: '2024-01-01' }]),
    });
  }
  if (urlString.includes('/products')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        data: [{ slug: 'test-produkt', category: { slug: 'test-kategori' } }] 
      }),
    });
  }
  return Promise.resolve({ ok: false });
});

describe('Sitemap Generator', () => {
  it('genererar URL:er korrekt med BASE_URL', async () => {
    const result = await sitemap();
    
    // Vi förväntar oss Hem, Deals, 1 Kategori, 1 Produkt = 4 entries
    expect(result.length).toBeGreaterThanOrEqual(4);

    // Kolla att domänen från mocken används
    const productEntry = result.find(r => r.url.includes('test-produkt'));
    
    expect(productEntry?.url).toBe('https://test.com/test-kategori/test-produkt');
  });
});