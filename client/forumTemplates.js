currentAction = "none";
templates = {};
var unFocus = function () {
  if (document.selection) {
    document.selection.empty()
  } else {
    window.getSelection().removeAllRanges()
  }
}

Template.post.onCreated(function () {
    templates[this.data._id] = this;
    this.linkCount = new ReactiveVar(0);

    let linksCursor = Link.find({ $or: [ { sourceId: this.data._id}, { targetId: this.data._id} ] });

    let self = this;

    linksCursor.observe({
        added: function(doc) {
            let _id;
            if (self.data._id == doc.sourceId)
                _id = doc.targetId;
            if (self.data._id == doc.targetId)
                _id = doc.sourceId;


            if (!templates[_id])
                self.linkCount.set(self.linkCount.get() + 1);
        },
        removed: function(doc) {
            if (!templates[doc._id])
                self.linkCount.set(self.linkCount.get() - 1);
        }
    });

    Link.find({sourceId: this.data._id}).forEach(function(link) {
        handlers.addHandler(link.targetId);
        var temp = templates[link.targetId];
        if (temp) temp.linkCount.set(temp.linkCount.get() - 1);
    });
    Link.find({targetId: this.data._id}).forEach(function(link) {
        handlers.addHandler(link.sourceId);
        var temp = templates[link.sourceId];
        if (temp) temp.linkCount.set(temp.linkCount.get() - 1);
    });
});

Template.post.onRendered(function () {
    var instance = Template.instance();

    var postLink = instance.$('.titleBar a');
    postLink.attr('title', postLink.text());

    var usernameLink = instance.$('.username');
    usernameLink.attr('title', usernameLink.text());
    
    Link.find({ $or: [ { sourceId: this.data._id}, { targetId: this.data._id} ] })
    .forEach(function(link) {
        tree.addLink(link);
    });

    tree.runGraph();
    tree.render();
});

Template.post.onDestroyed(function () {
    var self = this;
    Link.find({sourceId: this.data._id}).forEach(function(link) {
        var temp = templates[link.targetId];
        if (temp) temp.linkCount.set(temp.linkCount.get() + 1);
    });
    Link.find({targetId: this.data._id}).forEach(function(link) {
        var temp = templates[link.sourceId];
        if (temp) temp.linkCount.set(temp.linkCount.get() + 1);
    });

    delete templates[this.data._id];
});

Template.post.helpers({
    avatarURL: function() {
        return 'https://avatars3.githubusercontent.com/u/6981448';
    },
    replyCount: function() {
        return Template.instance().linkCount.get();
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
        if (event.button != 0) return;
        event.stopImmediatePropagation();
    },
    'mousedown .draggable, touchstart .draggable': function(event) {
        if (event.button != 0) return;
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

    instance.$(".titleInput").focus();
});

Template.reply.events({
    'mousedown .unDraggable, touchstart .unDraggable': function(event) {
        if (event.button != 0) return;
        event.stopImmediatePropagation();
    },
    'mousedown draggable, touchstart .draggable': function(event) {
        if (event.button != 0) return;
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
        let title = $('#titleInput-' + this._id).val();
        let content = $('#contentInput-' + this._id).val();
        if (!Meteor.userId() || this.links.length < 1 || title.length < 1) return;
        let newReplyPost = {
            links: this.links,
            title: title,
            content: content

        };
        Meteor.call("insertPost", newReplyPost, function(error, result) {
            handlers.stop(result);
            handlers.addHandler(result, {
                onReady: function() {
                    let doc = Post.findOne({_id: result});
                    doc.type = "post";
                    tree.addNode(doc);
                }
            });
        });
        tree.removeNode(this);
    },
    'wheel': function(event) {
        event.stopImmediatePropagation();
    },
});

Template.forumIndex.onRendered(function () {
    var instance = Template.instance();

    Template.instance().scale = 1;
});

Template.forumIndex.events({
    'mousedown, touchstart': function(event, template) {
        if (event.button != 0) return;
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
    'wheel': function(event) {
        if (event.originalEvent.deltaY < 0) {
            Template.instance().scale *= 4;
            Template.instance().scale /= 3;
        } else {
            Template.instance().scale *= 3;
            Template.instance().scale /= 4;
        }
        $(".graphContainer").css("transform", "scale(" +
        Template.instance().scale + ")");
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
