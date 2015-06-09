@Schema ||= {}

@Schema.Vote = new SimpleSchema(
  votable_id:
    type: String
    regEx: SimpleSchema.RegEx.Id

  type:
    type: Number

  createdAt:
    type: Date

)

@Vote = new Mongo.Collection('vote')

@Vote.attachSchema @Schema.Vote