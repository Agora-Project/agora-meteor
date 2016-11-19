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
    },
    editPost: function(post) {
        if (post.title.length < 1 || (this.userID != Post.findOne({_id: post._id}).ownerId &&
            !Roles.userIsInRole(this.userId, ['moderator']))) return;

        var ret = Post.update({_id: post._id}, { $set: {
            title: post.title, content: post.content, lastEditedAt: Date.now()
        }});
        if (ret == 1)
            return post._id;
        else {
            console.log("Oh no! Edited " + ret + " Posts!");
            return post._id;
        }
    }
});
