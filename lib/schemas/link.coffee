@Schema ||= {}

@Schema.Link = new SimpleSchema(
  sourceId:
    type: String
    regEx: SimpleSchema.RegEx.Id

  targetId:
    type: String
    regEx: SimpleSchema.RegEx.Id

  ownerId:
    type: String
    regEx: SimpleSchema.RegEx.Id
    optional: true

  isAttack:
    type: Boolean
    optional: true

  createdAt:
    type: Date
    optional: true
)

@Link = new Mongo.Collection('links')

@Link.attachSchema @Schema.Link

@Link.before.insert (userId, argument)->
  argument.createdAt = Date.now();

@Link.before.remove (userId, argument)->
  console.log(argument);
