/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

//Returns all information about a single post and its poster's basic information.
Meteor.publish('post', function(postID, posterID) {
    return [
        Posts.find({_id: postID}),
        Meteor.users.find({_id: posterID}, {fields: {username: 1, avatar: 1, email_hash: 1}})
    ];
});

//Returns an abstract shell of all posts, each only containing its id and links.
Meteor.publish('abstractPosts', function() {
    return Posts.find({}, {fields: {poster: 1, target: 1, replies: 1, defaultPosition: 1}});
});

//Returns an abstract shell of all posts, each only containing its id and links.
Meteor.publish('abstractPostsByTag', function(tag) {
    return Posts.find({tags: tag}, {fields: {poster: 1, target: 1, replies: 1}});
});

//Universal subscription for roles.
Meteor.publish(null, function() {
    return Meteor.roles.find({});
});

//Universal subscription for tags.
Meteor.publish(null, function() {
    return Tags.find({});
});

//Returns info about the client user.
Meteor.publish('myself', function() {
    if (this.userId) {
        return Meteor.users.find({_id: this.userId}, {
            fields: {isBanned: 1, createdAt: 1}
        });
    } else {
        return this.ready();
    }
});

//Users; for the user management page. Should restrict fields even to moderators--shouldn't send user tokens and password hashes over network--ever.
Meteor.publish('users', function() {
    if (Roles.userIsInRole(this.userId, ['moderator'])) {
        return Meteor.users.find({});
    } else {
        return Meteor.users.find({}, {
            fields: {username: 1, avatar: 1, email_hash: 1}
        });
    }
});

//Reports; for the report management page.
Meteor.publish('reports', function() {
    if (Roles.userIsInRole(this.userId, ['moderator'])) {
        return Reports.find({});
    } else {
        return this.ready();
    }
})
