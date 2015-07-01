@Schema ||= {}

@Schema.Argument = new SimpleSchema(
  title:
    type: String

  body:
    type: String
    optional: true

  ownerId:
    type: String
    regEx: SimpleSchema.RegEx.Id
    optional: true

  links:
    type: [String]
    optional: true

  isRoot:
    type: Boolean
    optional: true

  createdAt:
    type: Date
    optional: true

)

@Argument = new Mongo.Collection('arguments')

@Argument.attachSchema @Schema.Argument

@Argument.before.insert (userId, argument)->
  argument.createdAt = Date.now();

@Argument.before.remove (userId, argument)->
  for link in Link.find({ sourceId: argument._id }).fetch()
    Link.remove(link._id)
  for link in Link.find({ tragetId: argument._id }).fetch()
    Link.remove(link._id)


if Meteor.isServer
  @Argument.after.insert (userId, argument)->
    if !argument.isRoot && (!argument.links || argument.links.size == 0)
      Meteor.call('insertLink', {sourceId: @_id, targetId: Argument.findOne(isRoot: true)._id})
    else
      for link in argument.links
        Meteor.call('insertLink', {sourceId: @_id, targetId: link})
