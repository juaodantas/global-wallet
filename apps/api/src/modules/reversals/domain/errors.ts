import { AppError } from '../../../shared/errors/app-error.js';

export const financialOperationNotFoundError = () =>
  new AppError({ code: 'FINANCIAL_OPERATION_NOT_FOUND', message: 'Operation not found', statusCode: 404 });

export const operationNotReversibleError = () =>
  new AppError({ code: 'FINANCIAL_OPERATION_NOT_REVERSIBLE', message: 'This operation type cannot be reversed', statusCode: 409 });

export const operationAlreadyReversedError = () =>
  new AppError({ code: 'FINANCIAL_OPERATION_ALREADY_REVERSED', message: 'Operation already reversed', statusCode: 409 });
