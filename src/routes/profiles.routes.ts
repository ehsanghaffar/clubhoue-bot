import { Router } from 'express';
import {
  addProfile,
  changeProfile,
  searchUsers,
  acceptInvite,
  getUser,
  getAllUsers,
  getToken,
} from '../controllers/profile.controller';

const router = Router();

router.post('/add_profile', addProfile);
router.post('/change-profile', changeProfile);
router.post('/search_users', searchUsers);
router.post('/accept_invite', acceptInvite);
router.post('/get_user', getUser);
router.get('/all_users', getAllUsers);
router.get('/get_token', getToken);

export default router;
