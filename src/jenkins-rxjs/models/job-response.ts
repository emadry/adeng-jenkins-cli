import { overestimeThreshold, pessimisticThreshold } from '../utils';
import { BuildResponse } from './build-response';
import {
  getQueueItemRemainingDuration,
  isQueueItemDone,
  isQueueItemQuiet,
  QueueItem,
  QueueItemDone,
  QueueItemQueued,
  QueueItemQuiet,
} from './queue-response';

export type JobStatus = 'FAILURE' | 'SUCCESS' | 'PROGRESS';

export type JobResponse = JobProgress | JobDone;

interface JobResponseBase {
  name: string;
  url: string;
  text: string;
  status: JobStatus;
}

export interface JobProgress extends JobResponseBase {
  status: 'PROGRESS';
  started: number;
  estimatedEnd: number;
}

export function isJobProgress(input: JobResponse): input is JobProgress {
  return input.status === 'PROGRESS';
}

export interface JobDone extends JobResponseBase {
  id: number;
  status: 'FAILURE' | 'SUCCESS';
}

export function isJobDone(input: JobResponse): input is JobDone {
  return !isJobProgress(input);
}

export function jobResponseFromQueue(
  queue: QueueItem | QueueItemQuiet | QueueItemQueued | QueueItemDone,
): JobResponse {
  const response = {
    name: queue.task.name,
    url: queue.task.url,
  };

  if (!!queue.cancelled) {
    return {
      ...response,
      text: 'Job has been cancelled',
      status: 'FAILURE',
    } as JobDone;
  }

  if (!!queue.stuck) {
    return {
      ...response,
      text: 'Job stuck',
      status: 'FAILURE',
    } as JobDone;
  }

  if (isQueueItemDone(queue)) {
    return {
      ...response,
      text: 'Item has started building',
      id: queue.executable.number,
      status: 'SUCCESS',
    } as JobDone;
  }

  return {
    ...response,
    text: isQueueItemQuiet(queue) ? 'Item in quiet state' : 'Item in the queue',
    status: 'PROGRESS',
    started: queue.inQueueSince,
    estimatedEnd: +new Date() + getQueueItemRemainingDuration(queue),
  } as JobProgress;
}

export function jobResponseFromBuild(build: BuildResponse): JobResponse {
  const response = {
    name: build.fullDisplayName,
    url: build.url,
  };

  if (!build.duration) {
    const estimatedEnd = build.estimatedDuration + build.timestamp;

    return {
      ...response,
      text: 'Build in progress',
      status: 'PROGRESS',
      started: build.timestamp,
      estimatedEnd:
        estimatedEnd > +new Date()
          ? estimatedEnd + pessimisticThreshold
          : +new Date() + overestimeThreshold,
    } as JobProgress;
  }

  if (!!build.result && build.result === 'SUCCESS') {
    return {
      ...response,
      text: 'Build finished',
      id: build.number,
      status: 'SUCCESS',
    } as JobDone;
  }

  return {
    ...response,
    text: `Build failed with response: ${build.result}`,
    status: 'FAILURE',
  } as JobDone;
}

export function getJobProgressPercentage(response: JobProgress): number {
  const duration = getJobProgressEstimatedDuration(response);
  const elapsed = getJobProgressElapsedTime(response);

  return elapsed / duration;
}

export function getJobProgressEstimatedRemainingTime(response: JobProgress): number {
  const remaining = response.estimatedEnd - +new Date();

  return zeroGuard(remaining);
}

export function getJobProgressEstimatedDuration(response: JobProgress): number {
  const duration = response.estimatedEnd - response.started;

  return zeroGuard(duration);
}

export function getJobProgressElapsedTime(response: JobProgress): number {
  const elapsed = +new Date() - response.started;

  return zeroGuard(elapsed);
}

function zeroGuard(input: number): number {
  return input > 0 ? input : 0;
}
