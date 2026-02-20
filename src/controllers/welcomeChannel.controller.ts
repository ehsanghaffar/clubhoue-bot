import { Request, Response } from 'express';
import { clubService } from '../services/club-api.service';
import RoomUserModel from '../models/roomUser';
import { findClientToken } from './channel.controller';

interface GetChannelInfoBody {
  channel: string;
  username: string;
}

export const getChannelInfo = async (
  req: Request<unknown, unknown, GetChannelInfoBody>,
  res: Response
): Promise<void> => {
  const ch = req.body.channel;
  const clientName = req.body.username;
  try {
    const client = await findClientToken(clientName);
    if (typeof client === 'string') {
      res.status(400).send({ error: client });
      return;
    }
    
    if (clubService && clubService['profile']) {
      (clubService['profile'] as { token?: string }).token = client.token;
    }
    
    const channelInfo = await clubService.getChannelMessages({ channel: ch });
    res.send(channelInfo);
  } catch (err) {
    res.status(500).send(err);
  }
};

const saveUsersToDB = async (
  name: string,
  id: number,
  get: boolean,
  leave: boolean
): Promise<string | void> => {
  const data = new RoomUserModel({
    name,
    user_id: id,
    get_welcome: get,
    leave,
  });
  try {
    await data.save();
  } catch (error) {
    return `Error On Save user: ${error}`;
  }
};
