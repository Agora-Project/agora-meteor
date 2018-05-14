/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

import { getActivityFromUrl } from 'meteor/agoraforum:activitypub';

Meteor.methods({
    sendVerificationLink: function() {
        let userId = Meteor.userId();
        if ( userId ) {
            return Accounts.sendVerificationEmail( userId );
        }
    },
    insertPost: function(post) {
        let user = Meteor.users.findOne({_id: this.userId});

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

        if (!post.inReplyTo) {
            throw new Meteor.Error('no target', 'Post has no target!');
        }

        let target = Posts.findOne({id: post.inReplyTo});
        if (!target) {
            throw new Meteor.Error('target invalid', 'Targeted post not found!');
        }

        //check post for new hashtags and if any are found process them.
        //The regex here describes a hashtag as anything that starts with either
        //the start of a string or any kind of whitespace, then has a # symbol,
        //and then any number of letters.
        let postTags = post.content.match(/(^|\s)(#[a-z\d][\w-]*)/gi);

        if(!post.tag) post.tag = [];

        if (postTags) {

            for (let newTag of postTags) {
                newTag = newTag.trim().toLowerCase();
                newTag = newTag.replace("#", "");

                console.log(newTag);

                //check for any new tags not already present on the post.
                if (post.tag.find(function(tag) {
                    return tag === newTag;
                }) === undefined) {
                    //if any are found, add them to the list of new tags on the
                    //post.
                    post.tag.push(newTag);
                }
            }
        }

        //Validate against schema. TODO: Fix validation redundancy--also validates upon insert.
        Schema.Post.validate(post);

        //Insert new post.
        let postId = Posts.insert(post);
        post = Posts.findOne({_id: postId});
        Posts.update({id: post.inReplyTo}, {$push: {replies: post.id}});

        //add any new tags to the database, and adjust the info for existing tags accordingly.
        for (let tag of post.tag) {
            let tagDocument = Tags.findOne({_id: tag});
            if (!tagDocument) {
                Tags.insert({_id: tag, postNumber: 1, posts: [postId]});
                tagDocument = Tags.findOne({_id: tag});
            } else {
                Tags.update({_id: tag}, { $inc: {postNumber: 1}, $push: {posts: postId} });
                tagDocument = Tags.findOne({_id: tag});
            }
        }

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

        //check post for new tags and process them if found.
        let postTags = update.content.match(/(^|\s)(#[a-z\d][\w-]*)/gi);

        if(!update.tags) update.tags = [];

        if (postTags) {

            for (let newTag of postTags) {
                newTag = newTag.trim().toLowerCase();

                //check for any new tags not already present on the post.
                if (update.tags.find(function(tag) {
                    return tag === newTag;
                }) === undefined) {
                    //if any are found, add them to the list of new tags on the
                    //post.
                    update.tags.push(newTag);

                    let tagDocument = Tags.findOne({_id: newTag});
                    if (!tagDocument) {
                        Tags.insert({_id: newTag, postNumber: 1, posts: [postId]});
                        tagDocument = Tags.findOne({_id: newTag});
                    } else {
                        Tags.update({_id: newTag}, { $inc: {postNumber: 1}, $push: {posts: postId} });
                        tagDocument = Tags.findOne({_id: newTag});
                    }

                }
            }
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

        if (report.content.length >= 1)
            return Reports.insert(report);
    },
    resolveReport: function(report) {
        if (Roles.userIsInRole(this.userId, ['moderator']))
        return Reports.update({_id: report._id},
            {$set: {resolved: true} });
    },
    updateUserSummary: function(newSummary) {
        let user = Meteor.users.findOne({_id: this.userId});

        //Don't allow guests to try and edit profiles.
        if (!user) {
            throw new Meteor.Error('not-logged-in', 'The user must be logged in to edit posts.');
        }

        //Don't allow banned users to edit profiles.
        if (user.isBanned) {
            throw new Meteor.Error('banned', 'Banned users may not edit posts.');
        }

        //Update field.
        Meteor.users.update({_id: this.userId}, {$set: {'profile.summary': newSummary}});
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
