import { expect } from 'chai';
import { CiStatsClient } from './client';
import * as nock from 'nock';
import { format } from 'util';

const TEST_HOST = 'ci-stats.test.host';
const TEST_URL = `https://${TEST_HOST}`;

const mockConsole = {
  _msgs: [] as string[],
  log: (...args: any[]) => {
    mockConsole._msgs.push(`LOG: ${format(...args)}`);
  },
  error: (...args: any[]) => {
    mockConsole._msgs.push(`ERROR: ${format(...args)}`);
  },
};

describe('CiStatsClient', () => {
  before(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    mockConsole._msgs.length = 0;
  });

  after(() => {
    nock.enableNetConnect();
  });

  it('automatically reties on 500 responses', async () => {
    nock(TEST_URL).post('/v1/build').reply(500, `<h1>something went wrong</h1>`);
    nock(TEST_URL)
      .post('/v1/build')
      .reply(200, {
        build: {
          id: 'foo',
        },
      });

    const client = new CiStatsClient({
      hostname: TEST_HOST,
      token: 'foo',
      baseRetryMs: 1,
      console: mockConsole,
    });

    const resp = await client.createBuild();
    expect(resp).to.eql({
      build: {
        id: 'foo',
      },
    });

    expect(nock(TEST_HOST).pendingMocks()).to.eql([]);
    expect(mockConsole._msgs).to.have.length(1);
    expect(mockConsole._msgs[0]).to.satisfy((v: string) =>
      v.startsWith('ERROR: 500 response from https://ci-stats.test.host, retrying in 0.001 seconds'),
    );
  });

  it('automatically reties on request errors', async () => {
    nock(TEST_URL).post('/v1/build').replyWithError('unable to connect to host');
    nock(TEST_URL)
      .post('/v1/build')
      .reply(200, {
        build: {
          id: 'foo',
        },
      });

    const client = new CiStatsClient({
      hostname: TEST_HOST,
      token: 'foo',
      baseRetryMs: 1,
      console: mockConsole,
    });

    const resp = await client.createBuild();
    expect(resp).to.eql({
      build: {
        id: 'foo',
      },
    });

    expect(nock(TEST_HOST).pendingMocks()).to.eql([]);
    expect(mockConsole._msgs).to.have.length(1);
    expect(mockConsole._msgs[0]).to.satisfy((v: string) =>
      v.startsWith('ERROR: undefined response from https://ci-stats.test.host, retrying in 0.001 seconds'),
    );
  });
});