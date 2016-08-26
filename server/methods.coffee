Meteor.methods
  insertLink: (attributes)->
    Link.insert attributes

  removeLinks: (postId)->
    for link in Link.find({ sourceId: postId }).fetch()
      Link.remove(link._id)
    for link in Link.find({ targetId: postId }).fetch()
      Link.remove(link._id)

  insertPost: (post)->
    console.log post 
    Post.insert post
