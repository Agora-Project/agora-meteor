Meteor.methods
  insertLink: (attributes)->
    Link.insert attributes

  removeLinks: (argumentId)->
    for link in Link.find({ sourceId: argumentId }).fetch()
      Link.remove(link._id)
    for link in Link.find({ tragetId: argumentId }).fetch()
      Link.remove(link._id)
