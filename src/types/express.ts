import { Request } from 'express';

export interface DecodedToken {
  _id: string;
  iat?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: { _id: string };
}
