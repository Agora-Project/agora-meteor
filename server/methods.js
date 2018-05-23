/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

Meteor.methods({
    sendVerificationLink: function() {
        let userId = Meteor.userId();
        if ( userId ) {
            return Accounts.sendVerificationEmail( userId );
        }
    },
    insertPost: function(post) {
        let user = Meteor.users.findOne({_id: this.userId});

        //First, some validation.

        //Don't allow guests to post.
        if (!user) {
            throw new Meteor.Error('not-logged-in', 'The user must be logged in to post.');
        }

        //Don't allow banned users to post.
        if (user.isBanned) {
            throw new Meteor.Error('banned', 'Banned users may not post.');
        }

        //Don't allow unverified users to post.
        if (!user.emails || user.emails.length < 1 || !user.emails[0].verified) {
            throw new Meteor.Error('unverified', 'Unverified users may not post.');
        }

        //Don't allow posts with no content.
        if (!post.content || post.content.length < 1)
            throw new Meteor.Error('No content!', 'Cannot insert post without content!');

        //Don't allow posts with too much content
        if (post.content.length > 100000)
            throw new Meteor.Error('Too much content!', 'Cannot insert post with content greater than 100,000 characters!');

        //Don't allow posts with summariesw that are too long.
        if (post.summary && post.summary.length > 100)
            throw new Meteor.Error('Summary too long!', 'Cannot insert post with summary greater than 100 characters!');

        if (post.content.length > 500 && (!post.summary || post.summary.length < 1))
            throw new Meteor.Error('Summary needed!', 'Posts with more than 500 characters of content must have a summary!');

        //Don't allow posts that target posts that don't exist.
        if (post.inReplyTo) {
            let target = Posts.findOne({id: post.inReplyTo});
            if (!target) {
                throw new Meteor.Error('target invalid', 'Targeted post not found!');
            }
        }

        //Insert new post.
        let postId = Posts.insert(post);

        return postId;
    },
    editPost: function(postId, update) {
        let user = Meteor.users.findOne({_id: this.userId});

        //Don't allow guests to edit posts.
        if (!user) {
            throw new Meteor.Error('not-logged-in', 'The user must be logged in to edit posts.');
        }

        //Don't allow banned users to edit posts.
        if (user.isBanned) {
            throw new Meteor.Error('banned', 'Banned users may not edit posts.');
        }

        //Don't allow unverified users to edit posts.
        if (!user.emails || user.emails.length < 1 || !user.emails[0].verified) {
            throw new Meteor.Error('unverified', 'Unverified users may not edit posts.');
        }

        let post = Posts.findOne({_id: postId});

        //Don't allow non-moderators to edit other peoples posts.
        if (post.attributedTo !== this.userId && !Roles.userIsInRole(this.userId, ['moderator'])) {
            throw new Meteor.Error('post-not-owned', 'Only moderators may edit posts they don\'t own.');
        }

        //Validate edit.
        if (post.summary && post.summary.length < 1) {
            delete post.summary;
        }

        //Edit post.
        Posts.update({_id: postId}, {$set: {
            summary: update.summary,
            content: update.content,
            updated: Date.now()
        }});
    },
    deletePost: function(postId) {
        let post = Posts.findOne({_id: postId});

        //Don't allow non-moderators to delete posts.
        if (!Roles.userIsInRole(this.userId, ['moderator'])) {
            throw new Meteor.Error('not-logged-in', 'Only moderators may delete posts.');
        }

        //check to make sure the post exists before attempting to delete it.
        if (post === undefined) {
            throw new Meteor.Error('post-not-found', 'No such post was found.');
        }

        //recursively delete all replies to the post.
        Posts.find({inReplyTo: post.id}).forEach(function(reply) {
            Meteor.call('deletePost', reply._id);
        });

        //delete the post and all references to it.
        Posts.update({id: post.inReplyTo}, {$pull: {replies: post.id}});
        Posts.remove(postId);
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
