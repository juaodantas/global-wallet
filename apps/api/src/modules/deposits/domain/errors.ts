import { AppError } from '../../../shared/errors/app-error.js';

export const depositNotFoundError = () => new AppError({ code: 'DEPOSIT_NOT_FOUND', message: 'Deposit not found', statusCode: 404 });
export const depositAlreadyConfirmedError = () => new AppError({ code: 'DEPOSIT_ALREADY_CONFIRMED', message: 'Deposit is already confirmed', statusCode: 409 });
export const depositNotConfirmableError = () => new AppError({ code: 'DEPOSIT_NOT_CONFIRMABLE', message: 'Deposit cannot be confirmed', statusCode: 409 });
