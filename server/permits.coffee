Post.allow
  insert: (userId, post)->
    return post.ownerId == userId
  remove: (userId, post)->
    return Roles.userIsInRole(userId, ['moderator']);

Link.allow
  insert: (userId, link)->
    return link.ownerId == userId
  remove: (userId, link)->
    return Roles.userIsInRole(userId, ['moderator']);
