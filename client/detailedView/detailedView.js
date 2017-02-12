/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

let currentAction = "none";
let templates = {};
let tree, postList, reportForm;

var unFocus = function () {
    if (document.selection) {
        document.selection.empty();
    } else {
        window.getSelection().removeAllRanges();
    }
}

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
            tree.forEachNode(function(node) {
                node.x += event.screenX - template.mousePos.x;
                node.y += event.screenY - template.mousePos.y;
            });

            template.mousePos = {x: event.screenX, y: event.screenY};

            //Horrible hack to improve performance.
            //TODO: Replace with a requestAnimationFrame() callback.
            if (template.counter <= 0) {
                tree.render();
                template.counter = 2;
            }
            else {
                template.counter--;
            }
        }
    },
    'wheel': function(event) {
        return;
        if (event.originalEvent.deltaY < 0) {
            Template.instance().scale *= 4.0/3.0;
        } else {
            Template.instance().scale *= 3.0/4.0;
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
        return nodesInGraph.find({nodeType: "post"});
    },
    replies: function() {
        return nodesInGraph.find({ $or: [ {nodeType: "reply"}, {nodeType: "edit"} ] });
    },
    checkIfModerator: function() {
        return Roles.userIsInRole(Meteor.userId(), ['moderator']);
    }
});

Template.detailedView.onRendered(function() {

    tree = new ForumTree();

    var nodesCursor = Post.find({});

    // This code adds any posts that are already loaded to the graph once the
    // graph is finished being instantiated. This is used when navigating way
    // from the detailed view page and then back to it, so as to keep the same
    // nodes in the graph.
    nodesCursor.forEach(function(n) {
        if (n.links.length < 1 || nodesInGraph.findOne({_id: n._id})) {
            tree.addNode(n);
        }
    });

    if (this.data) {
        let _id = this.data;
        handlers.addHandler(_id, {
            onReady: function() {
                let doc = Post.findOne({_id: _id});
                tree.addNode(doc);
            }
        });
    } else handlers.addHandler(null, {
        onReady: function() {
            let doc = Post.findOne({$where : '!this.links || this.links.length < 1'});
            tree.addNode(doc);
        }
    });

    nodesCursor.observe({
        added: function(doc) {

            if (nodesInGraph.findOne({_id: doc._id})) {
                for (var i of doc.links) {
                    let linkID = i.target;
                    handlers.addHandler(linkID);

                }
                for (var replyID of doc.replyIDs) {
                    handlers.addHandler(replyID);

                }
            }


        },
        removed: function(doc) {
            tree.removeNode(doc);
        },
        changed: function(doc) {
            //If the changed post is in the graph, adjust things appropriately.
            //If not, we don't need to do anything.
            post = nodesInGraph.findOne({_id: doc._id});
            if (post) {
                //specifically, change the counters to show how many links it's
                //post has.
                var countChange = (doc.links.length + doc.replyIDs.length)
                                - (post.links.length + post.replyIDs.length);
                doc.nodeType = post.nodeType;
                for (let link of post.links) {
                    if (!doc.links.find(function(l) {return (link.target == l.target)}))
                        tree.removeLink({sourceId: doc._id, targetId: link.target});
                }

                var temp = templates[doc._id];
                temp.linkCount.set(temp.linkCount.get() + countChange);

                //And update it's text, of course.
                nodesInGraph.update({_id: doc._id}, doc);
            }
        }
    });

    tree.runGraph();
    tree.render();
});

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

    this.hideReplyDropdown = function() {
        this.$(".replies-dropdown-content").fadeOut(150);
    };

    this.showReplyDropdown = function() {
        this.$(".replies-dropdown-content").fadeIn(150);
    };

    this.hideMoreDropdown = function() {
        this.$(".more-dropdown-content").fadeOut(150);
    };

    this.showMoreDropdown = function() {
        this.$(".more-dropdown-content").fadeIn(150);
    };
});

