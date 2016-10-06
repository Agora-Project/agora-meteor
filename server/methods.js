Meteor.methods({
  insertLink: function(attributes) {
    return Link.insert(attributes);
  },
  removeLinks: function(postId) {
    var i, j, len, len1, link, ref, ref1, results;
    ref = Link.find({
      sourceId: postId
    }).fetch();
    for (i = 0, len = ref.length; i < len; i++) {
      link = ref[i];
      Link.remove(link._id);
    }
    ref1 = Link.find({
      targetId: postId
    }).fetch();
    results = [];
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      link = ref1[j];
      results.push(Link.remove(link._id));
    }
    return results;
  },
  insertPost: function(post) {
    console.log(post);
    return Post.insert(post);
  }
});
