import { expect } from 'chai';
import { Artifact } from '../buildkite/types/artifact';
import { TestFailure, getAnnotation, getSlackMessage, getPrComment } from './annotate';

let mockFailure: TestFailure;
let mockArtifacts: Record<string, Artifact>;

describe('Annotate', () => {
  beforeEach(() => {
    mockFailure = {
      url: 'http://localhost',
      jobId: 'job-id',
      buildId: 'build-id',
      hash: 'hash',
      name: 'test should fail',
      classname: 'Chrome UI Functional Tests.test/functional/apps/console/_console·ts',
      jobName: 'OSS CI Group #1',
    } as TestFailure;

    mockArtifacts = {
      hash: {
        id: 'artifact-id',
      } as Artifact,
    };
  });

  describe('getAnnotation', () => {
    it('should create an annotation without logs link if artifact is missing', () => {
      const annotation = getAnnotation([mockFailure], {});

      expect(annotation).to.eql(
        '**Test Failures**<br />\n[[job]](http://localhost#job-id) OSS CI Group #1 / test should fail',
      );
    });

    it('should create an annotation with logs link if artifact is present', () => {
      const annotation = getAnnotation([mockFailure], mockArtifacts);

      expect(annotation).to.eql(
        '**Test Failures**<br />\n[[job]](http://localhost#job-id) [[logs]](http://localhost/jobs/job-id/artifacts/artifact-id) OSS CI Group #1 / test should fail',
      );
    });
  });

  describe('getSlackMessage', () => {
    it('should create an annotation without logs link if artifact is missing', () => {
      const annotation = getSlackMessage([mockFailure], {});

      expect(annotation).to.eql(
        '*Test Failures*\n<http://localhost#job-id|[job]> OSS CI Group #1 / test should fail',
      );
    });

    it('should create an annotation with logs link if artifact is present', () => {
      const annotation = getSlackMessage([mockFailure], mockArtifacts);

      expect(annotation).to.eql(
        '*Test Failures*\n<http://localhost#job-id|[job]> <http://localhost/jobs/job-id/artifacts/artifact-id|[logs]> OSS CI Group #1 / test should fail',
      );
    });
  });

  describe('getPrComment', () => {
    it('should create an annotation without logs link if artifact is missing', () => {
      const annotation = getPrComment([mockFailure], {});

      expect(annotation).to.eql(
        '### Test Failures\n[[job]](http://localhost#job-id) OSS CI Group #<span></span>1 / test should fail',
      );
    });

    it('should create an annotation with logs link if artifact is present', () => {
      const annotation = getPrComment([mockFailure], mockArtifacts);

      expect(annotation).to.eql(
        '### Test Failures\n[[job]](http://localhost#job-id) [[logs]](http://localhost/jobs/job-id/artifacts/artifact-id) OSS CI Group #<span></span>1 / test should fail',
      );
    });
  });
});
