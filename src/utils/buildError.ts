/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import HttpStatus from 'http-status-codes';

interface JoiError {
  isJoi?: boolean;
  details?: Array<{
    message: string;
    path: string[];
  }>;
}

interface BoomError {
  isBoom?: boolean;
  output?: {
    statusCode: number;
    payload: {
      message?: string;
      error?: string;
    };
  };
}

interface BuildErrorResult {
  code: number;
  message: string;
  details?: Array<{
    message: string;
    param: string;
  }>;
}

function buildError(err: Error & JoiError & BoomError): BuildErrorResult {
  if (err.isJoi) {
    return {
      code: HttpStatus.BAD_REQUEST,
      message: HttpStatus.getStatusText(HttpStatus.BAD_REQUEST),
      details:
        err.details?.map((detail) => ({
          message: detail.message,
          param: detail.path.join('.'),
        })) ?? [],
    };
  }

  if (err.isBoom && err.output) {
    return {
      code: err.output.statusCode,
      message: err.output.payload.message ?? err.output.payload.error ?? 'Unknown error',
    };
  }

  return {
    code: HttpStatus.INTERNAL_SERVER_ERROR,
    message: HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR),
  };
}

export default buildError;
