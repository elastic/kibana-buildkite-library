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

const startWith = (startsWith: string) => (v: string) => {
  return typeof v === 'string' && v.startsWith(startsWith);
};

describe('CiStatsClient', () => {
  before(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    mockConsole._msgs.length = 0;
    const pending = nock(TEST_HOST).pendingMocks();
    nock.cleanAll();
    if (pending.length) {
      throw new Error(`nock() contained unmatched mocks: ${format(pending)}`);
    }
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

    expect(mockConsole._msgs).to.have.length(1);
    expect(mockConsole._msgs[0]).to.satisfy((v: string) =>
      v.startsWith('ERROR: undefined response from https://ci-stats.test.host, retrying in 0.001 seconds'),
    );
  });

  it('retries up to 5 times', async () => {
    nock(TEST_URL).post('/v1/build').replyWithError('(1) unable to connect to host');
    nock(TEST_URL).post('/v1/build').replyWithError('(2) unable to connect to host');
    nock(TEST_URL).post('/v1/build').replyWithError('(3) unable to connect to host');
    nock(TEST_URL).post('/v1/build').replyWithError('(4) unable to connect to host');
    nock(TEST_URL).post('/v1/build').replyWithError('(5) unable to connect to host');

    const client = new CiStatsClient({
      hostname: TEST_HOST,
      token: 'foo',
      baseRetryMs: 1,
      console: mockConsole,
    });

    let error: Error | undefined;
    try {
      await client.createBuild();
      throw new Error('expected client.createBuild() to throw');
    } catch (_e) {
      error = _e;
    }

    expect(error?.message).to.eql('(5) unable to connect to host');

    expect(mockConsole._msgs).to.have.length(4);
    expect(mockConsole._msgs[0]).to.satisfy(
      startWith('ERROR: undefined response from https://ci-stats.test.host, retrying in 0.001 seconds'),
    );
    expect(mockConsole._msgs[1]).to.satisfy(
      startWith('ERROR: undefined response from https://ci-stats.test.host, retrying in 0.002 seconds'),
    );
    expect(mockConsole._msgs[2]).to.satisfy(
      startWith('ERROR: undefined response from https://ci-stats.test.host, retrying in 0.003 seconds'),
    );
    expect(mockConsole._msgs[3]).to.satisfy(
      startWith('ERROR: undefined response from https://ci-stats.test.host, retrying in 0.004 seconds'),
    );
  });
});
