Meteor.publish null, ->
  Meteor.roles.find({})

Meteor.publish "myself", ->
  if (this.userId)
    return Meteor.users.find({_id: this.userId}, {fields: {'isBanned': 1, 'createdAt': 1}})
  else
    this.ready()

Meteor.publish "users", ->
  if (Roles.userIsInRole(this.userId, ['moderator']))
    return Meteor.users.find({})
  else
    this.stop()
    return

Meteor.publish "arguments", ->
  return Argument.find({})

Meteor.publish "links", ->
  return Link.find({})
