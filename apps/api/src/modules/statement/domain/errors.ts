import { AppError } from '../../../shared/errors/app-error.js';

export const financialOperationNotFoundError = () =>
  new AppError({ code: 'FINANCIAL_OPERATION_NOT_FOUND', message: 'Operation not found', statusCode: 404 });
