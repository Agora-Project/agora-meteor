Template.forumPost.events({
    "click #new-thread": function (event) {
        var title = $('#thread-title').val();
        var body = $('#thread-body').val();
        var isAttack = $('#thread-is-attack').is(':checked');
        var links = [];

        for (var key in Session.get('selectedTargets')) {
            links.push(key);
        }

        if (links.length === 0) {
          event.preventDefault();
          return;
        }

        var postId = Post.insert({
            ownerId: Meteor.userId(),
            title: title,
            body: body,
            isAttack: isAttack,
            links: links
        });

        resetTargetsSelection();

        Router.go('/forum');
        event.preventDefault();
        handlers.addHandler(postId);
    }
});

Template.forumIndex.events({
  'click .button-delete': function() {
    for (var post in Session.get('selectedTargets')) {
      if (tree.removeNode(post))
        tree.render();
      if (handlers[post._id])
        handlers[post._id].stop();
      Post.removeWithLinks(post);
    }

  }
});

Template.forumIndex.rendered = function() {
  Session.setDefault('selectedTargets', {})

  var init = true;

  //the nodeIDMap exists so that we don't need to have a 1:1 correspondence
  //between nodes loaded into out local collection and nodes loaded into the
  //graph. We can have posts that aren't shown on the graph, and things in the graph that aren't posts.
  nodeIDMap = {map: {}, reverseMap: {}, count:0};
  nodeIDMap.add = function(_id) {
    if (!this.map[_id]) {
      this.map[_id] = this.count;
      this.reverseMap[this.count] = _id;
      this.count++;
    }
    return this.map[_id];
  }
  nodeIDMap.get = function(_id) {
    return this.map[_id];
  }
  nodeIDMap.getReverse = function(id) {
    return this.reverseMap[id];
  }

  if (!handlers) {
    handlers = {};
    handlers.addHandler = function(id) {
      if (!id) id = "rootNode";
      if (!this[id]) {
        if (id === "rootNode") var handler = Meteor.subscribe("forum");
        else var handler = Meteor.subscribe("forum", id);
        this[id] = handler;
      }
    }
    handlers.stop = function(node) {
      if (node.isRoot) {
        this['rootNode'].stop();
        delete this['rootNode'];
      }
      if (this[node._id]) {
        this[node._id].stop();
        delete this[node._id];
      }
    }
  }
  handlers.addHandler();

  var nodesCursor = Post.find({}),
      linksCursor = Link.find({});
  var nodes = [];

  nodesCursor.fetch().forEach(function(n) {
    n.id = nodeIDMap.add(n._id);
    if (nodesInGraph.contains(n)) nodes.push(n);
  });

  var links = linksToD3Array(linksCursor.fetch(), nodes);

  tree = new ForumTree(this, nodes, links);

  if (!nodesInGraph) {
    nodesInGraph = {ids: {}};
    nodesInGraph.contains = function(node) {
      return (node.isRoot || this.ids[node._id]);
    };
    nodesInGraph.add = function(_id) {
      var post = Post.findOne({_id: _id});
      if (post) tree.addNode(post);
      else this.ids[_id] = true;
    };
    nodesInGraph.remove = function(_id) {
      if (!this.ids[_id]) return false;
      delete this.ids[_id];
      return true;
    };
  }

  nodesCursor.observe({
    added: function(doc) {
      if (init) { return; }
      //console.log("Adding Node: " + doc._id);
      if (nodesInGraph.contains(doc))
        tree.addNode(doc);
      else console.log("Skipped adding node: " + doc.title);
    },
    removed: function(doc) {
      if (init) { return; }
      tree.removeNode(doc);
      //console.log("Tree Rendered");
    }
  });

  linksCursor.observe({
    added: function(doc) {
      if (init) { return; }
      //console.log("Adding Link: " + doc._id);
      if (nodesInGraph.contains(doc.sourceId))
        handlers.addHandler(doc.targetId);
      else if (nodesInGraph.contains(doc.targetId))
        handlers.addHandler(doc.sourceId);
      if(tree.addLink(doc))
        tree.render();
    },
    removed: function(doc) {
      if (init) { return; }
      if (tree.removeLink(doc))
        tree.render();
    }
  });

  tree.render();
  init = false;
};


function resetTargetsSelection() {
    Session.set('selectedTargets', {});
    d3.selectAll('.reply-button').style("fill", 'green');
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
            isAttack: link.isAttack,
            _id: link._id
        };
        if(tmp.source && tmp.target){
            result.push(tmp);
        } else {
            console.log('[!!]COrrupt link skipped: ' + link._id);
        }
    });
    return result;
};

