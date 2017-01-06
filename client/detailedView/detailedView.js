/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

currentAction = "none";
templates = {};
var unFocus = function () {
    if (document.selection) {
        document.selection.empty();
    } else {
        window.getSelection().removeAllRanges();
    }
}

Template.detailedViewPost.onCreated(function () {
    templates[this.data._id] = this;
    let count = 0;

    if (this.data.links)
        this.data.links.forEach(function(link) {
            handlers.addHandler(link.target);
            var temp = templates[link.target];
            if (temp) temp.linkCount.set(temp.linkCount.get() - 1);
            else count++;
        });
    if (this.data.replyIDs)
        this.data.replyIDs.forEach(function(link) {
            handlers.addHandler(link);
            var temp = templates[link];
            if (temp) temp.linkCount.set(temp.linkCount.get() - 1);
            else count++;
        });

    this.linkCount = new ReactiveVar(count);

    this.replyDrowpdownVisible = false;
    this.hideReplyBuffer = false;

    this.hideReplyDropdown = function() {
        if (this.hideReplyBuffer == false) {
            this.replyDrowpdownVisible = false;
            this.$(".replies-dropdown-content").fadeOut(150);
        } else {
            this.hideReplyBuffer = false;
        }
    };

    this.showReplyDropdown = function() {
        this.replyDrowpdownVisible = true;
        this.$(".replies-dropdown-content").fadeIn(150);
        this.hideReplyBuffer = true;
    };

    this.moreDrowpdownVisible = false;
    this.hideMoreBuffer = false;

    this.hideMoreDropdown = function() {
        if (this.hideMoreBuffer == false) {
            this.moreDrowpdownVisible = false;
            this.$(".more-dropdown-content").fadeOut(150);
        } else {
            this.hideMoreBuffer = false;
        }
    };

    this.showMoreDropdown = function() {
        this.moreDrowpdownVisible = true;
        this.$(".more-dropdown-content").fadeIn(150);
        this.hideMoreBuffer = true;
    };
});

Template.detailedViewPost.onRendered(function () {
    var instance = Template.instance();

    var postLink = instance.$('.title-bar a');
    postLink.attr('title', postLink.text());

    var usernameLink = instance.$('.username');
    usernameLink.attr('title', usernameLink.text());

    if (tree) {
        tree.runGraph();
        tree.render();
    }

    if(this.data.content)
        instance.$('.post-content').html(XBBCODE.process({
            text: this.data.content,
            removeMisalignedTags: false,
            addInLineBreaks: true
        }).html);

});

Template.detailedViewPost.onDestroyed(function () {
    var self = this;

    this.data.links.forEach(function(link) {
        var temp = templates[link.target];
        if (temp) temp.linkCount.set(temp.linkCount.get() + 1);
    });
    this.data.replyIDs.forEach(function(link) {
        var temp = templates[link];
        if (temp) temp.linkCount.set(temp.linkCount.get() + 1);
    });

    delete templates[this.data._id];
});

Template.detailedViewPost.helpers({
    replyCount: function() {
        return Template.instance().linkCount.get();
    },
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
    'mousedown .undraggable, touchstart .undraggable': function(event) {
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
    'click .show-replies-button': function (event) {
        if (!this.showReplyDropdown) {
            Template.instance().showReplyDropdown();
        } else {
            Template.instance().hideReplyDropdown();
        }
    },
    'click .load-all-button': function (event) {

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
        return;
    },
    'click .show-list-button': function (event) {

        postList.posts.remove({});

        for (var i in this.links) {
            let linkID = this.links[i].target;
            handlers.addHandler(linkID, {
                onReady: function() {
                    let doc = Post.findOne({_id: linkID});
                    if (!nodesInGraph.findOne({_id: doc._id}))
                        postList.posts.insert(doc);
                }
            });

        }
        for (var i in this.replyIDs) {
            let replyID = this.replyIDs[i];
            handlers.addHandler(replyID,  {
                onReady: function() {
                    let doc = Post.findOne({_id: replyID});
                    if (!nodesInGraph.findOne({_id: doc._id}))
                        postList.posts.insert(doc);
                }
            });

        }

        postList.show();
        return;
    },
    'click .reply-button': function(event) {
        if (!Meteor.userId()) return;
        if (!nodesInGraph.findOne({ $or: [ {type: "reply"}, {type: "edit"} ] })) {
            let _id = tree.addNode({type: "reply", links: [{target: this._id}]})._id;
            tree.addLink({sourceId: _id, targetId: this._id});
        } else {
            let reply = nodesInGraph.findOne({ $or: [ {type: "reply"}, {type: "edit"} ] });
            let self = this;
            if (!reply.links.find(function(link) {
                return (link.target == self._id);
            })) {
                nodesInGraph.update({_id: reply._id}, { $push: { links: {target: this._id}}});
                tree.addLink({sourceId: reply._id, targetId: this._id});
            } else {
                nodesInGraph.update({_id: reply._id}, { $pull: { links: {target: this._id}}});
                tree.removeLink({sourceId: reply._id, targetId: this._id});
            }
        }
    },
    'click .close-button': function(event) {
        tree.removeNode(this);
    },
    'click .more-button': function(event) {
        if (!this.showMoreDropdown) {
            Template.instance().showMoreDropdown();
        } else {
            Template.instance().hideMoreDropdown();
        }
    },
    'click .edit-post-button': function(event) {
        if (!nodesInGraph.findOne({type: "reply"})) {
            tree.removeNode(this);
            nodesInGraph.remove({_id: this._id});
            this.type = "edit";
            nodesInGraph.insert(this);
            tree.addNode(this);
        }
    }
});

Template.detailedViewReply.onRendered(function () {
    var instance = Template.instance();

    tree.runGraph();
    tree.render();

    instance.$(".title-input").focus();
    if (!this.data) return;
    if (this.data.title) instance.$(".title-input").val(this.data.title);
    if (this.data.content) instance.$(".content-input").val(this.data.content);
});

Template.detailedViewReply.events({
    'mousedown .unDraggable, touchstart .undraggable': function(event) {
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
    'click .close-button': function(event) {
        tree.removeNode(this);
    },
    'click .submit-button': function(event) {
        if (this.type == "reply") {
            if (this.links.length < 1) return;
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
                let doc = Post.findOne({_id: result});
                doc.type = "post";
                tree.addNode(doc);
            });
        }
        tree.removeNode(this);
    },
    'wheel': function(event) {
        event.stopImmediatePropagation();
    },
});

