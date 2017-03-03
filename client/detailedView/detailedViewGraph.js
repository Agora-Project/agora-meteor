/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

// The local collections for keeping track of what posts and kinks are shown.
// though the links collection is only used to assign links _ids right now.
let linksInGraph = new Mongo.Collection(null);

//The function for interpreting links into the right format to add to the graph.
//not used outside this file.
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

// The object that stores the information on the graph.
// It takes up the entire rest of the file.
// Note, this object is referenced outside this file - mainly by being
// instantiated when the detailedView template renders as a global object and
// having it's methods called in a dozen places.
ForumTree = function() {
    let nodes = [];
    let links = [];

    // Both of these two functions are called outside this file, whenever the
    // graph needs to have it's nodes repositioned or rerendered.
    this.runGraph = function() {

            let posts = {};

            nodes.forEach(function(post) {
                let div;
                if (post.nodeType == "post") {
                    div = $("#post-" + post._id);
                } else if (post.nodeType == "reply" || post.nodeType == "edit") {
                    div = $("#reply-" + post._id);
                }
                posts[post._id] = {
                    data: post,
                    div: div
                };
            });

            let postArray = [];
            let linkArray = [];

            $.each(posts, function(id, post) {
                if (post.data.links)
                for (let link of post.data.links) {
                    if (link.target in posts) {
                        linkArray.push({
                            source: post,
                            target: posts[link.target]
                        });
                    }
                }
                postArray.push(post);
            });

            //let layout = new GraphLayoutForce(postArray, linkArray);
            this.layout = new GraphLayoutLayered(postArray, linkArray,
                {spacingHorizontal: 330, spacingVertical: 240});



            this.nodes = this.layout.nodes;
    }

    this.runGraph();

    // Updates the position of the various nodes and lines on the graph
    this.render = function() {

        for (let post of this.layout.nodes) {
            if (post.name !== undefined) {
                let div = post.name.div;
                div.css("left", post.x - div.outerWidth()/2.0);
                div.css("top", post.y - div.outerHeight()/2.0);
            }
        }

        $('.detailed-view-link').remove(); //TODO: don't redo all links upon change to graph
        let svg = $('.detailed-view-links-graph');


        for (let link of this.layout.links) {
            $(document.createElementNS('http://www.w3.org/2000/svg','line'))
                .attr('class', 'detailed-view-link')
                .attr('stroke', 'black')
                .attr('x1', link.source.x)
                .attr('y1', link.source.y)
                .attr('x2', link.target.x)
                .attr('y2', link.target.y)
                .appendTo(svg);
        }
    };

    this.findNode = function(node) {
        if (node._id)
            return this.layout.nodes.find(function(n) {return (node._id == n.name.data._id)});
        else return this.layout.nodes.find(function(n) {return (node == n.name.data._id)});
    };

    this.findLink = function(linkDocument) {
        if (linkDocument._id)
            return links.find(function(l) {return (linkDocument._id == l._id)});

        if (!linkDocument.source || !linkDocument.target) var link = linksToD3Array([linkDocument], nodes)[0];
        else var link = linkDocument;

        return links.find(function(l) {return (link.source == l.source && link.target == l.target)});
    };

    this.containsLink = function(link) {
        if (this.findLink(link))
            return true;
        else return false;
    };

    this.addNode = function(node) {
        nodes.push(node);

        let self = this;

        return node;
    };

    this.addLink = function(linkDocument) {
        if (!linkDocument._id) {
            var _id = linksInGraph.insert(linkDocument);
            linkDocument = linksInGraph.findOne({_id: _id});
        }

        let link = linksToD3Array([linkDocument], nodes)[0];
        if (link) {
            links.push(link);
            this.runGraph();
            this.render();
            return true;
        }
        return false;
    };

    this.removeNode = function(nodeDocument) {
        let nodeID;
        if (nodeDocument._id) nodeID = nodeDocument._id;
        else nodeID = nodeDocument;
        var iToRemove = -1;
        if (nodes.length !== 0) {
            nodes.forEach(function(node, i) {
                if (node._id === nodeID) {
                    iToRemove = i;
                }
            });
        }
        if (iToRemove != -1) {
            for (i = 0; i < links.length;) {
                link = links[i];
                if (link.source._id === nodeID || link.target._id == nodeID)
                    links.splice(i, 1);
                else i++;
            }
            nodes.splice(iToRemove, 1);
            this.runGraph();
            this.render();
            return true;
        }
        return false;
    };

    this.removeLink = function(linkDocument) {
        var iToRemove = -1;
        links.forEach(function(link, i) {
            if (link._id === linkDocument._id) {
                iToRemove = i;
            } else if (link.source._id == linkDocument.sourceId
                && link.target._id == linkDocument.targetId) {
                iToRemove = i;
            }
        });
        if (iToRemove != -1) {
            links.splice(iToRemove, 1);
            this.runGraph();
            this.render();
            return true;
        }
        return false;
    };

    this.forEachNode = function(action) {
        for (let node of this.layout.nodes) {
            action(node);
        }
    };

    return this;
}
