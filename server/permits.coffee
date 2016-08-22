Argument.allow
  insert: (userId, argument)->
    return argument.ownerId == userId
  remove: (userId, argument)->
    return true

Link.allow
  insert: (userId, link)->
    return link.ownerId == userId
  remove: (userId, argument)->
    return true
