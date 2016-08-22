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

  isAttack:
    type: Boolean
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
  Meteor.call('removeLinks', argumentId)
  Argument.remove(argumentId);

@Argument.before.insert (userId, argument)->
  argument.createdAt = Date.now();

@Argument.before.remove (userId, argument)->
  console.log argument

if Meteor.isClient
  @Argument.after.insert (userId, argument)->
    return true if argument.isRoot
    if !argument.links || argument.links.length == 0
      Meteor.call('insertLink', {isAttack: argument.isAttack, sourceId: @_id, targetId: Argument.findOne(isRoot: true)._id, ownerId: argument.ownerId})
    else
      for link in argument.links
        Meteor.call('insertLink', {isAttack: argument.isAttack, sourceId: @_id, targetId: link, ownerId: argument.ownerId})
