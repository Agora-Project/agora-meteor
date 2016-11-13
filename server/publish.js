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

Meteor.publish("forum", function(id) {
    if (!id) {
        id = Post.findOne({
            isRoot: true
        })._id;
    }
    return [
        Post.find({
            _id: id
        }), Link.find({
            $or: [
                {
                    sourceId: id
                }, {
                    targetId: id
                }
            ]
        })
    ];
});
