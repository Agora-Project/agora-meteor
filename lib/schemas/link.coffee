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

@Link.before.insert (userId, link)->
  link.createdAt = Date.now();

@Link.before.remove (userId, link)->
  console.log(link);
