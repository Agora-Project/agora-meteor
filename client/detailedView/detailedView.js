currentAction = "none";
templates = {};
var unFocus = function () {
  if (document.selection) {
    document.selection.empty()
  } else {
    window.getSelection().removeAllRanges()
  }
}

Template.detailedViewPost.onCreated(function () {
    templates[this.data._id] = this;
    this.linkCount = new ReactiveVar(this.data.links.length + this.data.replyIDs.length);

    let self = this;
});

Template.detailedViewPost.onRendered(function () {
    var instance = Template.instance();

    var postLink = instance.$('.titleBar a');
    postLink.attr('title', postLink.text());

    var usernameLink = instance.$('.username');
    usernameLink.attr('title', usernameLink.text());

    tree.runGraph();
    tree.render();
});

Template.detailedViewPost.onDestroyed(function () {
    var self = this;

    delete templates[this.data._id];
});

Template.detailedViewPost.helpers({
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
    },
    editAccess: function() {
        return ((this.ownerId && this.ownerId === Meteor.userId()) ||
        Roles.userIsInRole(Meteor.userId(), ['moderator']));
    }
});

Template.detailedViewPost.events({
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
        for (var i in this.links) {
            let linkID = this.links[i].target;
            handlers.addHandler(linkID, {
                onReady: function() {
                    let doc = Post.findOne({_id: linkID});
                    doc.type = "post";
                    tree.addNode(doc);
                }
            });

        }
        for (var i in this.replyIDs) {
            let replyID = this.replyIDs[i];
            handlers.addHandler(replyID,  {
                onReady: function() {
                    let doc = Post.findOne({_id: replyID});
                    doc.type = "post";
                    tree.addNode(doc);
                }
            });

        }
    },
    'click .replyButton': function(event) {
        if (!Meteor.userId()) return;
        if (!nodesInGraph.findOne({ $or: [ {type: "reply"}, {type: "edit"} ] })) {
            let _id = tree.addNode({type: "reply", links: [{target: this._id}]})._id;
            tree.addLink({sourceId: _id, targetId: this._id});
        } else {
            let reply = nodesInGraph.findOne({ $or: [ {type: "reply"}, {type: "edit"} ] });
            let self = this;
            if (!reply.links.find(function(link) {
                return (link == self._id);
            })) {
                nodesInGraph.update({_id: reply._id}, { $push: { links: {target: this._id}}});
                tree.addLink({sourceId: reply._id, targetId: this._id});
            } else {
                nodesInGraph.update({_id: reply._id}, { $pull: { links: {target: this._id}}});
                tree.removeLink({sourceId: reply._id, targetId: this._id});
            }
        }
    },
    'click .closeButton': function(event) {
        tree.removeNode(this);
    },
    'click .moreButton': function(event) {
        if (!this.showDropdown) {
            Template.instance().$(".dropdownContent").fadeIn(150);
            this.showDropdown = true;
        } else {
            Template.instance().$(".dropdownContent").fadeOut(150);
            this.showDropdown = false;
        }
    },
    'click .editPostButton': function(event) {
        if (!nodesInGraph.findOne({type: "reply"})) {
            tree.removeNode(this);
            nodesInGraph.remove({_id: this._id});
            this.type = "edit";
            this.links = [];
            var post = this;
            nodesInGraph.insert(this);
            tree.addNode(this);
        }
    }
});

Template.detailedViewReply.onRendered(function () {
    var instance = Template.instance();

    tree.runGraph();
    tree.render();

    instance.$(".titleInput").focus();
    if (!this.data) return;
    if (this.data.title) instance.$(".titleInput").val(this.data.title);
    if (this.data.content) instance.$(".contentInput").val(this.data.content);
});

Template.detailedViewReply.events({
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
        if (this.links.length < 1) return;
        if (this.type == "reply") {
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
        } else if (this.type == "edit") {
            this.title = $('#titleInput-' + this._id).val();
            this.content = $('#contentInput-' + this._id).val();
            Meteor.call("editPost", this, function(error, result) {
                handlers.stop(result);
                handlers.addHandler(result, {
                    onReady: function() {
                        let doc = Post.findOne({_id: result});
                        doc.type = "post";
                        tree.addNode(doc);
                    }
                });
            });
        }
        tree.removeNode(this);
    },
    'wheel': function(event) {
        event.stopImmediatePropagation();
    },
});

Template.detailedView.onRendered(function () {
    var instance = Template.instance();

    Template.instance().scale = 1;
});

Template.detailedView.events({
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

Template.detailedView.helpers({
    posts: function() {
        return nodesInGraph.find({type: "post"});
    },
    replies: function() {
        return nodesInGraph.find({ $or: [ {type: "reply"}, {type: "edit"} ] });
    },
    checkIfModerator: function() {
        return Roles.userIsInRole(Meteor.userId(), ['moderator']);
    }
});

Template.detailedView.rendered = function() {
    var init = true;

    var nodesCursor = Post.find({});

    tree = new ForumTree(this, nodesCursor);

    nodesCursor.observe({
        added: function(doc) {
            if (init) return;
            if (doc.links.length < 1) {
                doc.type = "post";
                tree.addNode(doc);
            }

            if (nodesInGraph.findOne({_id: doc._id})) {
                for (var i in doc.links) {
                    let linkID = doc.links[i].target;
                    handlers.addHandler(linkID);

                }
                for (var i in doc.replyIDs) {
                    let replyID = doc.replyIDs[i];
                    handlers.addHandler(replyID);

                }
            }


        },
        removed: function(doc) {
            if (init) return;
            tree.removeNode(doc);
        }
    });

    tree.runGraph();
    tree.render();
    init = false;
};
