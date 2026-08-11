/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { type Request, type Response, type NextFunction } from 'express'
import { clubService } from '../platforms/clubhouse/index.js'
import { channelService } from '../services/channel.service.js'
import ValidToken from '../models/token.js'
import { startPingLoop, stopPingLoop } from '../utils/pingManager.js'
import { createInternalError, createValidationError } from '../utils/errors.js'
import logger from '../utils/logger.js'

interface JoinRoomBody {
  channel: string
}

interface LeaveRoomBody {
  channel: string
}

interface GetChannelMsgsBody {
  channel: string
  order?: number
}

interface SendMessageBody {
  channel: string
  message: string
}

interface EmojiReactionBody {
  channel: string
  emoji: string
}

export const findClientToken = async (
  clientName: string
): Promise<{ token: string, name?: string } | string> => {
  try {
    const client = await ValidToken.findOne({ name: clientName }).lean()
    return client ?? 'Client not found'
  } catch (err) {
    return `Error: ${err}`
  }
}

export const getFeed = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const feed = await channelService.getChannelFeed()
    res.send(feed)
  } catch (error) {
    logger.error('Error getting channel feed:', { error })
    next(createInternalError('Failed to get channel feed'))
  }
}

export const joinRoom = async (
  req: Request<unknown, unknown, JoinRoomBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channel } = req.body
    const result = await channelService.joinChannelWithInviteHandling(channel)

    if (result) {
      startPingLoop(channel)
    }

    res.send(result)
  } catch (error) {
    logger.error('Error joining room:', { error })
    next(createInternalError('Failed to join room'))
  }
}

export const leaveRoom = async (
  req: Request<unknown, unknown, LeaveRoomBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channel } = req.body
    stopPingLoop(channel)
    const result = await clubService.leaveChannel({ channel })
    res.send(result)
  } catch (error) {
    logger.error('Error leaving room:', { error })
    next(createInternalError('Failed to leave room'))
  }
}

export const acceptInvite = async (
  req: Request<unknown, unknown, LeaveRoomBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channel } = req.body
    const result = await clubService.acceptSpeakerInvite({ channel })
    res.send(result)
  } catch (error) {
    logger.error('Error accepting invite:', { error })
    next(createInternalError('Failed to accept invite'))
  }
}

export const getChannelMsgs = async (
  req: Request<unknown, unknown, GetChannelMsgsBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channel, order } = req.body
    const result = await channelService.getChannelMessages({ channel, order })
    res.send(result)
  } catch (error) {
    logger.error('Error getting channel messages:', { error })
    next(createInternalError('Failed to get channel messages'))
  }
}

export const sendMessageToRoom = async (
  req: Request<unknown, unknown, SendMessageBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channel, message } = req.body
    const result = await channelService.sendChannelMessage({
      channel,
      message
    })
    res.send(result)
  } catch (error) {
    logger.error('Error sending message to room:', { error })
    next(createInternalError('Failed to send message'))
  }
}

export const myProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profile = await channelService.getUserProfile()
    res.send(profile)
  } catch (error) {
    logger.error('Error getting user profile:', { error })
    next(createInternalError('Failed to get user profile'))
  }
}

export const getCurrentChannel = async (
  req: Request<unknown, unknown, { channel: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channel } = req.body
    if (!channel) {
      next(createValidationError('Missing required field: channel'))
      return
    }
    const current = await clubService.getChannel({ channel })
    res.send(current)
  } catch (error) {
    logger.error('Error getting current channel:', { error })
    next(createInternalError('Failed to get current channel'))
  }
}

export const emojiReaction = async (
  req: Request<unknown, unknown, EmojiReactionBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channel, emoji } = req.body
    if (!channel || !emoji) {
      next(createValidationError('Missing required fields: channel, emoji'))
      return
    }
    const reaction = await clubService.emojiReaction({ channel, emoji })
    res.send(reaction)
  } catch (error) {
    logger.error('Error sending emoji reaction:', { error })
    next(createInternalError('Failed to send emoji reaction'))
  }
}
