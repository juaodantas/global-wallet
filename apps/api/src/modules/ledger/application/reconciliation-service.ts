import type { LedgerReconciliationDifference, LedgerRepository } from './ledger-repository.js';

export class LedgerReconciliationService {
  constructor(private readonly repository: Pick<LedgerRepository, 'reconcile'>) {}

  async findDifferences(): Promise<LedgerReconciliationDifference[]> {
    return this.repository.reconcile();
  }
}
