export interface StatsSubmissionLike {
  max_score: number;
  submission: { status: string; score: number | null; passed: boolean | null } | null;
}

export interface AssignmentStats {
  total: number;
  notStarted: number;
  inProgress: number;
  inReview: number;
  revisionRequested: number;
  reviewed: number;
  passed: number;
  failed: number;
  averageScorePct: number | null;
}

export function computeAssignmentStats(items: StatsSubmissionLike[]): AssignmentStats {
  const stats: AssignmentStats = {
    total: items.length,
    notStarted: 0,
    inProgress: 0,
    inReview: 0,
    revisionRequested: 0,
    reviewed: 0,
    passed: 0,
    failed: 0,
    averageScorePct: null,
  };

  const gradedPercentages: number[] = [];

  for (const item of items) {
    const submission = item.submission;
    if (!submission) {
      stats.notStarted += 1;
      continue;
    }

    switch (submission.status) {
      case 'IN_PROGRESS':
        stats.inProgress += 1;
        break;
      case 'SUBMITTED':
        stats.inReview += 1;
        break;
      case 'REVISION_REQUESTED':
        stats.revisionRequested += 1;
        break;
      case 'GRADED':
        stats.reviewed += 1;
        if (submission.passed) stats.passed += 1;
        else if (submission.passed === false) stats.failed += 1;
        if (submission.score !== null && item.max_score > 0) {
          gradedPercentages.push((submission.score / item.max_score) * 100);
        }
        break;
    }
  }

  if (gradedPercentages.length > 0) {
    stats.averageScorePct = gradedPercentages.reduce((a, b) => a + b, 0) / gradedPercentages.length;
  }

  return stats;
}
