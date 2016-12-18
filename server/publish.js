Meteor.publish(null, function() {
    return Meteor.roles.find({});
});

Meteor.publish("myself", function() {
    if (this.userId) {
        return Meteor.users.find({
            _id: this.userId
        }, {
            fields: {
                'isBanned': 1,
                'createdAt': 1
            }
        });
    } else {
        return this.ready();
    }
});

Meteor.publish("users", function() {
    if (Roles.userIsInRole(this.userId, ['moderator'])) {
        return Meteor.users.find({});
    } else {
        return Meteor.users.find({}, {
            fields: {_id: 1, username: 1, avatar: 1}
        });
    }
});

Meteor.publish("post", function(id) {
    if (id == 'rootNode') {
        return Post.find({
            $where : '!this.links || this.links.length < 1'
        });
    }
    return Post.find({
        _id: id
    });
});

Meteor.publish("postRange", function(beforeDate, endDate) {
    return Post.find({
        "createdAt" : { $lte : beforeDate, $gte : endDate }
    }, {limit: 1000});
});

Meteor.publish("newestPosts", function(beforeDate) {
    return Post.find({}, {limit: 1000});
});
