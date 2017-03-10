/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

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

Meteor.publish("reports", function() {
    if (Roles.userIsInRole(this.userId, ['moderator'])) {
        return Reports.find({});
    } else return this.ready();
})

Meteor.publish("post", function(id) {
    if (id == 'rootNode') {
        return Posts.find({
            $where : '!this.links || this.links.length < 1'
        });
    }
    return Posts.find({
        _id: id
    });
});

Meteor.publish("postRange", function(beforeDate, endDate) {
    return Posts.find({
        "createdAt" : { $lte : beforeDate, $gte : endDate }
    }, {limit: 1000});
});

Meteor.publish("newestPosts", function(beforeDate) {
    return Posts.find({}, {limit: 1000});
});

//Returns an abstract shell of posts, each only containing its id and links.
Meteor.publish("abstractPosts", function() {
    return Posts.find({}, {limit: 1000, fields: {'links': 1, 'replyIDs': 1, 'defaultPosition': 1}});
});