function ForumTree(forumIndex, nodes, links) {

  this.forumIndex = forumIndex;

  this.nodes = nodes;
  this.links = links;

  var postWidth = 120,
      postHeight = 80;

  var key = function (d) {
    return d._id;
  };

  var svg = d3.select("#posts-graph").append("svg");

  svg.selectAll("*").remove();

  var container = svg.append('g');

  var zoom = d3.behavior.zoom()
    .scaleExtent([0.4, 4])
    .on("zoom", function() {
      container.attr("transform",
        "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    });
  svg.call(zoom);

  // init force layout
  var force = d3.layout.force()
      .nodes(nodes)
      .links(links)
      .gravity(0.10)
      .charge(-5000)
      .friction(0.9)
      .linkDistance(150)
      .on("tick", tick);

      var drag = d3.behavior.drag()
          .origin(function(d) { return d; })
          .on("dragstart", function(d) {
            force.resume();
            d3.event.sourceEvent.stopPropagation();
            d3.select(this).classed("dragging", true);
          })
          .on("drag", function(d) {
            d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
          })
          .on("dragend", function(d) {
            d3.select(this).classed("dragging", false);
          });

  // setup z-index to prevent overlapping lines over nodes
  var linksGroup = container.append("g"),
    nodesGroup = container.append("g");

  var linkElements = linksGroup.selectAll("line");
  var nodeElements = nodesGroup.selectAll("g");

  resize();
  d3.select(window).on("resize", resize);

  // tick
  function tick() {
    //This isf statement keeps the app from choking when reloading the page.
    if(!force.nodes()[0] || !force.nodes()[0].y) { return; }
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

      var links = force.links();
      var nodes = force.nodes();

      for (i = 0; i < links.length; i++) {
        if (nodes[links[i].target.index] && nodes[links[i].source.index]) {
          var targy = nodes[links[i].target.index].y;
          var sorcy = nodes[links[i].source.index].y;
          if (sorcy - targy < 40) {
              nodes[links[i].target.index].y -= 1;
              nodes[links[i].source.index].y += 1;
          }
        }
      }

      nodeElements.attr("transform", function (d) {
        if (document.getElementById("rect-"+ d.id))
          return "translate(" + (d.x - document.getElementById("rect-"+ d.id).getBBox().width/2) + ","
                 + (d.y - document.getElementById("rect-"+ d.id).getBBox().height/2) + ")";
        else return "translate(" + d.x + ","+ d.y + ")";
      });
  }

  // resize svg and force layout when screen size change
  function resize() {
    var width = window.innerWidth,
      height = window.innerHeight;
    svg.attr("width", width).attr("height", height);
    force.size([width, height]).resume();
  }

  // dynamically update the graph
  this.render = function() {
    // add links

    contextMenuShowing = false;

    //console.log("Rendering");

    linkElements = linkElements.data(force.links(), function(d, i) { return d._id; });

    //console.log("Fetched Link list");

    linkElements.exit().remove();
    //console.log("Removed dead links");

    nodeElements = nodeElements.data(force.nodes(), function(d, i) { return d.id;});

    nodeElements.exit().remove();
    //console.log("Removed dead nodes");

    var nodeSelection = nodeElements.enter().append("g").call(drag); /*.attr("class", function (d) {
        if(d.isRoot) { return "root-post"; } else { return ""; }
    });

    var rootSelection = svg.selectAll("g.root-post");

    rootSelection.append("image")
          .attr("xlink:href", "/packages/agoraforum_core/public/agoraforum.png")
          .attr("x", 63)
          .attr("y", 18)
          .attr("width", 24)
          .attr("height", 24);
          */
    //console.log("Added graphics containers to nodes and called drag function.");

    var edgeSelection = linkElements.enter().append("line")
      .attr('stroke', function (d) {
        if (d.isAttack) {
          return 'red';
        } else {
          return 'black';
        }
      });
    //console.log("added line objects.");

    nodeSelection.append('rect')
        .attr("id", function (d) {
            return "rect-" + d.id;
        })
        .attr("width", postWidth)
        .attr("height", postHeight)
        .attr('stroke', '#dbdbdb')
        .attr("stroke-width", 1)
        .attr('fill', '#fafafa');

    //console.log("Added rect objects.");

    var titles = nodeSelection.append("text")
        .attr("id", function (d) {
          return "title-" + d.id;
        }).text(function (d) {
            return d.title;
        })
        .attr("font-family", "sans-serif")
        .attr("font-size", "11px");

    //console.log("Added titles.");

    var bodys = nodeSelection.append("text")
        .text(function (d) {
            return d.body;
        })
        .attr("font-size", "11px")
        .attr("font-family", "sans-serif")
        .attr("fill", "#33333f")
        .call(function (wrapSelection) {
            wrapSelection.each (function(d){
                if (!d.body) { return; }
                console.log("Wrapping "+ d._id);
                d3plus.textwrap()
                    .container(d3.select(this))
                    .width(postWidth)
                    .height(postHeight)
                    .draw();
                //console.log(this.getBBox().width);
                //console.log(parseFloat(window.getComputedStyle(this, null).getPropertyValue('font-size')));
                d3.select("#rect-"+ d.id).attr('width', Math.min(Math.max(this.getBBox().width + 10, 60, document.getElementById("title-"+ d.id).getBBox().width), 180));
                d3.select("#rect-"+ d.id).attr('height', Math.max(this.getBBox().height + 10, 20));
            });

        })
        .attr("id", function (d) {
            return "text-" + d.id;
        });

    //console.log("Added bodies.");

    var removeButtons = nodeSelection.append("circle").attr("cx", function (d) {
            return document.getElementById("rect-"+ d.id).getBBox().width;
        })
        .attr("r", 10)
        .attr("class", 'control')
        .style("fill", "red")
        .on("click", function (d) {
            //handlers.stop(d);
            tree.removeNode(d)
            resetTargetsSelection();
        });

    //console.log("Added remove buttons.");

    var replyButtons = nodeSelection.append("rect")
        .attr("y", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().height -10;
        })
        .attr("width", 30)
        .attr("height", 10)
        .attr("class", 'control reply-button')
        .attr("id", function(d) { return "replyButton-" + d.id;})
        .style("fill", function(d) {
            if (Session.get('selectedTargets')[d._id]) {
                return "white";
            }
            return "green";
        })
        .on("click", function (d) {
            var st = Session.get('selectedTargets');
            if (st[d._id]) {
                delete st[d._id];
                Session.set('selectedTargets', st);
                d3.select("#replyButton-" + d.id).style("fill", "green");
            } else {
                st[d._id] = true;
                Session.set('selectedTargets', st);
                d3.select("#replyButton-" + d.id).style("fill", "white");
            }
            //console.log(st);
        });

    //console.log("Added reply buttons.");

    var expandButtons = nodeSelection.append("rect")
        .attr("y", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().height -10;
        })
        .attr("x", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().width -30;
        })
        .attr("width", 30)
        .attr("height", 10)
        .attr("class", 'control expand-button')
        .attr("id", function(d) { return "expandButton-" + d.id;})
        .style("fill", "rebeccapurple")
        .on("click", function (d) {



            Link.find({sourceId: d._id}).fetch().forEach(function(link) {
              nodesInGraph.add(link.targetId);
              handlers.addHandler(link.targetId);

            });
            Link.find({targetId: d._id}).fetch().forEach(function(link) {
              nodesInGraph.add(link.sourceId);
              handlers.addHandler(link.sourceId);
            });
        });

    force.start();
  };

  this.addNode = function(doc) {
    if (!this.nodes.find(function(n) {return (doc._id == n._id)})) {
      doc.id = nodeIDMap.add(doc._id);
      this.nodes.push(doc);
      //console.log("Node Added, checking links...");
      Link.find({ $or: [ { sourceId: doc._id}, { targetId: doc._id} ] }).fetch().forEach(function(link) {
        //console.log("Adding Link: " + link._id);
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
    //console.log("Trying to remove node:" + doc._id);
    var iToRemove = -1;
    var forumTree = this;
    if (this.nodes.length !== 0)
      this.nodes.forEach(function(node, i) {
        if (node._id === doc._id) {
          //console.log("Found Node to remove!");
          iToRemove = i;
        }
      });
    if (iToRemove != -1) {
      for (i = 0; i < this.links.length;) {
        link = this.links[i];
        if (link.source._id === doc._id || link.target._id == doc._id)
          this.links.splice(i, 1);
        else i++;
      }
      this.nodes.splice(iToRemove, 1);
      nodesInGraph.remove(doc._id);
      //console.log("Successfully removed node");
      tree.render();
      return true;
    } //else console.log("Failed to remove node");
    return false;
  };

  this.removeLink = function(doc) {
    //console.log("Trying to remove link:" + doc._id);
    var iToRemove = -1;
    this.links.forEach(function(link, i) {
      if (link._id === doc._id) {
        iToRemove = i;
      }
    });
    if (iToRemove != -1) {
      this.links.splice(iToRemove, 1);
      //console.log("Successfully removed link");
      return true;
    } //else console.log("Failed to remove link");
    return false;
  };
}
