currentAction = "none";

var unFocus = function () {
  if (document.selection) {
    document.selection.empty()
  } else {
    window.getSelection().removeAllRanges()
  }
}

Template.post.onRendered(function () {
    var instance = Template.instance();

    var postLink = Template.instance().$('.titleBar a');
    postLink.attr('title', postLink.text());

    var usernameLink = Template.instance().$('.username');
    usernameLink.attr('title', usernameLink.text());

    /*instance.$('.postContent').dotdotdot({
        after: 'a.readMoreLink'
    });*/

    Link.find({ $or: [ { sourceId: this.data._id}, { targetId: this.data._id} ] })
    .forEach(function(link) {
        tree.addLink(link);
    });

    Link.find({sourceId: this.data._id}).forEach(function(link) {
        handlers.addHandler(link.targetId);
    });
    Link.find({targetId: this.data._id}).forEach(function(link) {
        handlers.addHandler(link.sourceId);
    });
    tree.runGraph();
    tree.render();
});

Template.post.helpers({
    avatarURL: function() {
        return 'https://avatars3.githubusercontent.com/u/6981448';
    },
    replyCount: function() {
        return Link.find({ $or: [ { sourceId: this._id}, { targetId: this._id} ] }).count();
    },
    user: function() {
        return Meteor.users.findOne(this.ownerId);
    },
    hasContent: function() {
        return (this.content && this.content.length > 0);
    }
});

Template.post.events({
    'click': function(event) {
        switch (currentAction) {
            case "deleting":
                event.stopImmediatePropagation();
                if ((this.ownerId === Meteor.userId() ||
                    Roles.userIsInRole(Meteor.userId(), ['moderator'])) &&
                    confirm("Are you sure you want to permanently delete this post?")) {

                    tree.removeNode(this);
                    handlers.stop(this._id);
                    Meteor.call('removeWithLinks', this._id);
                }
                break;

        }

    },
    'mousedown .unDraggable, touchstart .unDraggable': function(event) {
        event.stopImmediatePropagation();
    },
    'mousedown .draggable, touchstart .draggable': function(event) {
        event.stopImmediatePropagation();
        this.dragging = true;
        this.counter = 0;
        this.mousePos = {x: event.screenX, y: event.screenY};
    },
    'mouseup, touchend': function(event) {
        unFocus();
        this.dragging = false;
        tree.render();
    },
    'mousemove, touchmove': function(event) {
        if (this.dragging) {
            unFocus();
            let node = tree.findNode(this);
            node.x += (event.screenX - this.mousePos.x);
            node.y += (event.screenY - this.mousePos.y);
            this.mousePos = {x: event.screenX, y: event.screenY};
        }
        if (this.counter <= 0) {
            tree.render();
            this.counter = 2;
        } else this.counter--;
    },
    'click .showRepliesButton': function (event) {
        Link.find({sourceId: this._id})
        .forEach(function(link) {
            var postToAdd = Post.findOne({_id: link.targetId});
            if (postToAdd && !nodesInGraph.findOne({_id: postToAdd._id})) {
                postToAdd.type = "post";
                handlers.addHandler(postToAdd._id);
                tree.addNode(postToAdd);
            }
        });
        Link.find({targetId: this._id})
        .forEach(function(link) {
            var postToAdd = Post.findOne({_id: link.sourceId});
            if (postToAdd && !nodesInGraph.findOne({_id: postToAdd._id})) {
                postToAdd.type = "post";
                tree.addNode(postToAdd);
                handlers.addHandler(postToAdd._id);
            }
        });
    },
    'click .replyButton': function(event) {
        if (!Meteor.userId()) return;
        if (!nodesInGraph.findOne({type: "reply"})) {
            let _id = tree.addNode({type: "reply", links: [this._id]})._id;
            tree.addLink({sourceId: _id, targetId: this._id});
        } else {
            let reply = nodesInGraph.findOne({type: "reply"});
            let self = this;
            if (!reply.links.find(function(link) {
                return (link == self._id);
            })) {
                nodesInGraph.update({_id: reply._id}, { $push: { links: this._id}});
                tree.addLink({sourceId: reply._id, targetId: this._id});
            } else {
                nodesInGraph.update({_id: reply._id}, { $pull: { links: this._id}});
                tree.removeLink({sourceId: reply._id, targetId: this._id});
            }
        }
    },
    'click .closeButton': function(event) {
        let reply = nodesInGraph.findOne({type: "reply"});
        let self = this;
        if (reply) {
            nodesInGraph.update({_id: reply._id}, { $pull: { links: this._id}});
            tree.removeLink({sourceId: reply._id, targetId: this._id});
        }
        tree.removeNode(this);
    }

});

