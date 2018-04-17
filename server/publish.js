/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

//Returns all information about a single post and its poster's basic information.
Meteor.publish('post', function(postID, posterID) {
    return [
        Posts.find( {$or: [ {_id: postID}, {target: postID}, {replies: postID} ] }),
        Meteor.users.find({_id: posterID}, {fields: {isBanned: 1, createdAt: 1, roles: 1, username: 1, email_hash: 1}})
    ];
});

Meteor.publish('abstractPost', function(postID) {
    return Posts.find( {$or: [ {_id: postID}, {target: postID}, {replies: postID} ] },
        {fields: {poster: 1, target: 1, replies: 1, postedOn: 1, recentActivity: 1} } );
});

//Returns an abstract shell of all posts, each only containing its id, links, and subtree width.
Meteor.publish('localAbstractPosts', function() {
    return Posts.find({}, {fields: {poster: 1, target: 1, replies: 1, postedOn: 1, recentActivity: 1}, sort: {PostedOn: 1}, limit: 100});
});

//Returns an abstract shell of all posts with a given tag, each only containing its id, links, and subtree width.
Meteor.publish('abstractPostsByTag', function(tag) {
    return Posts.find({tags: tag}, {fields: {poster: 1, target: 1, replies: 1, postedOn: 1}});
});

Meteor.publish('abstractPostsByUser', function(userID) {
    return Posts.find({poster: userID}, {fields: {poster: 1, target: 1, replies: 1, postedOn: 1}});
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
            fields: {isBanned: 1, createdAt: 1, seenPosts: 1}
        });
    } else {
        return this.ready();
    }
});

//Users; for the user management page. Should restrict fields even to moderators--shouldn't send user tokens and password hashes over network--ever.
Meteor.publish('users', function() {
    if (Roles.userIsInRole(this.userId, ['moderator'])) {
        return Meteor.users.find({}, {
            fields: {isBanned: 1, createdAt: 1, roles: 1, emails: 1, username: 1, avatar: 1, email_hash: 1}
        });
    } else {
        return Meteor.users.find({}, {
            fields: {isBanned: 1, createdAt: 1, roles: 1, username: 1, avatar: 1, email_hash: 1}
        });
    }
});

//User data, for the profile page.
Meteor.publish('user', function(userId) {
    if (Roles.userIsInRole(this.userId, ['moderator'])) {
        return Meteor.users.find({_id: userId}, {
            fields: {isBanned: 1, createdAt: 1, roles: 1, emails: 1, username: 1, email_hash: 1, bio: 1}
        });
    } else {
        return Meteor.users.find({_id: userId}, {
            fields: {isBanned: 1, createdAt: 1, roles: 1, username: 1, email_hash: 1, bio: 1}
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
