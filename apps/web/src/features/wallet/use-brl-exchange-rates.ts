'use client';

import { useEffect, useState } from 'react';
import type { BrlExchangeRatesDto } from '@global-wallet/contracts';
import { getBrlExchangeRates } from '../../lib/api/exchange-api';

export type BrlExchangeRatesState = { status: 'loading' } | { status: 'success'; data: BrlExchangeRatesDto } | { status: 'error' };

export function useBrlExchangeRates(): BrlExchangeRatesState {
  const [state, setState] = useState<BrlExchangeRatesState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getBrlExchangeRates()
      .then((data) => {
        if (active) setState({ status: 'success', data });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
