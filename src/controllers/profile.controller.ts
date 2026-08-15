/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { type Request, type Response, type NextFunction } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Joi from 'joi'
import ValidToken from '../models/token.js'
import { constants } from '../config/index.js'
import { createValidationError, createInternalError, createNotFoundError } from '../utils/errors.js'
import { clubService } from '../services/club-api.service.js'
import type { SearchUsersOptions } from '../types/services.js'
import logger from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const addProfileSchema = Joi.object({
  token: Joi.string(),
  name: Joi.string().min(3).max(50).required()
})

const profileLoc = path.join(__dirname, '../../profile.json')

interface ProfileFile {
  auth_token?: string
  deviceId?: string
  token?: string
  tokens?: { auth?: string }
  _debug?: { auth_token?: string }
}

const getUserToken = async (
  name: string
): Promise<{ token: string, name?: string } | null> => {
  return await ValidToken.findOne({ name }).lean()
}

export const addProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { error, value } = addProfileSchema.validate(req.body)
  if (error != null) {
    next(createValidationError(error.details[0].message)); return
  }

  try {
    const data = new ValidToken({
      token: value.token,
      name: value.name
    })
    const dataToSave = await data.save()
    res.status(constants.HTTP_STATUS.OK).json(dataToSave)
  } catch (err) {
    next(err as Error)
  }
}

interface ChangeProfileBody {
  token?: string
}

export const changeProfile = async (
  req: Request<unknown, unknown, ChangeProfileBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!fs.existsSync(profileLoc)) {
      next(createNotFoundError('Profile not found'))
      return
    }

    const ctx: ProfileFile = JSON.parse(fs.readFileSync(profileLoc, 'utf8'))
    const token = req.body.token
    ctx.token = token
    if (ctx.tokens != null) ctx.tokens.auth = token
    if (ctx._debug != null) ctx._debug.auth_token = token
    fs.writeFileSync(profileLoc, JSON.stringify(ctx))

    res.send(ctx)
  } catch (err) {
    logger.error('Error updating profile:', { error: err })
    next(createInternalError('Failed to update profile'))
  }
}

export const searchUsers = async (
  req: Request<unknown, unknown, SearchUsersOptions>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await clubService.searchUsers(req.body)
    res.send(users)
  } catch (error) {
    logger.error('Error searching users:', { error })
    next(createInternalError('Failed to search users'))
  }
}

interface AcceptInviteBody {
  username: string
  channel: string
}

export const acceptInvite = async (
  req: Request<unknown, unknown, AcceptInviteBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { username, channel } = req.body
  try {
    const user = await getUserToken(username)
    if (user == null) {
      next(createNotFoundError(`No stored token found for user: ${username}`))
      return
    }

    // Act as the requested user's identity for this call only, without
    // mutating shared service state.
    const result = await clubService.acceptSpeakerInvite({
      channel,
      token: user.token
    })
    res.send(result)
  } catch (error) {
    logger.error('Error accepting invite:', { error })
    next(createInternalError('Failed to accept invite'))
  }
}

interface GetUserBody {
  user_id: string | number
}

export const getUser = async (
  req: Request<unknown, unknown, GetUserBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await clubService.getUser({ user_id: req.body.user_id })
    res.send(user)
  } catch (error) {
    logger.error('Error getting user:', { error })
    next(createInternalError('Failed to get user'))
  }
}

export const getAllUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await ValidToken.find()
    res.send(users)
  } catch (error) {
    logger.error('Error getting all users:', { error })
    next(createInternalError('Failed to get users'))
  }
}

export const getToken = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!fs.existsSync(profileLoc)) {
      next(createNotFoundError('Profile not found'))
      return
    }
    const ctx: ProfileFile = JSON.parse(fs.readFileSync(profileLoc, 'utf8'))
    res.send(ctx.token ?? '')
  } catch (error) {
    logger.error('Error reading profile:', { error })
    next(createInternalError('Error reading profile'))
  }
}
