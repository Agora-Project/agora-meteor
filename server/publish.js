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
    var query = null;

    if (id == 'rootNode') {
        query = {$where : 'this.links.length < 1'};
    } else query = {_id: id};

    var self = this;

    var handle = Posts.find(query).observe({
        added: function(post){
            self.added("nodes-loaded", post._id, post);
        },
        changed: function(item){
            self.changed("nodes-loaded", post._id, post);
        },
        removed: function(item){
            self.removed("nodes-loaded", post._id, post);
        }
    });

    this.onStop(function() {
        handle.stop();
    });
});

Meteor.publish("postRange", function(beforeDate, endDate) {
    return Posts.find({
        "createdAt" : { $lte : beforeDate, $gte : endDate }
    }, {limit: 1000});
});

Meteor.publish("newestPosts", function(beforeDate) {
    return Posts.find({
        "createdAt" : {$lte : beforeDate}
    }, {sort: {createdAt: -1}, limit: 1000});
});
