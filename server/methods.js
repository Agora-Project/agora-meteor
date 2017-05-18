/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Meteor.methods({
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

        //Validate post.
        if (post.title && post.title.length < 1) {
            delete post.title;
        }

        if (!post.target) {
            return;
        }

        let target = Posts.findOne({_id: post.target});
        if (!target) {
            return;
        }

        //Validate against schema. TODO: Fix validation redundancy--also validates upon insert.
        Schema.Post.validate(post);

        //check post for new hashtags and if any are found process them.
        //The regex here describes a hashtag as anything that starts with either
        //the start of a string or any kind of whitespace, then has a # symbol,
        //and then any  number of letters.
        let postTags = post.content.match(/(^|\s)(#[a-z\d][\w-]*)/gi), newTags = [];

        if(!post.tags) post.tags = [];

        if (postTags) {

            for (let newTag of postTags) {
                newTag = newTag.trim();
                console.log(newTag);

                //check for any new tags not already present on the post.
                if (post.tags.find(function(tag) {
                    return tag === newTag;
                }) === -1) {
                    //if any are found, add them to the list of new tags on the
                    //post.
                    newTags.push(newTag);
                    console.log(newTag);
                }
            }
        }

        post.tags = post.tags.concat(newTags);

        //Will always insert directly underneath target, shifting existing posts to the right.
        let y = target.defaultPosition.y - 1;
        let x = target.defaultPosition.x;
        post.defaultPosition = {x: x, y: y};

        //Find the chain of adjacent posts which need to be shifted.
        let shifting = false;
        let postsToShift = [];
        let prevColumn;
        Posts.find({'defaultPosition.y': y}, {sort: {'defaultPosition.x': 1}}).forEach(function(post) {
            if (shifting) {
                if (post.defaultPosition.x > prevColumn + 1) {
                    shifting = false;
                }
            }
            else if (post.defaultPosition.x === x) {
                shifting = true;
            }

            if (shifting) {
                postsToShift.push(post);
            }

            prevColumn = post.defaultPosition.x;
        });

        //Shift found posts one column to the right.
        for (let post of postsToShift) {
            let newColumn = post.defaultPosition.x + 1;
            Posts.update({_id: post._id}, {$set: {'defaultPosition.x': newColumn}});
        }

        //Insert new post into position.
        let postId = Posts.insert(post);
        Posts.update({_id: post.target}, {$push: {replies: postId}});

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

        let post = Posts.findOne({_id: postId});

        //Don't allow non-moderators to edit other peoples posts.
        if (post.poster !== this.userId && !Roles.userIsInRole(this.userId, ['moderator'])) {
            throw new Meteor.Error('post-not-owned', 'Only moderators may edit posts they don\'t own.');
        }

        //Validate edit.
        if (post.title && post.title.length < 1) {
            delete post.title;
        }

        //Edit post.
        Posts.update({_id: postId}, {$set: {
            title: update.title,
            content: update.content,
            lastEditedAt: Date.now()
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
        post.replies.forEach(function(reply) {
            Meteor.call('deletePost', reply);
        });

        //delete the post and all references to it.
        Posts.update({_id: post.target}, {$pull: {replies: postId}});
        Posts.remove(postId);
    },
    submitReport: function(report) {
        if (report.content.length >= 1)
            return Reports.insert(report);
    },
    resolveReport: function(report) {
        if (Roles.userIsInRole(this.userId, ['moderator']))
        return Reports.update({_id: report._id},
            {$set: {resolved: true} });
    }
});
