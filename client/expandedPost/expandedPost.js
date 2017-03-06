/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/


var unFocus = function () {
    if (document.selection) {
        document.selection.empty();
    } else {
        window.getSelection().removeAllRanges();
    }
}

Template.expandedPost.onRendered(function () {
    var instance = Template.instance();

    if(this.data.content)
        instance.$('.expanded-post-content').html(XBBCODE.process({
            text: this.data.content,
            removeMisalignedTags: false,
            addInLineBreaks: true
        }).html);

});

Template.expandedPost.helpers({
    user: function() {
        return Meteor.users.findOne(this.posterID);
    },
    hasContent: function() {
        return (this.content && this.content.length > 0);
    },
    editAccess: function() {
        return ((this.ownerId && this.ownerId === Meteor.userId()) ||
        Roles.userIsInRole(Meteor.userId(), ['moderator']));
    },
    age: function() {
        return new Date(this.postedOn).toDateString();
    }
});

MakeOverviewGraph(Template.hourglassView, Template.hourglassNode, Template.hourglassPost,
    function(templateInstance, postCollection) {
        let postsToProcess = [templateInstance.data];
        let posts = {};
        
        //Go through and grab the post and all posts above it, and add them
        //to the graph.
        while (postsToProcess.length > 0) {
            let post = postsToProcess[0];
            
            if (!posts[post._id]) {
                postCollection.insert(post);
                posts[post._id] = post;
            }
            
            for (var i of post.links) {
                let linkID = i.target;
                let doc = Post.findOne({_id: linkID});
                postsToProcess.push(doc);
            }
            postsToProcess.splice(0,1);
        }

        //Go through and grab the post and all posts below it, and add them
        //to the graph.
        postsToProcess = [templateInstance.data];
        while (postsToProcess.length > 0) {
            let post = postsToProcess[0];
            
            if (!posts[post._id]) {
                postCollection.insert(post);
                posts[post._id] = post;
            }

            for (var replyID of post.replyIDs) {
                let doc = Post.findOne({_id: replyID});
                postsToProcess.push(doc);
            }
            postsToProcess.splice(0,1);
        }
    });
