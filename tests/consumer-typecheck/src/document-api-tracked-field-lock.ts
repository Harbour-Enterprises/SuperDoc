import type { DocumentApi } from 'superdoc/ui';

type ReplaceFailureCode = NonNullable<ReturnType<DocumentApi['replace']>['failure']>['code'];
const lockViolation: ReplaceFailureCode = 'LOCK_VIOLATION';
void lockViolation;
