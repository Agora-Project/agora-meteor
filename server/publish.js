/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

//Returns all information about a single post and its poster's basic information.
Meteor.publish('fullPost', function(postID, actorID) {
    return [
        Posts.find({id: postID}),
        Actors.find({id: actorID})
    ];
});

Meteor.publish('abstractPost', function(postID) {
    return Posts.find({id: postID}, {fields: {id: 1, attributedTo: 1, inReplyTo: 1, replies: 1} } );
});

Meteor.publish('abstractReplies', function(postID) {
    return Posts.find({inReplyTo: postID}, {fields: {id: 1, attributedTo: 1, inReplyTo: 1, replies: 1} } );
});

//Returns an abstract shell of all posts, each only containing its id, links, and subtree width.
Meteor.publish('localAbstractPosts', function() {
    return Posts.find({}, {fields: {id: 1, attributedTo: 1, inReplyTo: 1, replies: 1}, sort: {published: 1}, limit: 100});
});

//Returns an abstract shell of all posts, each only containing its id, links, and subtree width.
Meteor.publish('recentAbstractPosts', function() {
    return Posts.find({}, {fields: {id: 1, attributedTo: 1, inReplyTo: 1, replies: 1}, sort: {published: -1}, limit: 100});
});

Meteor.publish('abstractPostsByUser', function(actorID) {
    return Posts.find({attributedTo: actorID}, {fields: {id: 1, attributedTo: 1, inReplyTo: 1, replies: 1}});
});

Meteor.publish('abstractPostsByTimeline', function() {
    if (this.userId) {
        let actorID = Meteor.users.findOne({_id: this.userId}).actor;

        let actor = Actors.findOne({id: actorID}, {fields: {id: 1, following: 1}});

        let users = FollowingLists.findOne({id: actor.following}).orderedItems.concat([actor.id]);

        return Posts.find({attributedTo: {$in: users}}, {fields: {id: 1, attributedTo: 1, inReplyTo: 1, replies: 1}, sort: {published: -1}, limit: 100});
    } else {
        return this.ready();
    }
});

//Universal subscription for roles.
Meteor.publish(null, function() {
    return Meteor.roles.find({});
});

//Returns info about the client user.
Meteor.publish('myself', function() {
    if (this.userId) {
        let actorID = Meteor.users.findOne({_id: this.userId}).actor;

        let actor = Actors.find({id: actorID});

        let actorData = actor.fetch();

        //console.log(FollowerLists.findOne({id: actorData.followers}));

        return [Meteor.users.find({_id: this.userId}, {
            fields: {isBanned: 1, seenPosts: 1, actor: 1}
        }), actor, FollowingLists.find({id: actorData[0].following}), FollowerLists.find({id: actorData[0].followers})];
    } else {
        return this.ready();
    }
});

//Users; for the user management page. Should restrict fields even to moderators--shouldn't send user tokens and password hashes over network--ever.
Meteor.publish('users', function() {
    if (Roles.userIsInRole(this.userId, ['moderator'])) {
        return Meteor.users.find({}, {
            fields: {isBanned: 1, createdAt: 1, roles: 1, emails: 1}
        });
    } else {
        return Meteor.users.find({}, {
            fields: {isBanned: 1, createdAt: 1, roles: 1}
        });
    }
});

//Actor data, for the profile page.
Meteor.publish('actor', function(actorID) {

    let actor = Actors.find({id: actorID});

    let actorData = actor.fetch();

    return [actor,
        FollowingLists.find({id: actorData[0].following}),
        FollowerLists.find({id: actorData[0].followers}),
        Activities.find({type: "Follow", actor: Meteor.user().actor, object: actorID})
    ];
});

//Actor data, for the profile page.
Meteor.publish('actorByHandle', function(handle) {
    return Actors.find({preferredUsername: handle});
});

//Reports; for the report management page.
Meteor.publish('reports', function() {
    if (Roles.userIsInRole(this.userId, ['moderator'])) {
        return Reports.find({});
    } else {
        return this.ready();
    }
})
