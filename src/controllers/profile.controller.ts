import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import Joi from 'joi';
import ValidToken from '../models/token';
import { constants } from '../config';
import { createValidationError, createInternalError } from '../utils/errors';
import { clubService } from '../services/club-api.service';
import logger from '../utils/logger';

const addProfileSchema = Joi.object({
  token: Joi.string().hex().length(40).required(),
  name: Joi.string().min(3).max(50).required(),
});

const profileLoc = path.join(__dirname, '../../profile.json');

interface ProfileData {
  token?: string;
  deviceId?: string;
}

interface ProfileFile {
  auth_token?: string;
  deviceId?: string;
  token?: string;
  tokens?: { auth?: string };
  _debug?: { auth_token?: string };
}

let profile: ProfileData = {};

if (fs.existsSync(profileLoc)) {
  try {
    const ctx: ProfileFile = JSON.parse(fs.readFileSync(profileLoc, 'utf8'));
    profile.token = ctx.auth_token;
    profile.deviceId = ctx.deviceId;
  } catch (e) {
    logger.error('Error loading profile:', { error: e });
  }
}

const getUserToken = async (
  name: string
): Promise<{ token: string; name?: string } | null> => {
  try {
    const user = await ValidToken.findOne({ name }).lean();
    return user;
  } catch (error) {
    logger.error('Error getting user token:', { error });
    return null;
  }
};

export const addProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { error, value } = addProfileSchema.validate(req.body);
  if (error) {
    return next(createValidationError(error.details[0].message));
  }

  try {
    const data = new ValidToken({
      token: value.token,
      name: value.name,
    });
    const dataToSave = await data.save();
    res.status(constants.HTTP_STATUS.OK).json(dataToSave);
  } catch (err) {
    next(createInternalError('Failed to save profile'));
  }
};

export const changeProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.body as { token?: string };
  try {
    if (fs.existsSync(profileLoc)) {
      const ctx: ProfileFile = JSON.parse(fs.readFileSync(profileLoc, 'utf8'));
      ctx.token = user?.token;
      if (ctx.tokens) ctx.tokens.auth = user?.token;
      if (ctx._debug) ctx._debug.auth_token = user?.token;
      fs.writeFileSync(profileLoc, JSON.stringify(ctx));
      res.send(ctx);
    } else {
      res.status(404).send({ error: 'Profile not found' });
    }
  } catch (err) {
    logger.error('Error updating profile:', { error: err });
    next(createInternalError('Failed to update profile'));
  }
};

export const searchUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  const query = req.body;
  try {
    const users = await clubService.searchUsers(query);
    res.send(users);
  } catch (error) {
    logger.error('Error searching users:', { error });
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Error...');
  }
};

export const acceptInvite = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { username, channel } = req.body as { username: string; channel: string };
  try {
    const user = await getUserToken(username);
    if (user) {
      profile.token = user.token;
    }
    const result = await clubService.acceptSpeakerInvite({ channel });
    res.send(result);
  } catch (error) {
    logger.error('Error accepting invite:', { error });
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Error...');
  }
};

export const getUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { user_id } = req.body as { user_id: string };
  try {
    const user = await clubService.getUser({ user_id });
    res.send(user);
  } catch (error) {
    logger.error('Error getting user:', { error });
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Error...');
  }
};

export const getAllUsers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await ValidToken.find();
    res.send(users);
  } catch (error) {
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).send(error);
  }
};

export const getToken = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    if (fs.existsSync(profileLoc)) {
      const ctx: ProfileFile = JSON.parse(fs.readFileSync(profileLoc, 'utf8'));
      res.send(ctx.token ?? '');
    } else {
      res.status(404).send('Profile not found');
    }
  } catch (error) {
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Error reading profile');
  }
};
