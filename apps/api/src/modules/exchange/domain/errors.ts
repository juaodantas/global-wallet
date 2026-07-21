import { AppError } from '../../../shared/errors/app-error.js';

export const quoteNotFoundError = () => new AppError({ code: 'QUOTE_NOT_FOUND', message: 'Quote not found', statusCode: 404 });
export const quoteExpiredError = () => new AppError({ code: 'QUOTE_EXPIRED', message: 'Quote expired', statusCode: 409 });
export const quoteAlreadyUsedError = () => new AppError({ code: 'QUOTE_ALREADY_USED', message: 'Quote already used', statusCode: 409 });
export const unsupportedCurrencyPairError = () => new AppError({ code: 'UNSUPPORTED_CURRENCY', message: 'Source and target currencies must be different', statusCode: 400 });
