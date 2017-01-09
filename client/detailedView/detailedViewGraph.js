/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

//The local collections for keeping track of what posts and kinks are shown.
//though the links collection is only used to assign links _ids right now.
nodesInGraph = new Mongo.Collection(null);
linksInGraph = new Mongo.Collection(null);

//The function for interpreting links into the right format to add to the graph.
function linksToD3Array(linksCol, nodesCol) {
    var nodes = {};
    nodesCol.forEach(function(n) {
        nodes[n._id] = n;
    });
    var result = [];
    linksCol.forEach(function(link) {
        if (link.source && link.target) {
            result.push(link);
        } else {

            var tmp = {
                source: nodes[link.sourceId],
                target: nodes[link.targetId],
                type: link.type,
                _id: link._id
            };

            if (tmp.source && tmp.target) {
                result.push(tmp);
            }
        }
    });
    return result;
};

//the object that stores the information on the graph.
//It takes up the entire rest of the file.
ForumTree = function(forumIndex, nodesCursor) {
    this.forumIndex = forumIndex;

    var postWidth = 140, postHeight = 100;

    //put nodes and links into D3-friendly arrays
    this.nodes = [];
    this.links = [];

    // !! Function parameters should be descriptive. Why is everything named 'doc'?
    this.findNode = function(doc) {
        if (doc._id)
            return this.nodes.find(function(n) {return (doc._id == n._id)});
        else return this.nodes.find(function(n) {return (doc == n._id)});
    };

    this.findLink = function(doc) {
        if (doc._id)
            return this.links.find(function(l) {return (doc._id == l._id)});

        if (!doc.source || !doc.target) var link = linksToD3Array([doc], this.nodes)[0];
        else var link = doc;
        return this.links.find(function(l) {return (link.source == l.source && link.target == l.target)});
    };

    this.containsNode = function(doc) {
        if (this.findNode(doc)) return true;
        else return false;
    };

    this.containsLink = function(doc) {
        if (this.findLink(doc))
            return false;
        
        // !! Never returns true?
    };

    this.addNode = function(doc) {
        if (!this.nodes.find(function(n) {return (doc._id == n._id)})) {
            let _id = doc._id;
            if (!nodesInGraph.findOne({_id: doc._id}))
                _id = nodesInGraph.insert(doc);

            doc = nodesInGraph.findOne({_id: _id});
            this.nodes.push(doc);

            if (doc.links) {
                for (var i in doc.links) {
                    tree.addLink({sourceId: doc._id, targetId: doc.links[i].target});
                }
            }

            if (doc.replyIDs) {
                for (var i in doc.replyIDs) {
                    tree.addLink({sourceId: doc.replyIDs[i], targetId: doc._id});
                }
            }

            return this.nodes[this.nodes.length - 1];
        }
        return false;
    };

    this.addLink = function(doc) {
        if (!doc._id) {
            var _id = linksInGraph.insert(doc);
            doc = linksInGraph.findOne({_id: _id});
        }

        let link = linksToD3Array([doc], this.nodes)[0];
        if (link && !this.containsLink(doc)) {
            this.links.push(link);
            this.runGraph();
            this.render();
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
            this.runGraph();
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
            this.runGraph();
            this.render();
            return true;
        }
        return false;
    };

    // !! Unused code.
    this.placeNode = function(node, parents, children) {

    }

    this.links = []; // !! Redundant? Maybe? See line 48.

    //find our SVG element for the forumIndex template and assign our SVG variable to it as a reference.
    //Then, beloy that add code so that when we're adding new links to the graph,
    //it will draw them to the mouse cursor as it's moved around.
    var svg = d3.select(".detailed-view-link-graph");

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
        .linkStrength(0.3)
        .linkDistance(function(link) {
            let linkDistance = 0;
            linkDistance += $("#post-" + link.source._id).outerHeight() / 2;
            linkDistance += $("#post-" + link.target._id).outerHeight() / 2;
            linkDistance *= 3;
            return linkDistance;
        })
        .on("tick", tick);

    this.force = force; // !! Why are we exposing this? Where is it used?

    // tick
    // !! Named function despite being used only once. Also, useless commend.
    function tick(e) {
        //This if statement keeps the app from choking when reloading the page.
        // !! (how?)
        if (!force.nodes()[0] || !force.nodes()[0].y) { return; }

        var links = force.links(); //Only used once
        var nodes = force.nodes(); //Never used

        var k = 6 * e.alpha;
        links.forEach(function(d, i) {
            if (d.source.y < d.target.y + 160) {
                d.target.y -= 1;
            }
        });
    }

    this.runGraph = function() {
        force.start();
        for (var i = 0; i < 100; i++) force.tick();
        force.stop();
    }

    // dynamically update the graph
    this.render = function() {

        // add links
        contextMenuShowing = false; // !! Global variable! Also, where is this used?

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
                let xAdjust = (post.outerWidth() / 2); // !! Unused.
                let yAdjust = (post.outerHeight() / 2); // !! Unused.
                post.css("left", d.x - (post.outerWidth() / 2))
                    .css("top", d.y - (post.outerHeight() / 2));
            } else if (d.type == "reply" || d.type == "edit") {
                $("#reply-" + d._id).css("left", d.x - 160).css("top", d.y - 112);
            }
        });
    };

    var tree = this;
    nodesCursor.forEach(function(n) {
        n.type = "post";
        if (n.links.length < 1 || nodesInGraph.findOne({_id: n._id}))
            tree.addNode(n);
    });

    return this;
}
