Post.allow({
    insert: function(userId, post) {
        return false;
    },
    remove: function(userId, post) {
        return false;
    },
    update: function(userId, post) {
        return false;
    }
});

Link.allow({
    insert: function(userId, link) {
        return false;
    },
    remove: function(userId, link) {
        return false;
    },
    update: function(userId, link) {
        return false;
    }
});
