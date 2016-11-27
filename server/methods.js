Meteor.methods({
    insertLink: function(attributes) {

    },
    removeWithLinks: function(postId) {

    },
    insertPost: function(post) {
        if (post.title.length >= 1 && post.links.length >= 1) {
            let postId = Post.insert(post);
            for (let i in post.links) {
                Post.update({_id: post.links[i].target},
                            { $push: { replyIDs: postId}});
            }
            return postId;
        }

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
