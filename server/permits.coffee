Argument.allow
  insert: (userId, argument)->
    return argument.ownerId == userId
  remove: (userId, argument)->
    return true
