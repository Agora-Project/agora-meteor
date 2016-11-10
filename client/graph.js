currentAction = "none";

Template.post.onRendered(function () {
    var instance = Template.instance();

    var postLink = Template.instance().$('.titleBar a');
    postLink.attr('title', postLink.text());

    var usernameLink = Template.instance().$('.username');
    usernameLink.attr('title', usernameLink.text());

    instance.$('.postContent').dotdotdot({
        after: 'a.readMoreLink'
    });

    Link.find({ $or: [ { sourceId: this.data._id}, { targetId: this.data._id} ] }).fetch().forEach(function(link) {
        tree.addLink(link);
    });

    Link.find({sourceId: this.data._id}).fetch().forEach(function(link) {
        handlers.addHandler(link.targetId);
    });
    Link.find({targetId: this.data._id}).fetch().forEach(function(link) {
        handlers.addHandler(link.sourceId);
    });
    tree.render();
});

Template.post.helpers({
    avatarURL: function() {
        return 'https://avatars3.githubusercontent.com/u/6981448';
    },
    replyCount: function() {
        return Link.find({ $or: [ { sourceId: this._id}, { targetId: this._id} ] }).fetch().length;
    },
    user: function() {
        return Meteor.users.findOne(this.ownerId);
    },
    hasContent: function() {
        return (this.content && this.content.length > 0);
    }
});

