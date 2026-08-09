/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router } from 'express'
import profilesRoutes from './profiles.routes.js'
import usersRoutes from './users.routes.js'
import channelsRoutes from './channels.routes.js'
import chatbotRoutes from './chatbot.routes.js'
import channelRoutes from './channel.routes.js'

const router: Router = Router()

router.use('/profiles', profilesRoutes)
router.use('/users', usersRoutes)
router.use('/channels', channelsRoutes)
router.use('/chatbot', chatbotRoutes)
router.use('/channel', channelRoutes)

export default router
