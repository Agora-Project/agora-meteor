/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

deletePost = function(postID) {
    let post = Posts.findOne({id: postID});

    //check to make sure the post exists before attempting to delete it.
    if (post === undefined) {
        throw new Meteor.Error('post-not-found', 'No such post was found.');
    }

    //delete the post and all references to it.
    Posts.update({id: post.inReplyTo}, {$pull: {replies: post.id}});
    Posts.update({inReplyTo: post.id},  {$unset: {inReplyTo:1}}, {multi: true});
    Posts.remove({id: postID});
}

Meteor.methods({
    sendVerificationLink: function() {
        let userID = Meteor.userId();
        if ( userID ) {
            return Accounts.sendVerificationEmail( userID );
        }
    },
    deletePost: function(postID) {

        //Don't allow non-moderators to delete posts.
        if (!Roles.userIsInRole(this.userId, ['moderator'])) {
            throw new Meteor.Error('not-logged-in', 'Only moderators may delete posts.');
        }

        deletePost(postID)
    },
    submitReport: function(report) {
        let user = Meteor.users.findOne({_id: this.userId});

        //Don't allow guests to submit reports.
        if (!user) {
            throw new Meteor.Error('not-logged-in', 'The user must be logged in to submit reports.');
        }

        //Don't allow banned users to submit reports.
        if (user.isBanned) {
            throw new Meteor.Error('banned', 'Banned users may not submit reports.');
        }

        //Don't allow unverified users to submit reports.
        if (!user.emails || user.emails.length < 1 || !user.emails[0].verified) {
            throw new Meteor.Error('unverified', 'Unverified users may not submit reports.');
        }

        if (report.content.length < 1)
            throw new Meteor.Error('no content', 'Report has no content!');

        return Reports.insert(report);
    },
    resolveReport: function(report) {
        if (Roles.userIsInRole(this.userId, ['moderator']))
        return Reports.update({_id: report._id},
            {$set: {resolved: true} });
    },
    updateActorSummary: function(newSummary) {
        let user = Meteor.users.findOne({_id: this.userId});

        //Don't allow guests to try and edit profiles.
        if (!user) {
            throw new Meteor.Error('not-logged-in', 'The user must be logged in to edit posts.');
        }

        //Don't allow banned users to edit profiles.
        if (user.isBanned) {
            throw new Meteor.Error('banned', 'Banned users may not edit posts.');
        }

        if (typeof newSummary !== "string")
            throw new Meteor.Error('summary not a string', 'Summary must be a string.');

        if (newSummary.length >= 5000)
            throw new Meteor.Error('summary too long', 'summary must be 5000 characters or less.');

        //Update field.
        Actors.update({id: user.actor}, {$set: {summary: newSummary}});
    },
    addSeenPost: function(postID) {
        let user = Meteor.users.findOne({_id: this.userId});

        //Guests can't record seen posts.
        if (!user) {
            throw new Meteor.Error('not-logged-in', 'The user must be logged in to record seen posts.');
        }

        let post = Posts.findOne({_id: postID});

        if (!post.published) {
            throw new Meteor.Error('undated-post', 'That post does not have a date and is thus assumed to be to old to be worth recording as seen.');
        }

        if (post.attributedTo == user.actor) {
            throw new Meteor.Error('own-post', 'A user is assumed to have always seen their own posts.');
        }

        if (Date.now() - post.published >= (1000*60*60*24*30)) {
            throw new Meteor.Error('old-post', 'Posts older than a month are assumed to have always been seen.');
        }

        if (user.seenPosts && user.seenPosts.find(function(p) {
            return postID == p._id;
        })) {
            throw new Meteor.Error('already-seen', 'The user has already seen that post.');
        }

        //Update field.
        Meteor.users.update({_id: this.userId}, {$push: {seenPosts: postID}});
    }
});
