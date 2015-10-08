Template.forumPost.events({
    "click #new-thread": function (event) {
        var title = $('#thread-title').val();
        var body = $('#thread-body').val();
        var isAttack = $('#thread-is-attack').is(':checked');
        var links = [];

        for (var key in Session.get('selectedTargets')) {
            links.push(key);
        }

        Argument.insert({
            ownerId: Meteor.userId(),
            title: title,
            body: body,
            isAttack: isAttack,
            links: links
        });

        resetTargetsSelection();

        Router.go('/forum');
        event.preventDefault();
    }
});

Template.forumIndex.rendered = function() {
  Session.setDefault('selectedTargets', {})

  var init = true;

  var nodesCursor = Argument.find({}),
      linksCursor = Link.find({});
  var nodes = nodesCursor.fetch(),
      links = linksToD3Array(linksCursor.fetch(), nodes);

  tree = new ForumTree(nodes, links);

  nodesCursor.observe({
    added: function(doc) {
      if (init) { return; }
      tree.addNode(doc);
      tree.render();
    },
    removed: function(doc) {
      if (init) { return; }
      tree.removeNode(doc);
      tree.render();
    }
  });

  linksCursor.observe({
    added: function(doc) {
      if (init) { return; }
      tree.addLink(doc);
      tree.render();
    },
    removed: function(doc) {
      if (init) { return; }
      tree.removeLink(doc);
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
        nodes[node._id] = node;
      });
    var result = [];
    linksCol.forEach(function(link) {
        var tmp = {
            source: nodes[link.sourceId],
            target: nodes[link.targetId],
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

function ForumTree(nodes, links) {

  this.nodes = nodes;
  this.links = links;

  var argumentWidth = 150,
      argumentHeight = 60;

  var key = function (d) {
    return d._id;
  };

  var svg = d3.select("#arguments-graph").append("svg");

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
      .gravity(0.082)
      .charge(-500)
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
    if(!force.nodes()[0].y) { return; }
      linkElements.attr("x1", function (d) {
          return d.source.x + argumentWidth / 2
      })
          .attr("y1", function (d) {
              return d.source.y + argumentHeight / 2;
          })
          .attr("x2", function (d) {
              return d.target.x + argumentWidth / 2;
          })
          .attr("y2", function (d) {
              return d.target.y + argumentHeight / 2;
          });

      var links = force.links();
      var nodes = force.nodes();
      for (i = 0; i < links.length; i++) {
          var targy = nodes[links[i].target.index].y;
          var sorcy = nodes[links[i].source.index].y;
          if (sorcy - targy < 80) {
              nodes[links[i].target.index].y -= 1;
              nodes[links[i].source.index].y += 1;
          }
      }
      nodeElements.attr("transform", function (d) {
          return "translate(" + d.x + "," + d.y + ")";
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
    linkElements =  linkElements.data(force.links());

    linkElements.exit().remove();

    var edgeSelection = linkElements.enter().append("line")
      .attr('stroke', function (d) {
        if (d.isAttack) {
          return 'red';
        } else {
          return 'black';
        }
      });

    nodeElements = nodeElements.data(force.nodes());

    nodeElements.exit().remove();

    var nodeSelection = nodeElements.enter().append("g").call(drag).attr("class", function (d) {
        if(d.isRoot) { return "root-argument"; } else { return ""; }
    });

    var rootSelection = svg.selectAll("g.root-argument");

    rootSelection.append("image")
          .attr("xlink:href", "/packages/agoraforum_core/public/agoraforum.png")
          .attr("x", 63)
          .attr("y", 18)
          .attr("width", 24)
          .attr("height", 24);

    nodeSelection.append('rect')
        .attr("id", function (d) {
            return "rect-" + d._id;
        })
        .attr("width", argumentWidth)
        .attr("height", argumentHeight)
        .attr('stroke', '#dbdbdb')
        .attr("stroke-width", 1)
        .attr('fill', '#fafafa');

    var titles = nodeSelection.append("text")
        .text(function (d) {
            return d.title;
        })
        .attr("font-family", "sans-serif")
        .attr("font-size", "11px");

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
                console.log("Wrapping "+ d);
                d3plus.textwrap()
                    .container(d3.select(this))
                    .width(argumentWidth)
                    .height(argumentHeight)
                    .draw();
            });
        })
        .attr("id", function (d) {
            return "text-" + d._id;
        });

    var removeButtons = nodeSelection.append("circle").attr("cx", function (d) {
            return argumentWidth;
        })
        .attr("r", 10)
        .attr("class", 'control')
        .style("fill", "red")
        .on("click", function (d) {
            Argument.removeWithLinks(d._id);
            resetTargetsSelection();
        });

    var replyButtons = nodeSelection.append("rect")
        .attr("y", function(d) {
            return argumentHeight -10;
        })
        .attr("width", 30)
        .attr("height", 10)
        .attr("class", 'control reply-button')
        .attr("id", function(d) { return "replyButton-" + d._id;})
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
                d3.select("#replyButton-" + d._id).style("fill", "green");
            } else {
                st[d._id] = true;
                Session.set('selectedTargets', st);
                d3.select("#replyButton-" + d._id).style("fill", "white");
            }
            console.log(st);
        });

        var expandButtons = nodeSelection.append("rect")
            .attr("y", function(d) {
                return argumentHeight -10;
            })
            .attr("x", function(d) {
                return argumentWidth -30;
            })
            .attr("width", 30)
            .attr("height", 10)
            .attr("class", 'control expand-button')
            .attr("id", function(d) { return "expandButton-" + d._id;})
            .style("fill", "rebeccapurple")
            .on("click", function (d) {
              if (d.children) {
                  d._children = d.children;
                  d.children = null;
                } else {
                  d.children = d._children;
                  d._children = null;
                }
                tree.render();
            });


    force.start();
  };

  this.addNode = function(doc) {
    this.nodes.push(doc);
  };

  this.addLink = function(doc) {
    this.links.push(linksToD3Array([doc], this.nodes)[0]);
  };

  this.removeNode = function(doc) {
    var iToRemove;
    this.nodes.forEach(function(node, i) {
      if (node._id === doc._id) {
        iToRemove = i;
      }
    });
    this.nodes.splice(iToRemove, 1);
  };

  this.removeLink = function(doc) {
    var iToRemove;
    this.links.forEach(function(link, i) {
      if (link._id === doc._id) {
        iToRemove = i;
      }
    });
    this.links.splice(iToRemove, 1);
  };
}
