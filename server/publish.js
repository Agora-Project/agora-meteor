/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

//Returns all information about a single post and its poster's basic information.
Meteor.publish('post', function(postID, posterID) {
    return [
        Posts.find({_id: postID}),
        Meteor.users.find({_id: posterID}, { fields: {isBanned: 1, createdAt: 1, roles: 1, profile: 1} })
    ];
});

Meteor.publish('abstractPost', function(postID) {
    return Posts.find({_id: postID}, {fields: {attributedTo: 1, inReplyTo: 1, replies: 1} } );
});

Meteor.publish('abstractReplies', function(postID) {
    return Posts.find({inReplyTo: postID}, {fields: {attributedTo: 1, inReplyTo: 1, replies: 1} } );
});

//Returns an abstract shell of all posts, each only containing its id, links, and subtree width.
Meteor.publish('localAbstractPosts', function() {
    return Posts.find({}, {fields: {attributedTo: 1, inReplyTo: 1, replies: 1}, sort: {published: 1}, limit: 100});
});

//Returns an abstract shell of all posts with a given tag, each only containing its id, links, and subtree width.
Meteor.publish('abstractPostsByTag', function(tag) {
    return Posts.find({tags: tag}, {fields: {attributedTo: 1, inReplyTo: 1, replies: 1}});
});

Meteor.publish('abstractPostsByUser', function(userID) {
    return Posts.find({attributedTo: userID}, {fields: {attributedTo: 1, inReplyTo: 1, replies: 1}});
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
            fields: {isBanned: 1, seenPosts: 1, profile: 1}
        });
    } else {
        return this.ready();
    }
});

//Users; for the user management page. Should restrict fields even to moderators--shouldn't send user tokens and password hashes over network--ever.
Meteor.publish('users', function() {
    if (Roles.userIsInRole(this.userId, ['moderator'])) {
        return Meteor.users.find({}, {
            fields: {isBanned: 1, createdAt: 1, roles: 1, emails: 1, profile: 1}
        });
    } else {
        return Meteor.users.find({}, {
            fields: {isBanned: 1, createdAt: 1, roles: 1, profile: 1}
        });
    }
});

//User data, for the profile page.
Meteor.publish('user', function(userId) {
    return Meteor.users.find({_id: userId}, {
        fields: {isBanned: 1, createdAt: 1, roles: 1, profile: 1}
    });
});

//Reports; for the report management page.
Meteor.publish('reports', function() {
    if (Roles.userIsInRole(this.userId, ['moderator'])) {
        return Reports.find({});
    } else {
        return this.ready();
    }
})
