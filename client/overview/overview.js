Template.overview.onCreated(function() {
    this.subscribe('newestPosts', Date.now());
});

Template.overview.helpers({
    nodes: function() {
        return Post.find({});
    }
});
