@Schema ||= {}

@Schema.Vote = new SimpleSchema(
  votableId:
    type: String
    regEx: SimpleSchema.RegEx.Id

  type:
    type: Number

  createdAt:
    type: Date

)

@Vote = new Mongo.Collection('votes')

@Vote.attachSchema @Schema.Vote

@Vote.before.insert (userId, argument)->
  argument.createdAt = Date.now();
