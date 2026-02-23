import { Request, Response } from 'express';
import { clubService } from '../services/club-api.service';
import { channelService } from '../services/channel.service';
import ValidToken from '../models/token';
import { startPingLoop, stopPingLoop } from '../utils/pingManager';

interface JoinRoomBody {
  channel: string;
}

interface LeaveRoomBody {
  channel: string;
}

interface GetChannelMsgsBody {
  channel: string;
  order?: number;
}

interface SendMessageBody {
  channel: string;
  message: string;
}

interface EmojiReactionBody {
  channel: string;
  emoji: string;
}

export const findClientToken = async (
  clientName: string
): Promise<{ token: string; name?: string } | string> => {
  try {
    const client = await ValidToken.findOne({ name: clientName }).lean();
    return client ?? 'Client not found';
  } catch (err) {
    return `Error: ${err}`;
  }
};

export const getFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const feed = await channelService.getChannelFeed();
    res.send(feed);
  } catch (error) {
    console.error('Error getting channel feed:', error);
    res.status(500).send('Error getting channel feed');
  }
};

export const joinRoom = async (
  req: Request<unknown, unknown, JoinRoomBody>,
  res: Response
): Promise<void> => {
  try {
    const { channel } = req.body;
    const result = await channelService.joinChannelWithInviteHandling(channel);

    if (result) {
      startPingLoop(channel);
    }

    res.send(result);
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).send('Error joining room');
  }
};

export const leaveRoom = async (
  req: Request<unknown, unknown, LeaveRoomBody>,
  res: Response
): Promise<void> => {
  try {
    const { channel } = req.body;
    stopPingLoop(channel);
    const result = await clubService.leaveChannel({ channel });
    res.send(result);
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).send('Error leaving room');
  }
};

export const acceptInvite = async (
  req: Request<unknown, unknown, LeaveRoomBody>,
  res: Response
): Promise<void> => {
  try {
    const { channel } = req.body;
    const result = await clubService.acceptSpeakerInvite({ channel });
    res.send(result);
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).send(error);
  }
};

export const getChannelMsgs = async (
  req: Request<unknown, unknown, GetChannelMsgsBody>,
  res: Response
): Promise<void> => {
  try {
    const { channel, order } = req.body;
    const result = await channelService.getChannelMessages({ channel, order });
    res.send(result);
  } catch (error) {
    console.error('Error getting channel messages:', error);
    res.status(500).json({
      error: true,
      message: `Error: ${error}`,
    });
  }
};

export const sendMessageToRoom = async (
  req: Request<unknown, unknown, SendMessageBody>,
  res: Response
): Promise<void> => {
  try {
    const { channel, message } = req.body;
    const result = await channelService.sendChannelMessage({
      channel,
      message: message,
    });
    res.send(result);
  } catch (error) {
    console.error('Error sending message to room:', error);
    res.status(500).json({
      error: true,
      message: `Error: ${error}`,
    });
  }
};

export const myProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const profile = await channelService.getUserProfile();
    res.send(profile);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      error: true,
      message: `Error: ${error}`,
    });
  }
};

export const getCurrentChannel = async (
  req: Request<unknown, unknown, { channel: string }>,
  res: Response
): Promise<void> => {
  try {
    const { channel } = req.body;
    const current = await channelService.getChannelFeed();
    res.send(current);
  } catch (error) {
    console.error('Error getting current channel:', error);
    res.status(500).json({
      error: true,
      message: `Error: ${error}`,
    });
  }
};

export const emojiReaction = async (
  req: Request<unknown, unknown, EmojiReactionBody>,
  res: Response
): Promise<void> => {
  try {
    const { channel, emoji } = req.body;
    const reaction = await clubService.getChannelMessages({ channel });
    res.send(reaction);
  } catch (error) {
    console.error('Error sending emoji reaction:', error);
    res.status(500).json({
      error: true,
      message: `Error: ${error}`,
    });
  }
};
