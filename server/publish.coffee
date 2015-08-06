Meteor.publish null, ->
  Meteor.roles.find({})

Meteor.publish "users", ->
  if (Roles.userIsInRole(this.userId, ['moderator']))
    return Meteor.users.find({})
  else
    this.stop()
    return

Meteor.publish "arguments", ->
  if (this.userId)
    return Argument.find({})
  else
    this.stop()
    return

Meteor.publish "links", ->
  if (this.userId)
    return Link.find({})
  else
    this.stop()
    return
