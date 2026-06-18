const mockStore = {
  get: jest.fn(),
  setJSON: jest.fn()
};

jest.mock('@netlify/blobs', () => ({
  getStore: jest.fn(() => mockStore),
  connectLambda: jest.fn()
}));

const { handler } = require('../../netlify/functions/track');

function postEvent(body, headers = {}) {
  return {
    httpMethod: 'POST',
    headers,
    body: JSON.stringify(body)
  };
}

describe('visitor analytics track function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.get.mockImplementation(async (key) => {
      if (key === 'events') return [];
      if (key === 'visitors') return { nextNumber: 1, byId: {} };
      return null;
    });
  });

  test('does not save events before cookie consent is accepted', async () => {
    const res = await handler(postEvent({ consent: 'rejected', visitorId: 'pmv-no-consent' }));

    expect(res.statusCode).toBe(202);
    expect(JSON.parse(res.body)).toEqual({ success: true, skipped: true });
    expect(mockStore.setJSON).not.toHaveBeenCalled();
  });

  test('saves accepted mobile and platform details', async () => {
    const res = await handler(postEvent({
      consent: 'accepted',
      visitorId: 'pmv-mobile-user',
      page: '/kripto.html',
      title: 'Kripto',
      referrer: 'https://example.com',
      device: {
        deviceType: 'Mobil',
        platform: 'iOS',
        language: 'tr-TR',
        screen: '390x844',
        viewport: '390x700',
        timezone: 'Europe/Istanbul',
        touch: true,
        cookies: true,
        connection: '4g'
      }
    }, {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
      'accept-language': 'tr-TR,tr;q=0.9',
      'x-forwarded-for': '203.0.113.10',
      'cf-ipcountry': 'TR'
    }));

    expect(res.statusCode).toBe(200);
    const eventsCall = mockStore.setJSON.mock.calls.find(([key]) => key === 'events');
    expect(eventsCall).toBeTruthy();
    const savedEvent = eventsCall[1][0];
    expect(savedEvent).toMatchObject({
      visitorId: 'pmv-mobile-user',
      page: '/kripto.html',
      deviceType: 'Mobil',
      platform: 'iOS',
      language: 'tr-TR',
      screen: '390x844',
      viewport: '390x700',
      timezone: 'Europe/Istanbul',
      touch: true,
      cookies: true,
      connection: '4g',
      country: 'TR'
    });
  });

  test('falls back to mobile detection from user agent when device body is missing', async () => {
    await handler(postEvent({ consent: 'accepted', visitorId: 'pmv-android-user' }, {
      'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36'
    }));

    const eventsCall = mockStore.setJSON.mock.calls.find(([key]) => key === 'events');
    expect(eventsCall[1][0].deviceType).toBe('Mobil');
  });
});
