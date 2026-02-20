# API Documentation

The Clubhouse API now includes comprehensive interactive documentation powered by Swagger UI.

## Accessing the Documentation

- **Swagger UI**: Visit `http://localhost:4100/api-docs/` in your browser
- **OpenAPI JSON**: Available at `http://localhost:4100/swagger.json`

## Documented Endpoints

### Profiles (`/api/profiles`)
- `POST /add_profile` - Add a new user profile with token and name
- `POST /change-profile` - Update the current profile token
- `POST /search_users` - Search for users (profile-based)
- `POST /accept_invite` - Accept channel invitation using a profile
- `POST /get_user` - Get detailed user profile information
- `GET /all_users` - Retrieve all stored user profiles
- `GET /get_token` - Get the current authentication token

### Users (`/api/users`)
- `POST /search_users` - Search for users

### Channels (`/api/channels`)
- `POST /join_room` - Join a room/channel
- `POST /accept_invite` - Accept an invitation to join a channel
- `POST /get_room_users` - Get information about users in a channel
- `POST /leave` - Leave a room/channel
- `POST /channels` - Get channels feed with pagination
- `POST /current-channel` - Get current channel information
- `POST /room-msgs` - Get messages from a channel
- `POST /send-room-msg` - Send a message to a channel
- `POST /me` - Get current user profile information

### Chatbot (`/api/chatbot`)
- `POST /start` - Start the automated chatbot processing loop
- `POST /stop` - Stop the automated chatbot processing loop

### Timer (`/api/channel`)
- `POST /start-timer` - Start a Pomodoro timer for a channel

### Documentation
- `GET /swagger.json` - Get the OpenAPI specification

## Features

- **Interactive Testing**: Try API endpoints directly from the browser
- **Request/Response Examples**: See sample data for all endpoints
- **Schema Validation**: Automatic validation of request/response formats
- **Real-time Updates**: Documentation updates automatically with code changes
- **Comprehensive Coverage**: All API endpoints are fully documented

## Development

The Swagger documentation is automatically generated from JSDoc comments in the route files. To add documentation for new endpoints:

1. Add JSDoc comments with Swagger annotations above your route handler
2. Include `@swagger` tags with OpenAPI 3.0 specification
3. Restart the development server to see updates

Example:
```javascript
/**
 * @swagger
 * /endpoint:
 *   post:
 *     summary: Description of endpoint
 *     tags: [Category]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               param:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/endpoint', handler);
```</content>
<parameter name="filePath">/Users/ehsanghaffarii/workspace/club-master/clubhoue-bot/API_DOCUMENTATION.md