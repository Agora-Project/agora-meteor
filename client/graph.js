currentAction = "none";
newLink = null;

Template.post.onRendered(function () {
    var instance = Template.instance();

    var postLink = Template.instance().$('.titleBar a');
    postLink.attr('title', postLink.text());

    var usernameLink = Template.instance().$('.username');
    usernameLink.attr('title', usernameLink.text());

    instance.$('.postContent').dotdotdot({
        after: 'a.readMoreLink'
    });
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
    }
});

Template.post.events({
    'click': function(evt) {
        switch (currentAction) {
            case "none":
                break;
            case "deleting":
                if ((this.ownerId === Meteor.userId() ||
                    Roles.userIsInRole(Meteor.userId(), ['moderator'])) &&
                    confirm("Are you sure you want to permanently delete this post?")) {

                    tree.removeNode(this)
                    if (handlers[this._id]) handlers[this._id].stop();
                    Meteor.call('removeWithLinks', this._id);
                }
                break;
            case "linking":
                break;

        }

    },
    'mousedown': function(evt) {
        if (currentAction == 'linking') {
            console.log("Adding line!");
            newLink = {node: this};
            var xoff = $("svg").offset().left;
            var yoff = $("svg").offset().top;
            var xpos = evt.pageX - xoff;
            var ypos = evt.pageY - yoff;
            d3.select("svg").append("line")
                .classed('link', true)
                .attr("id", "newLink")
                .attr('stroke', 'black')
                .attr("x1", xpos)
                .attr("y1", ypos);
        }
    },
    'click .showRepliesButton': function (evt) {
        Link.find({sourceId: this._id}).fetch().forEach(function(link) {
            var postToAdd = Post.findOne({_id: link.targetId});
            if (!nodesInGraph.findOne({_id: postToAdd._id})) {
                postToAdd.type = "post";
                tree.addNode(postToAdd);
                handlers.addHandler(link.targetId);
            }
        });
        Link.find({targetId: this._id}).fetch().forEach(function(link) {
            var postToAdd = Post.findOne({_id: link.sourceId});
            if (!nodesInGraph.findOne({_id: postToAdd._id})) {
                postToAdd.type = "post";
                tree.addNode(postToAdd);
                handlers.addHandler(link.targetId);
            }
        });
    },
    'click .replyButton': function(evt) {
    },
    'click .closeButton': function(evt) {
        tree.removeNode(this);
    },
    'mouseup': function(evt) {
        switch (currentAction) {
            case "none":
                break;
            case "deleting":
                break;
            case "linking":
                if (newLink) {
                    console.log("dropping line!");
                    console.log (this);
                    newLink = null;
                    d3.select("#newLink").remove();
                }
                break;
        }
    }

});

Template.reply.onRendered(function () {
    var instance = Template.instance();
});

Template.reply.events({
    'click .closeButton': function(evt) {
        tree.removeNode(this);
    },
    'click .submitButton': function(evt) {
        console.log("Something!");
    },
    'mouseup': function(evt) {
        switch (currentAction) {
            case "none":
                break;
            case "deleting":
                break;
            case "linking":
                if (newLink) {
                    console.log("dropping line!");
                    console.log (this);
                    newLink = null;
                    d3.select("#newLink").remove();
                }
                break;
        }
    }

});


