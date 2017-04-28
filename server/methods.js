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
        
        let target = Posts.findOne({_id: post.target});
        if (!target) {
            return;
        }
        
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
