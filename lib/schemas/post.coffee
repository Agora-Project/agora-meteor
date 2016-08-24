@Schema ||= {}

@Schema.Post = new SimpleSchema(
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

@Post = new Mongo.Collection('posts')

@Post.attachSchema @Schema.Post

@Post.removeWithLinks = (postId)->
  Meteor.call('removeLinks', postId)
  Post.remove(postId);

@Post.before.insert (userId, post)->
  post.createdAt = Date.now();

@Post.before.remove (userId, post)->
  console.log post

if Meteor.isClient
  @Post.after.insert (userId, post)->
    return true if post.isRoot
    if !post.links || post.links.length == 0
      Meteor.call('insertLink', {isAttack: post.isAttack, sourceId: @_id, targetId: Post.findOne(isRoot: true)._id, ownerId: post.ownerId})
    else
      for link in post.links
        Meteor.call('insertLink', {isAttack: post.isAttack, sourceId: @_id, targetId: link, ownerId: post.ownerId})
