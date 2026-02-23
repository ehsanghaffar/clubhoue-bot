/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Request } from 'express';

export interface DecodedToken {
  _id: string;
  iat?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: { _id: string };
}
