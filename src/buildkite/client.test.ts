import { expect } from 'chai';
import { BuildkiteClient } from './client';
import { Build } from './types/build';
import { Job } from './types/job';

describe('BuildkiteClient', () => {
  let buildkite: BuildkiteClient;

  beforeEach(() => {
    buildkite = new BuildkiteClient();
  });

  describe('getJobStatus', () => {
    it('returns success if job is successful', async () => {
      const job = {
        id: 'id',
        state: 'passed',
        type: 'script',
      } as Job;

      const build = {
        id: 'id',
        state: 'passed',
        jobs: [job],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).to.eql(true);
    });

    it('returns failure if job is unsuccessful', async () => {
      const job = {
        id: 'id',
        state: 'failed',
        type: 'script',
      } as Job;

      const build = {
        id: 'id',
        state: 'failed',
        jobs: [job],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).to.eql(false);
    });

    it('returns success if retried job is successful', async () => {
      const job = {
        id: 'id_1',
        state: 'failed',
        retried: true,
        retried_in_job_id: 'id_2',
      } as Job;

      const jobRetry = {
        id: 'id_2',
        state: 'passed',
      } as Job;

      const build = {
        id: 'id',
        state: 'passed',
        jobs: [job, jobRetry],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).to.eql(true);
    });

    it('returns failure if retried job is unsuccessful', async () => {
      const job = {
        id: 'id_1',
        state: 'failed',
        retried: true,
        retried_in_job_id: 'id_2',
      } as Job;

      const jobRetry = {
        id: 'id_2',
        state: 'failed',
      } as Job;

      const build = {
        id: 'id',
        state: 'failed',
        jobs: [job, jobRetry],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).to.eql(false);
    });

    it('returns success if job is broken but of type: manual', async () => {
      const job = {
        id: 'id',
        state: 'broken',
        type: 'manual',
      } as Job;

      const build = {
        id: 'id',
        state: 'passed',
        jobs: [job],
      } as Build;

      const result = buildkite.getJobStatus(build, job);
      expect(result.success).to.eql(true);
    });
  });
});