Template.forumIndex.events({
    'click .button-post': function() {
        var blankNode = {type: "reply"};
        tree.addNode(blankNode);
    },

    'click .button-delete': function() {
        if (currentAction != "deleting") currentAction = "deleting";
        else currentAction = "none";
    },

    'click .button-link': function() {
        if (currentAction != "linking") currentAction = "linking";
        else currentAction = "none";
    },

    'click .button-unlink': function() {
        if (currentAction != "unlinking") currentAction = "unlinking";
        else currentAction = "none";
    },

    'mousemove': function(evt) {
        if (currentAction == "linking" && newLink && newLink.node) {
            console.log("drawing line!");

            var xoff = $("svg").offset().left;
            var yoff = $("svg").offset().top;
            var xpos = evt.pageX - xoff;
            var ypos = evt.pageY;
            d3.select("#newLink")
            .attr("x2", xpos - xoff)
            .attr("y2", ypos - yoff);
        }
    }
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
    var nodes = [];

    nodesCursor.fetch().forEach(function(n) {
        n.selectable = true;
        if (nodesInGraph.findOne({_id: n._id})) nodes.push(n);
    });

    var links = linksToD3Array(linksCursor.fetch(), nodes);

    tree = new ForumTree(this, nodes, links);

    nodesCursor.observe({
        added: function(doc) {
            if (init) return;
            if (doc.isRoot || nodesInGraph.findOne({_id: doc._id})) {
                doc.type = "post";
                tree.addNode(doc);
                Link.find({sourceId: d._id}).fetch().forEach(function(link) {
                    handlers.addHandler(link.targetId);
                });
                Link.find({targetId: d._id}).fetch().forEach(function(link) {
                    handlers.addHandler(link.sourceId);
                });
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

function ForumTree(forumIndex, nodes, links) {
    this.forumIndex = forumIndex;
    this.nodes = nodes;
    this.links = links;

    var postWidth = 140, postHeight = 100;

    //find our SVG element for the forumIndex template and assign our SVG variable to it as a reference.
    //Then, beloy that add code so that when we're adding new links to the graph,
    //it will draw them to the mouse cursor as it's moved around.
    var svg = d3.select("#posts-graph");

    svg.selectAll("*").remove();

    var linksGroup = svg.append("g");
    //var nodesGroup = svg.append("g");
    var linkElements = linksGroup.selectAll("line");
    //var nodeElements = d3.selectAll(".post-container");

    // init force layout
    var force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .gravity(0.10)
        .charge(-20000)
        .chargeDistance(400)
        .friction(0.9)
        .linkDistance(350)
        .on("tick", tick);

    this.force = force;

    // setup z-index to prevent overlapping lines over nodes

    resize();
    d3.select(window).on("resize", resize);

    // tick
    function tick(e) {
        //This if statement keeps the app from choking when reloading the page.
        if (!force.nodes()[0] || !force.nodes()[0].y) { return; }
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

        var links = force.links();
        var nodes = force.nodes();

        var k = 6 * e.alpha;
        links.forEach(function(d, i) {
            d.source.y += k;
            d.target.y -= k;
        });

        nodes.forEach(function(d) {
            if (d.type == "post")
                $("#post-"+d._id).css("left", d.x - 160).css("top", d.y - 112);
            else if (d.type == "reply") {
                $("#reply-"+d._id).css("left", d.x - 160).css("top", d.y - 112);
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
        // filters go in defs element
        var defs = svg.append("defs");

        // create filter with id #drop-shadow
        // height=130% so that the shadow is not clipped
        var filter = defs.append("filter")
            .attr("id", "drop-shadow")
            .attr("height", "130%");

        // SourceAlpha refers to opacity of graphic that this filter will be applied to
        // convolve that with a Gaussian with standard deviation 3 and store result
        // in blur
        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 5)
            .attr("result", "blur");

        // translate output of Gaussian blur to the right and downwards with 2px
        // store result in offsetBlur
        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 5)
            .attr("dy", 5)
            .attr("result", "offsetBlur");

        // overlay original SourceGraphic over translated blurred opacity by using
        // feMerge filter. Order of specifying inputs is important!
        var feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "offsetBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

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
        for (var i = 1000; i > 0; --i) force.tick();
        force.stop();
    };

    this.addNode = function(doc) {
        if (!this.nodes.find(function(n) {return (doc._id == n._id)})) {
            let _id = nodesInGraph.insert(doc);
            doc = nodesInGraph.findOne({_id: _id});
            console.log(doc);
            this.nodes.push(doc);
            Link.find({ $or: [ { sourceId: doc._id}, { targetId: doc._id} ] }).fetch().forEach(function(link) {
                tree.addLink(link);
            });
            tree.render();
            return true;
        }
        return false;
    };

    this.addLink = function(doc) {
        link = linksToD3Array([doc], this.nodes)[0];
        if (link && !this.links.find(function(l) {return (link._id == l._id)})) {
            this.links.push(link);
            return true;
        }
        return false;
    };

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
            tree.render();
            return true;
        }
        return false;
    };

    this.removeLink = function(doc) {
        var iToRemove = -1;
        this.links.forEach(function(link, i) {
            if (link._id === doc._id) {
                iToRemove = i;
            }
        });
        if (iToRemove != -1) {
            this.links.splice(iToRemove, 1);
            return true;
        }
        return false;
    };
}
