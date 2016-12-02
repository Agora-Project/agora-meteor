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
            fields: {
                "emails" : false,
                "services" : false,
                "defaultEmail" : false //Exclude defaultEmail from the sent data
            }
        });
    }
});

Meteor.publish("post", function(id) {
    if (id == 'rootNode') {
        return Post.find({
            $where : 'this.links.length < 1'
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
    return Post.find({
        "createdAt" : {$lte : beforeDate}
    }, {sort: {createdAt: -1}, limit: 1000});
});
