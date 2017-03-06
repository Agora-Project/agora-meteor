/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Meteor.methods({
    removeWithLinks: function(postId) {
        var post = Post.findOne({_id: postId});

        if (!Roles.userIsInRole(this.userId, ['moderator']))
            return;

        var results = [];


        post.links.forEach(function(link) {
            results.push(Post.update({_id: link.target},
                        { $pull: { replyIDs: postId}}));
        });

        post.replyIDs.forEach(function(link) {
            results.push(Post.update({_id: link},
                        { $pull: { links: {target: postId}}}));
        });

        results.push(Post.remove(postId));
        return results;
    },
    insertPost: function(post) {
        if (post.title.length >= 1 && post.title.length <= 100 && post.links.length >= 1) {
            let postId = Post.insert(post);
            for (let i in post.links) {
                Post.update({_id: post.links[i].target},
                            { $push: { replyIDs: postId}});
            }
            return postId;
        }

    },
    editPost: function(post) {
        if (post.title.length < 1 || post.title.length > 100 || post.links.length < 1 ||
           (this.userId != Post.findOne({_id: post._id}).ownerId &&
            !Roles.userIsInRole(this.userId, ['moderator']))) return;

        var linksToRemove = [], existingLinks = Post.findOne({_id: post._id}).links;

        //go through and add any new links...
        for (let i in post.links) {
            let linkTarget = post.links[i].target, linkNotPresent = true;
            for (let j in existingLinks) {
                let existingLink = existingLinks[j];
                if (existingLink.target == linkTarget) {
                    linkNotPresent = false;
                    existingLinks.splice(j, 1);
                    break;
                }

            }
            if (linkNotPresent)
                Post.update({_id: linkTarget},
                            { $push: { replyIDs: post._id}});
        }

        //and then remove any obsolete ones.
        for (let j in existingLinks) {
            let existingLink = existingLinks[j];
            Post.update({_id: existingLink.target},
                        { $pull: { replyIDs: post._id}});
        }

        var ret = Post.update({_id: post._id}, { $set: {
            title: post.title,
            content: post.content,
            links: post.links,
            lastEditedAt: Date.now()
        }});

        if (ret == 1)
            return post._id;
        else {
            console.log("Oh no! Edited " + ret + " Posts!");
            return post._id;
        }
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
