/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

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


Template.expandedViewPostList.onCreated(function() {
    let postList = this;

    this.posts = new Mongo.Collection(null);

    for (var i in this.data.links) {
        let linkID = this.data.links[i].target;
        handlers.addHandler(linkID, {
            onReady: function() {
                let doc = Post.findOne({_id: linkID});
                if (!nodesInGraph.findOne({_id: doc._id}))
                    postList.posts.insert(doc);
            }
        });

    }
    for (var i in this.data.replyIDs) {
        let replyID = this.data.replyIDs[i];
        handlers.addHandler(replyID,  {
            onReady: function() {
                let doc = Post.findOne({_id: replyID});
                if (!nodesInGraph.findOne({_id: doc._id}))
                    postList.posts.insert(doc);
            }
        });

    }
});

Template.expandedViewPostList.onRendered(function() {
});

Template.expandedViewPostList.onDestroyed(function() {

});

Template.expandedViewPostList.helpers({
    posts: function() {
        return Template.instance().posts.find({});
    }
});

Template.expandedViewPostList.events({
    "click ": function(event) {
        event.stopImmediatePropagation();
    },
    "mousedown": function(event) {
        event.stopImmediatePropagation();
    }
});

Template.expandedViewPostListing.helpers({
    user: function() {
        return Meteor.users.findOne(this.posterID);
    }
});

Template.expandedViewPostListing.events({
    "mousedown": function(event) {
        event.stopImmediatePropagation();
    }
});
