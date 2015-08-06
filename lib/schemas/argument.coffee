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

@Argument.removeWithLinks = (argumentId)->
  for link in Link.find({ sourceId: argumentId }).fetch()
    Link.remove(link._id)
  for link in Link.find({ tragetId: argumentId }).fetch()
    Link.remove(link._id)
  Argument.remove(argumentId);

@Argument.before.insert (userId, argument)->
  argument.createdAt = Date.now();

if Meteor.isClient
  @Argument.after.insert (userId, argument)->
    return true if argument.isRoot
    if !argument.links || argument.links.length == 0
      Meteor.call('insertLink', {sourceId: @_id, targetId: Argument.findOne(isRoot: true)._id})
    else
      for link in argument.links
        Meteor.call('insertLink', {sourceId: @_id, targetId: link})
