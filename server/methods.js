/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Meteor.methods({
    insertPost: function(post) {
        //Validate post.
        if (post.title) {
            if (post.title.length < 1) {
                delete post.title;
            }
            
            if (post.title.length > 100) {
                return;
            }
        }
        
        if (!post.target) {
            return;
        }
        
        let postId = Posts.insert(post);
        Posts.update({_id: post.target}, {$push: {replies: postId}});
        return postId;
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
