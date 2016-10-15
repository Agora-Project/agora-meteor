mouseLinking = false;
linkNode = undefined;
newLink = {node: null};

Template.post.onRendered(function() {
    var instance = Template.instance();

    var postLink = Template.instance().$('.titleBar a');
    postLink.attr('title', postLink.text());

    var usernameLink = Template.instance().$('.username');
    usernameLink.attr('title', usernameLink.text());

    instance.$('.postContent').dotdotdot({
        after: "a.readMoreLink"
    });
});

Template.post.helpers({
    avatarURL: function() {
        return 'https://avatars3.githubusercontent.com/u/6981448';
    },
    username: function() {
        return 'SmashMaster';
    },
    replyCount: function() {
        return 752;
    }
});

Template.post.events({
    'click .showRepliesButton': function (evt) {
        Link.find({sourceId: this._id}).fetch().forEach(function(link) {
            var postToAdd = Post.findOne({_id: link.targetId});
            if (!nodesInGraph.findOne({_id: postToAdd._id})) {
                nodesInGraph.insert(postToAdd);
                tree.addNode(postToAdd);
                handlers.addHandler(link.targetId);
            }
        });
        Link.find({targetId: this._id}).fetch().forEach(function(link) {
            var postToAdd = Post.findOne({_id: link.sourceId});
            if (!nodesInGraph.findOne({_id: postToAdd._id})) {
                nodesInGraph.insert(postToAdd);
                tree.addNode(postToAdd);
                handlers.addHandler(link.targetId);
            }
        });
    },
    'click .replyButton': function(evt) {

        var newReplyPost = {
            ownerId: Meteor.userId(),
            title: 'Reply',
            content: "This post is a reply."
        }

        Post.insert(newReplyPost);
    }

});

Template.forumIndex.events({
    'click .button-post': function() {
        if (!tempNodes) tempNodes = 0;
        var blankNode = {replyNode: true, _id: tempNodes++};
        tree.addNode(blankNode);
    },

    'click .button-delete': function() {
        for (var post in Session.get('selectedTargets')) {
            if (tree.removeNode(post)) tree.render();
            if (handlers[post._id]) handlers[post._id].stop();
            Post.removeWithLinks(post);
        }
    },

    'click .button-link': function() {
        mouseLinking = !mouseLinking;
        d3.selectAll('.node').on('mousedown.drag', null).call(mouseLinking ? tree.createLink : tree.drag);
    }
});

Template.forumIndex.helpers({
    posts() {
        return nodesInGraph.find();
    }
});

