# how to use

## temporary EndPoints

### Headers:

```json
Content-Type: application/json
```

### Get all channels:

method: GET

[http://62.171.147.128:4008/api/channels](http://62.171.147.128:4008/api/channels)

----------------------------

### Get All users:

Method: GET

[http://62.171.147.128:4008/api/all_users](http://62.171.147.128:4008/api/all_users)

------

### Join room:

Method: POST

[http://62.171.147.128:4004/api/join_room](http://62.171.147.128:4004/api/join_room)

body:
```json
{
  "username": "cafe", // ALL USERS: cafe, cafe2, radio, pomodoro
  "channel": "Md3zgeB5"
}
```

-----

### Accept invite speaker

Method: POST

[http://62.171.147.128:4004/api/accept_invite](http://62.171.147.128:4004/api/accept_invite)

body:
```json
{
	"channel": "M59BagQq",
	"username": "cafe"
}
```

--------

### Add user to database:

Method: POST

[http://62.171.147.128:4004/api/add_profile](http://62.171.147.128:4004/api/add_profile)

body:
```json
{
	"token": "9fba0b2d154d9fe47539e10a8c95f0efbfa31501",
	"name": "amir"
}
```

-------