Post.allow({
  insert: function(userId, post) {
    return post.ownerId === userId;
  },
  remove: function(userId, post) {
    return Roles.userIsInRole(userId, ['moderator']);
  }
});

Link.allow({
  insert: function(userId, link) {
    return link.ownerId === userId;
  },
  remove: function(userId, link) {
    return Roles.userIsInRole(userId, ['moderator']);
  }
});
