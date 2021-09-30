import { expect } from 'chai';
import { Artifact } from '../buildkite/types/artifact';
import { TestFailure, getAnnotation, getSlackMessage, getPrComment } from './annotate';

let mockFailure: TestFailure;
let mockArtifacts: Record<string, Artifact>;

describe('Annotate', () => {
  beforeEach(() => {
    mockFailure = {
      url: 'https://buildkite.com/elastic/kibana-pull-request/builds/53',
      jobId: 'job-id',
      buildId: 'build-id',
      hash: 'hash',
      name: 'test should fail',
      classname: 'Chrome UI Functional Tests.test/functional/apps/console/_console·ts',
      jobName: 'OSS CI Group #1',
    } as TestFailure;

    mockArtifacts = {
      'job-idhash': {
        id: 'artifact-id',
      } as Artifact,
    };
  });

  describe('getAnnotation', () => {
    it('should create an annotation without logs link if artifact is missing', () => {
      const annotation = getAnnotation([mockFailure], {});

      expect(annotation).to.eql(
        '**Test Failures**<br />\n[[job]](https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id) OSS CI Group #1 / test should fail',
      );
    });

    it('should create an annotation with logs link if artifact is present', () => {
      const annotation = getAnnotation([mockFailure], mockArtifacts);

      expect(annotation).to.eql(
        '**Test Failures**<br />\n[[job]](https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id) [[logs]](https://buildkite.com/organizations/elastic/pipelines/kibana-pull-request/builds/53/jobs/job-id/artifacts/artifact-id) OSS CI Group #1 / test should fail',
      );
    });
  });

  describe('getSlackMessage', () => {
    it('should create an annotation without logs link if artifact is missing', () => {
      const annotation = getSlackMessage([mockFailure], {});

      expect(annotation).to.eql(
        '*Test Failures*\n<https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id|[job]> OSS CI Group #1 / test should fail',
      );
    });

    it('should create an annotation with logs link if artifact is present', () => {
      const annotation = getSlackMessage([mockFailure], mockArtifacts);

      expect(annotation).to.eql(
        '*Test Failures*\n<https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id|[job]> <https://buildkite.com/organizations/elastic/pipelines/kibana-pull-request/builds/53/jobs/job-id/artifacts/artifact-id|[logs]> OSS CI Group #1 / test should fail',
      );
    });
  });

  describe('getPrComment', () => {
    it('should create an annotation without logs link if artifact is missing', () => {
      const annotation = getPrComment([mockFailure], {});

      expect(annotation).to.eql(
        '### Test Failures\n[[job]](https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id) OSS CI Group #<span></span>1 / test should fail',
      );
    });

    it('should create an annotation with logs link if artifact is present', () => {
      const annotation = getPrComment([mockFailure], mockArtifacts);

      expect(annotation).to.eql(
        '### Test Failures\n[[job]](https://buildkite.com/elastic/kibana-pull-request/builds/53#job-id) [[logs]](https://buildkite.com/organizations/elastic/pipelines/kibana-pull-request/builds/53/jobs/job-id/artifacts/artifact-id) OSS CI Group #<span></span>1 / test should fail',
      );
    });
  });
});
