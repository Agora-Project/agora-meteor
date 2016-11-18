Meteor.methods({
    insertLink: function(attributes) {
        return Link.insert(attributes);
    },
    removeWithLinks: function(postId) {
        if (this.userID != Post.findOne({_id: postId}).ownerId &&
            !Roles.userIsInRole(this.userId, ['moderator'])) return;
        var i, len, link, ref, results;
        ref = Link.find({
            sourceId: postId
        }).fetch();
        for (i = 0, len = ref.length; i < len; i++) {
            link = ref[i];
            Link.remove(link._id);
        }
        ref = Link.find({
            targetId: postId
        }).fetch();
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
            link = ref[i];
            results.push(Link.remove(link._id));
        }
        results.push(Post.remove(postId));
        return results;
    },
    insertPost: function(post) {
        if (post.title.length >= 1)
            return Post.insert(post);
    }
});