Template.detailedView.onCreated(function() {
    if (this.data) {
        let _id = this.data;
        handlers.addHandler(_id, {
            onReady: function() {
                let doc = Post.findOne({_id: _id});
                doc.type = "post";
                tree.addNode(doc);
            }
        });
    } else handlers.addHandler(null, {
        onReady: function() {
            let doc = Post.findOne({$where : '!this.links || this.links.length < 1'});
            doc.type = "post";
            tree.addNode(doc);
        }
    });
})

Template.detailedView.events({
    'mousedown, touchstart': function(event, template) {
        if (event.button != 0) return;
        template.dragging = true;
        template.counter = 0;
        template.mousePos = {x: event.screenX, y: event.screenY};
    },
    'mouseup, touchend': function(event, template) {
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
        return;
        if (event.originalEvent.deltaY < 0) {
            Template.instance().scale *= 4;
            Template.instance().scale /= 3;
        } else {
            Template.instance().scale *= 3;
            Template.instance().scale /= 4;
        }
        $(".detailed-view-centerer").css("transform", "scale(" +
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

Template.detailedView.onRendered(function() {
    var init = true;

    var nodesCursor = Post.find({});

    tree = new ForumTree(this, nodesCursor);

    nodesCursor.observe({
        added: function(doc) {
            if (init) return;

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
        },
        changed: function(doc) {
            post = nodesInGraph.findOne({_id: doc._id});
            if (post) {
                var countChange = (doc.links.length + doc.replyIDs.length)
                                - (post.links.length + post.replyIDs.length);
                doc.type = post.type;
                for (let link of post.links) {
                    console.log(link);
                    if (!doc.links.find(function(l) {return (link.target == l.target)}))
                        tree.removeLink({sourceId: doc._id, targetId: link.target});
                }

                nodesInGraph.update({_id: doc._id}, doc);
                var temp = templates[doc._id];
                temp.linkCount.set(temp.linkCount.get() + countChange);
            }
        }
    });

    tree.runGraph();
    tree.render();
    init = false;
});

Template.detailedViewPostList.onCreated(function() {
    postList = this;
    this.posts = new Mongo.Collection(null);
    this.isVisible = false;
    this.hideBuffer = false;

    this.hide = function() {
        if (this.hideBuffer == false) {
            this.isVisible = false;
            this.$(".detailed-post-list").fadeOut(150);
        } else {
            this.hideBuffer = false;
        }
    };

    this.show = function() {
        this.isVisible = true;
        this.$(".detailed-post-list").fadeIn(150);
        this.hideBuffer = true;
    };
});

Template.detailedViewPostList.onRendered(function() {
});

Template.detailedViewPostList.onDestroyed(function() {

});

Template.detailedViewPostList.helpers({
    posts: function() {
        return Template.instance().posts.find({});
    }
});

Template.detailedViewPostList.events({
    "click ": function(event) {
        event.stopImmediatePropagation();
        postList.hideBuffer = true;
    },
    "mousedown": function(event) {
        event.stopImmediatePropagation();
    }
});

Template.detailedViewPostListing.helpers({
    user: function() {
        return Meteor.users.findOne(this.posterID);
    }
});

Template.detailedViewPostListing.events({
    "click": function(event) {
        postList.hideBuffer = true;
        let _id = this._id;
        handlers.addHandler(_id, {
            onReady: function() {
                let doc = Post.findOne({_id: _id});
                doc.type = "post";
                tree.addNode(doc);
                postList.posts.remove({_id: _id});
                if (postList.posts.find({}).count() == 0)
                    postList.hide();
            }
        });


    },
    "mousedown": function(event) {
        event.stopImmediatePropagation();
    }
});

$(window).click(function() {
    if (postList) postList.hide();
    for (let i in templates) {
        templates[i].hideReplyDropdown();
        templates[i].hideMoreDropdown();
    }
});