Template.post.events({
    'click': function(evt) {
        switch (currentAction) {
            case "deleting":
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
    'mousedown': function(evt) {
    },
    'click .showRepliesButton': function (evt) {
        Link.find({sourceId: this._id}).fetch()
        .forEach(function(link) {
            var postToAdd = Post.findOne({_id: link.targetId});
            if (postToAdd && !nodesInGraph.findOne({_id: postToAdd._id})) {
                postToAdd.type = "post";
                handlers.addHandler(postToAdd._id);
                tree.addNode(postToAdd);
            }
        });
        Link.find({targetId: this._id}).fetch()
        .forEach(function(link) {
            var postToAdd = Post.findOne({_id: link.sourceId});
            if (postToAdd && !nodesInGraph.findOne({_id: postToAdd._id})) {
                postToAdd.type = "post";
                tree.addNode(postToAdd);
                handlers.addHandler(postToAdd._id);
            }
        });
    },
    'click .replyButton': function(evt) {
        if (!Meteor.userId()) return;
        if (!nodesInGraph.findOne({type: "reply"})) {
            let _id = tree.addNode({type: "reply", links: [this._id]});
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
    'click .closeButton': function(evt) {
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

    Link.find({ $or: [ { sourceId: this.data._id}, { targetId: this.data._id} ] }).fetch().forEach(function(link) {
        tree.addLink(link);
    });

    tree.render();
});

Template.reply.events({
    'click .closeButton': function(evt) {
        tree.removeNode(this);
    },
    'click .submitButton': function(evt) {
        if (!Meteor.userId()) return;
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


Template.forumIndex.events({
    'click .button-delete': function() {
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
            if (tree.addLink(doc)) tree.render();
        },
        removed: function(doc) {
            if (init) return;
            if (tree.removeLink(doc)) tree.render();
        }
    });

    tree.render();
    init = false;
};

function linksToD3Array(linksCol, nodesCol) {
    var nodes = {};
    nodesCol.forEach(function(node) {
        nodes[node._id] = node;
    });
    var result = [];
    linksCol.forEach(function(link) {
        var tmp = {
            source: nodes[link.sourceId],
            target: nodes[link.targetId],
            type: link.type,
            _id: link._id
        };
        if (tmp.source && tmp.target) {
            result.push(tmp);
        }
    });
    return result;
};

function ForumTree(forumIndex, nodesCursor, linksCursor) {
    this.forumIndex = forumIndex;

    var postWidth = 140, postHeight = 100;

    //put nodes and links into D3-friendly arrays
    this.nodes = [];
    nodesCursor.fetch().forEach(function(n) {
        n.selectable = true;
        if (nodesInGraph.findOne({_id: n._id})) this.nodes.push(n);
    });
    this.links = linksToD3Array(linksCursor.fetch(), this.nodes);

    //find our SVG element for the forumIndex template and assign our SVG variable to it as a reference.
    //Then, beloy that add code so that when we're adding new links to the graph,
    //it will draw them to the mouse cursor as it's moved around.
    var svg = d3.select("#posts-graph");

    svg.selectAll("*").remove();

    var linksGroup = svg.append("g");
    var linkElements = linksGroup.selectAll("line");

    // init force layout
    var force = d3.layout.force()
        .nodes(this.nodes)
        .links(this.links)
        .gravity(0.10)
        .charge(-20000)
        .chargeDistance(400)
        .friction(0.9)
        .linkStrength(0.85)
        .linkDistance(function(link) {
            let linkDistance = 0;
            linkDistance += $("#post-" + link.source._id).outerHeight() / 2;
            linkDistance += $("#post-" + link.target._id).outerHeight() / 2;
            linkDistance *= 3;
            //console.log("" + $("#post-" + link.target._id).outerHeight() + ", " + linkDistance)
            return linkDistance;
        })
        .on("tick", tick);

    this.force = force;

    // setup z-index to prevent overlapping lines over nodes

    resize();
    d3.select(window).on("resize", resize);

    // tick
    function tick(e) {
        //This if statement keeps the app from choking when reloading the page.
        if (!force.nodes()[0] || !force.nodes()[0].y) { return; }

        var links = force.links();
        var nodes = force.nodes();

        var k = 6 * e.alpha;
        links.forEach(function(d, i) {
            if (d.source.y < d.target.y + 160) {
                d.source.y += k;
                d.target.y -= k;
            }
        });
    }

    // resize svg and force layout when screen size change
    function resize() {
        var width = window.innerWidth, height = window.innerHeight;
        svg.attr("width", width).attr("height", height);
        force.size([width, height]).resume();
    }

    // dynamically update the graph
    this.render = function() {

        // add links
        contextMenuShowing = false;

        linkElements = linkElements.data(force.links(), function(d, i) { return d._id; });
        linkElements.exit().remove();

        var edgeSelection = linkElements.enter().append("line")
            .classed('link', true)
            .attr('stroke', function (d) {
                if (d.type == "Attack") {
                    return 'red';
                } else {
                    return 'black';
                }
            });

        force.start();
        for (var i = 0; i < 1000; i++) force.tick();
        force.stop();

        linkElements
            .attr("x1", function (d) {
                return d.source.x;
            })
            .attr("y1", function (d) {
                return d.source.y;
            })
            .attr("x2", function (d) {
                return d.target.x;
            })
            .attr("y2", function (d) {
                return d.target.y;
            });

        this.nodes.forEach(function(d) {
            if (d.type == "post") {
                let post = $("#post-" + d._id);
                let xAdjust = (post.outerWidth() / 2);
                let yAdjust = (post.outerHeight() / 2);
                post.css("left", d.x - xAdjust).css("top", d.y - yAdjust);
            } else if (d.type == "reply") {
                $("#reply-" + d._id).css("left", d.x - 160).css("top", d.y - 112);
            }
        });
    };

    this.addNode = function(doc) {
        if (!this.nodes.find(function(n) {return (doc._id == n._id)})) {
            if (!nodesInGraph.findOne({_id: doc._id})) {
                let _id = nodesInGraph.insert(doc);
                doc = nodesInGraph.findOne({_id: _id});
            }
            this.nodes.push(doc);

            return doc._id;
        }
        return false;
    };

    this.addLink = function(doc) {
        if (!doc._id) {
            var _id = nodesInGraph.insert(doc);
            doc = nodesInGraph.findOne({_id: _id});
        }
        let link = linksToD3Array([doc], this.nodes)[0];
        if (link && !this.containsLink(doc)) {
            this.links.push(link);
            this.render();
            return true;
        }
        return false;
    };

    this.containsLink = function(doc) {
        if (doc._id && this.links.find(function(l) {return (doc._id == l._id)}))
            return true;

        let link = linksToD3Array([doc], this.nodes)[0];
        if (this.links.find(function(l) {return (link.source == l.source && link.target == l.target)}))
            return true;

        return false;
    }

    this.removeNode = function(doc) {
        var iToRemove = -1;
        if (this.nodes.length !== 0) {
            this.nodes.forEach(function(node, i) {
                if (node._id === doc._id) {
                    iToRemove = i;
                }
            });
        }
        if (iToRemove != -1) {
            for (i = 0; i < this.links.length;) {
                link = this.links[i];
                if (link.source._id === doc._id || link.target._id == doc._id)
                    this.links.splice(i, 1);
                else i++;
            }
            this.nodes.splice(iToRemove, 1);
            nodesInGraph.remove({_id: doc._id});
            this.render();
            return true;
        }
        return false;
    };

    this.removeLink = function(doc) {
        var iToRemove = -1;
        this.links.forEach(function(link, i) {
            if (link._id === doc._id) {
                iToRemove = i;
            } else if (link.source._id == doc.sourceId && link.target._id == doc.targetId) {
                iToRemove = i;
            }
        });
        if (iToRemove != -1) {
            this.links.splice(iToRemove, 1);
            this.render();
            return true;
        }
        return false;
    };
}
