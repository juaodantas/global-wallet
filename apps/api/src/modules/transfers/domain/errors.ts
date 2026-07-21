import { AppError } from '../../../shared/errors/app-error.js';

export const recipientNotFoundError = () => new AppError({ code: 'RECIPIENT_NOT_FOUND', message: 'Recipient not found', statusCode: 404 });
export const sameTransferParticipantError = () => new AppError({ code: 'SAME_TRANSFER_PARTICIPANT', message: 'Transfers to the same user are not allowed', statusCode: 400 });
