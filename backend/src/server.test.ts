import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  config: { PORT: 10000 },
  createApp: vi.fn(),
  listen: vi.fn(),
}));

vi.mock('./config.js', () => ({ loadConfig: () => mocks.config }));
vi.mock('./app.js', () => ({ createApp: mocks.createApp }));

describe('server', () => {
  it('Render için PORT üzerinde tüm ağ arayüzlerinde dinler', async () => {
    mocks.listen.mockImplementation((_port: number, _host: string, onListening: () => void) => {
      onListening();
      return {};
    });
    mocks.createApp.mockReturnValue({ listen: mocks.listen });
    const info = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      await import('./server.js');
      expect(mocks.listen).toHaveBeenCalledWith(10000, '0.0.0.0', expect.any(Function));
      expect(info).toHaveBeenCalledWith('server_listening', { port: 10000 });
    } finally {
      info.mockRestore();
    }
  });
});