Template.detailedViewPost.onRendered(function () {
    var instance = Template.instance();

    var postLink = instance.$('.title-bar a');
    postLink.attr('title', postLink.text());

    var usernameLink = instance.$('.username');
    usernameLink.attr('title', usernameLink.text());

    tree.runGraph();
    tree.render();

    if(this.data.content)
        instance.$('.post-content').html(XBBCODE.process({
            text: this.data.content,
            removeMisalignedTags: false,
            addInLineBreaks: true
        }).html);

    this.showRepliesButton = this.$(".show-replies-button");
    this.moreButton = this.$(".more-button");
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
                //Stop the event from cascading down to other objects and
                //tirggering their events.
                event.originalEvent.stopPropagation();
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
        //Stop the event from cascading down to other objects and
        //tirggering their events.
        event.originalEvent.stopPropagation();
    },
    'mousedown .draggable, touchstart .draggable': function(event) {
        if (event.button != 0) return;
        //Stop the event from cascading down to other objects and
        //tirggering their events.
        event.originalEvent.stopPropagation();
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

        for (var i of this.links) {
            let linkID = i.target;
            handlers.addHandler(linkID, {
                onReady: function() {
                    let doc = Post.findOne({_id: linkID});
                    tree.addNode(doc);
                }
            });

        }
        for (var replyID of this.replyIDs) {
            handlers.addHandler(replyID,  {
                onReady: function() {
                    let doc = Post.findOne({_id: replyID});
                    tree.addNode(doc);
                }
            });

        }
        return;
    },
    'click .show-list-button': function (event) {

        postList.posts.remove({});

        for (var i of this.links) {
            let linkID = i.target;
            handlers.addHandler(linkID, {
                onReady: function() {
                    let doc = Post.findOne({_id: linkID});
                    if (!nodesInGraph.findOne({_id: doc._id}))
                        postList.posts.insert(doc);
                }
            });

        }
        for (var replyID of this.replyIDs) {
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
        if (!nodesInGraph.findOne({ $or: [ {nodeType: "reply"}, {nodeType: "edit"} ] })) {
            let _id = tree.addNode({nodeType: "reply", links: [{target: this._id}]})._id;
            tree.addLink({sourceId: _id, targetId: this._id});
        } else {
            let reply = nodesInGraph.findOne({ $or: [ {nodeType: "reply"}, {nodeType: "edit"} ] });
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
        if (!nodesInGraph.findOne({nodeType: "reply"})) {
            tree.removeNode(this);
            this.nodeType = "edit";
            tree.addNode(this);
        }
    },
    'click .report-post-button': function(event) {
        reportForm.postData = this;
        reportForm.show();
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
        //Stop the event from cascading down to other objects and
        //tirggering their events.
        event.originalEvent.stopPropagation();
    },
    'mousedown draggable, touchstart .draggable': function(event) {
        if (event.button != 0) return;
        //Stop the event from cascading down to other objects and
        //tirggering their events.
        event.originalEvent.stopPropagation();
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
        if (this.nodeType == "reply") {
            if (this.links.length < 1) return;
            let title = $('#titleInput-' + this._id).val();
            let content = $('#contentInput-' + this._id).val();
            if (!Meteor.userId() || this.links.length < 1 ||
            title.length < 1 || title.length > 100) return;
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
                        tree.addNode(doc);
                    }
                });
            });
        } else if (this.nodeType == "edit") {
            this.title = $('#titleInput-' + this._id).val();
            this.content = $('#contentInput-' + this._id).val();
            if (!Meteor.userId() || this.links.length < 1 ||
            this.title.length < 1 || this.title.length > 100) return;
            Meteor.call("editPost", this, function(error, result) {
                let doc = Post.findOne({_id: result});
                tree.addNode(doc);
            });
        }
        tree.removeNode(this);
    },
    'wheel': function(event) {
        //Stop the event from cascading down to other objects and
        //tirggering their events.
        event.originalEvent.stopPropagation();
    },
});

Template.detailedViewPostList.onCreated(function() {
    postList = this;
    this.posts = new Mongo.Collection(null);

    this.hide = function() {
        this.$(".detailed-post-list").fadeOut(150);
    };

    this.show = function() {
        this.$(".detailed-post-list").fadeIn(150);
    };
});

Template.detailedViewPostList.helpers({
    posts: function() {
        return Template.instance().posts.find({});
    }
});

Template.detailedViewPostList.events({
    "click ": function(event) {
        //Stop the event from cascading down to other objects and
        //tirggering their events.
        event.originalEvent.stopPropagation();
    },
    "mousedown": function(event) {
        //Stop the event from cascading down to other objects and
        //tirggering their events.
        event.originalEvent.stopPropagation();
    }
});

Template.detailedViewPostListing.helpers({
    user: function() {
        return Meteor.users.findOne(this.posterID);
    }
});

Template.detailedViewPostListing.events({
    "click": function(event) {
        let _id = this._id;
        handlers.addHandler(_id, {
            onReady: function() {
                let doc = Post.findOne({_id: _id});
                tree.addNode(doc);
                postList.posts.remove({_id: _id});
                if (postList.posts.find({}).count() == 0)
                    postList.hide();
            }
        });


    },
    "mousedown": function(event) {
        //Stop the event from cascading down to other objects and
        //tirggering their events.
        event.originalEvent.stopPropagation();
    }
});

Template.reportPopupForm.onCreated(function() {
    //!!Global Variable!!
    reportForm = this;

    this.hide = function() {
        this.$(".report-div").fadeOut(150);
    };

    this.show = function() {
        this.$(".report-div").fadeIn(150);
    };
});

Template.reportPopupForm.onRendered(function() {
    this.$(".report-div").hide();
});

Template.reportPopupForm.events({
    "click .submit-report-button": function(event) {
        console.log("???");
        let content = Template.instance().$('.report-input').val();
        let report = {
            userID: Meteor.userId(),
            targetID: Template.instance().postData._id,
            content: content
        }
        Meteor.call("submitReport", report);
        Template.instance().hide();
    },
    "click": function(event) {
        //Stop the event from cascading down to other objects and
        //tirggering their events.
        event.originalEvent.stopPropagation();
    },
    "mousedown": function(event) {
        //Stop the event from cascading down to other objects and
        //tirggering their events.
        event.originalEvent.stopPropagation();
    }
})

$(window).click(function(event) {
    let target;

    if (event.originalEvent.originalTarget) {
        target = $(event.originalEvent.originalTarget);

    }
    else {
        target = $(event.originalEvent.srcElement);
    }

    if (!target.hasClass('show-list-button') &&
        !target.hasClass('detailed-post-list') &&
        postList) {
        postList.hide();
    }

    if (!target.hasClass('report-post-button') &&
        !target.hasClass('report-div') &&
        reportForm) {
        reportForm.hide();
    }

    for (let id in templates) {
        let template = templates[id];

        if (!target.is(template.showRepliesButton)) {
            template.hideReplyDropdown();
        }

        if (!target.is(template.moreButton)) {
            template.hideMoreDropdown();
        }
    }
});