Template.forumIndex.rendered = function() {

    Session.setDefault('selectedTargets', {});

    var init = true;

    //the nodeIDMap exists so that we don't need to have a 1:1 correspondence
    //between nodes loaded into out local collection and nodes loaded into the
    //graph. We can have posts that aren't shown on the graph, and things in the graph that aren't posts.

    var nodesCursor = Post.find({}), linksCursor = Link.find({});
    var nodes = [];

    nodesCursor.fetch().forEach(function(n) {
        n.selectable = true;
        nodeIDMap.add(n);
        if (nodesInGraph.findOne({_id: n._id})) nodes.push(n);
    });

    var links = linksToD3Array(linksCursor.fetch(), nodes);

    tree = new ForumTree(this, nodes, links);

    nodesCursor.observe({
        added: function(doc) {
            if (init) return;
            if (doc.isRoot || nodesInGraph.findOne({_id: doc._id})) {
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

function contextMenu() {
    var height,
        width,
        margin = 0.1, // fraction of width
        items = [],
        rescale = false,
        style = {
            'rect': {
                'mouseout': {
                    'fill': 'rgb(244,244,244)',
                    'stroke': 'white',
                    'stroke-width': '1px'
                },
                'mouseover': {
                    'fill': 'rgb(200,200,200)'
                }
            },
            'text': {
                'fill': 'steelblue',
                'font-size': '13'
            }
        };

    function menu(x, y) {
        d3.select('.context-menu').remove();
        scaleItems();

        // Draw the menu
        d3.select('svg').append('g')
            .attr('class', 'context-menu')
            .selectAll('tmp')
            .data(items)
            .enter()
            .append('g')
                .attr('class', 'menu-entry')
                .style({'cursor': 'pointer'})
                .on('mouseover', function() {
                    d3.select(this).select('rect').style(style.rect.mouseover)
                })
                .on('mouseout', function() {
                    d3.select(this).select('rect').style(style.rect.mouseout)
                });

        d3.selectAll('.menu-entry').append('rect')
            .attr('x', x)
            .attr('y', function(d, i) { return y + (i * height); })
            .attr('width', width)
            .attr('height', height)
            .on('click', function(d) {
                nodesInGraph.insert(d);
            })
            .style(style.rect.mouseout);

        d3.selectAll('.menu-entry')
            .append('text')
            .text(function(d) { return d.title; })
            .attr('x', x)
            .attr('y', function(d, i) { return y + (i * height); })
            .attr('dy', height - margin / 2)
            .attr('dx', margin)
            .on('click', function(d) { d.clicked(); })
            .style(style.text);

        // Other interactions
        d3.select('body')
            .on('click', function() {
                d3.select('.context-menu').remove();
            });
    }

    menu.items = function(e) {
        if (!arguments[0].length) {
            items.push({title: "Emptiness..."});
            rescale = true;
            return menu;
        }
        for (i in arguments[0]) items.push(arguments[0][i]);
        rescale = true;
        return menu;
    }

    // Automatically set width, height, and margin;
    function scaleItems() {
        if (rescale) {
            d3.select('svg').selectAll('tmp')
                .data(items).enter()
                .append('text')
                    .text(function(d) { return d.title; })
                    .style(style.text)
                    .attr('x', -1000)
                    .attr('y', -1000)
                    .attr('class', 'tmp');

            var z = d3.selectAll('.tmp')[0].map(function(x) { return x.getBBox(); });

            width = d3.max(z.map(function(x) { return x.width; }));
            margin = margin * width;
            width =  width + 2 * margin;
            height = d3.max(z.map(function(x) { return x.height + margin / 2; }));

            // cleanup
            d3.selectAll('.tmp').remove();
            rescale = false;
        }
    }

    return menu;
}

function resetTargetsSelection() {
    Session.set('selectedTargets', {});
};

function linksToD3Array(linksCol, nodesCol) {
    var nodes = {};
    nodesCol.forEach(function(node) {
        nodes[node.id] = node;
    });
    var result = [];
    linksCol.forEach(function(link) {
        var tmp = {
            source: nodes[nodeIDMap.get(link.sourceId)],
            target: nodes[nodeIDMap.get(link.targetId)],
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
    var svg = d3.select("#posts-graph")
        .on('mousemove', function() {
            var translateVector = tree.zoom.translate();

            if (newLink.node) {
                d3.select(".newLinkLine").attr("x1", function (d) {
                    return translateVector[0] + newLink.node.x;
                })
                .attr("y1", function (d) {
                    return translateVector[1] + newLink.node.y;
                })
                .attr("x2", function (d) {
                    return d3.mouse(svg[0][0])[0];
                })
                .attr("y2", function (d) {
                    return d3.mouse(svg[0][0])[1];
                });
            }
        });

    svg.selectAll("*").remove();

    //Adding the zoom behavior. this also handles panning.
    //We're specifying it as an object variable so we can look it up later and see how much we've zoomed by.
    this.zoom = d3.behavior.zoom();

    this.zoom.scaleExtent([0.4, 4])
        .on("zoom", function() {
            svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        });

    svg.call(this.zoom).on("dblclick.zoom", null);

    var linksGroup = svg.append("g");
    //var nodesGroup = svg.append("g");
    var linkElements = linksGroup.selectAll("line");
    //var nodeElements = d3.selectAll(".post-container");

    // init force layout
    var force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .gravity(0.10)
        .charge(-2000)
        .friction(0.9)
        .linkDistance(150)
        .on("tick", tick);

    this.force = force;

    this.drag = d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", function(d) {
            if (mouseLinking) return;
            d3.event.sourceEvent.stopPropagation();
            d3.select(this).classed("dragging", true);
        })
        .on("drag", function(d) {
            if (mouseLinking) return;
            d3.event.sourceEvent.preventDefault();
            d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);

            d3.select("#g-" + d.id).attr("transform", function (d) {
                if (document.getElementById("rect-"+ d.id)) {
                    return "translate(" + (d.x - document.getElementById("rect-"+ d.id).getBBox().width/2) + ","
                            + (d.y - document.getElementById("rect-"+ d.id).getBBox().height/2) + ")";
                }
                else return "translate(" + d.x + ","+ d.y + ")";
            });

            if (!force.nodes()[0] || !force.nodes()[0].y) return;

            linkElements.attr("x1", function (d) {
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
        })
        .on("dragend", function(d) {
            if (mouseLinking) return;
            d3.event.sourceEvent.preventDefault();
            d3.select(this).classed("dragging", false);
        });

    this.createLink = d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", function(d) {
            d3.event.sourceEvent.stopPropagation();
            newLink.node = d;
            svg.append("line").classed("newLinkLine", true).attr('stroke', 'black');
        })
        .on("dragend", function(d) {
            console.log("???");
            console.log (newLink.node);
            console.log (d);
            if (newLink.node) {
                if (!newLink.node.replyNode && !d.replyNode && newLink.node != d) {
                    console.log("!!!");
                }
            }
            newLink.node = null;
            d3.select(".newLinkLine").remove();
        });

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
            $("#post-"+d._id).css("left", d.x).css("top", d.y);
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

        force.start();
        for (var i = 1000; i > 0; --i) force.tick();
        force.stop();
    };

    this.addNode = function(doc) {
        if (!this.nodes.find(function(n) {return (doc._id == n._id)})) {
            nodeIDMap.add(doc);
            nodesInGraph.insert(doc);
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
        var forumTree = this;
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
