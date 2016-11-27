Meteor.methods({
    insertLink: function(attributes) {

    },
    removeWithLinks: function(postId) {

    },
    insertPost: function(post) {
        console.log(post);
        if (post.title.length >= 1 && post.links.length >= 1)
            return Post.insert(post);
    },
    editPost: function(post) {
        if (post.title.length < 1 || post.links.length < 1 ||
           (this.userId != Post.findOne({_id: post._id}).ownerId &&
            !Roles.userIsInRole(this.userId, ['moderator']))) return;

        var ret = Post.update({_id: post._id}, { $set: {
            title: post.title, content: post.content, lastEditedAt: Date.now()
        }});

    }
});