Template.reply.onRendered(function () {
    var instance = Template.instance();

    tree.runGraph();
    tree.render();
});

Template.reply.events({
    'mousedown .unDraggable, touchstart .unDraggable': function(event) {
        event.stopImmediatePropagation();
    },
    'mousedown draggable, touchstart .draggable': function(event) {
        event.stopImmediatePropagation();
        this.dragging = true;
        this.counter = 0;
        this.mousePos = {x: event.screenX, y: event.screenY};
    },
    'mouseup, touchend': function(event) {
        unFocus();
        this.dragging = false;
        tree.render();
    },
    'mousemove, touchmove': function(event) {
        if (this.dragging) {
            unFocus();
            let node = tree.findNode(this);
            node.x += (event.screenX - this.mousePos.x);
            node.y += (event.screenY - this.mousePos.y);
            this.mousePos = {x: event.screenX, y: event.screenY};
        }
        if (this.counter <= 0) {
            tree.render();
            this.counter = 2;
        } else this.counter--;
    },
    'click .closeButton': function(event) {
        tree.removeNode(this);
    },
    'click .submitButton': function(event) {
        if (!Meteor.userId() || this.links.length < 1) return;
        let title = $('#titleInput-' + this._id).val();
        let content = $('#contentInput-' + this._id).val();
        let newReplyPost = {
            links: this.links,
            title: title,
            content: content

        };
        let postId = Post.insert(newReplyPost);
        handlers.addHandler(postId);
        setTimeout(function() {
            let doc = Post.findOne({_id: postId});
            doc.type = "post";
            tree.addNode(doc);
        }, 1000);
        tree.removeNode(this);
    }
});

Template.forumIndex.onRendered(function () {
    var instance = Template.instance();
});

Template.forumIndex.events({
    'mousedown, touchstart': function(event, template) {
        template.dragging = true;
        template.counter = 0;
        template.mousePos = {x: event.screenX, y: event.screenY};
    },
    'mouseup, touchend, mouseleave': function(event, template) {
        template.dragging = false;
        tree.render();
    },
    'mousemove, touchmove': function(event, template) {
        if (template.dragging) {
            unFocus();
            for (let i = 0; i < tree.nodes.length; i++) {
                tree.nodes[i].x += (event.screenX - template.mousePos.x);
                tree.nodes[i].y += (event.screenY - template.mousePos.y);
            }
            template.mousePos = {x: event.screenX, y: event.screenY};

            if (template.counter <= 0) {
                tree.render();
                template.counter = 2;
            } else template.counter--;
        }
    },
    'click .button-delete': function(event) {
        event.preventDefault();
        if (currentAction != "deleting") currentAction = "deleting";
        else currentAction = "none";
    },
});

Template.forumIndex.helpers({
    posts() {
        return nodesInGraph.find({type: "post"});
    },
    replies() {
        return nodesInGraph.find({type: "reply"});
    }
});


Template.forumIndex.rendered = function() {
    var init = true;

    var nodesCursor = Post.find({}), linksCursor = Link.find({});

    tree = new ForumTree(this, nodesCursor, linksCursor);

    nodesCursor.observe({
        added: function(doc) {
            if (init) return;
            if (doc.isRoot) {
                doc.type = "post";
                tree.addNode(doc);
            }
        },
        removed: function(doc) {
            if (init) return;
            tree.removeNode(doc);
        }
    });

    linksCursor.observe({
        added: function(doc) {
            if (init) return;
            if (nodesInGraph.findOne({_id: doc.sourceId})) {
                handlers.addHandler(doc.targetId);
            } else if (nodesInGraph.findOne({_id: doc.targetId})) {
                handlers.addHandler(doc.sourceId);
            }
            tree.addLink(doc);
        },
        removed: function(doc) {
            if (init) return;
            tree.removeLink(doc);
        }
    });

    tree.runGraph();
    tree.render();
    init = false;
};