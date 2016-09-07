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
        setTimeout(function() {nodesInGraph.add(postId)}, 1000);
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

  var nodesCursor = Post.find({}),
      linksCursor = Link.find({});
  var nodes = [];

  nodesCursor.fetch().forEach(function(n) {
    n.id = nodeIDMap.add(n._id);
    if (nodesInGraph.contains(n)) nodes.push(n);
  });

  var links = linksToD3Array(linksCursor.fetch(), nodes);

  tree = new ForumTree(this, nodes, links);

  nodesCursor.observe({
    added: function(doc) {
      if (init) { return; }
      if (nodesInGraph.contains(doc)) {
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
      if (init) { return; }
      tree.removeNode(doc);
    }
  });

  linksCursor.observe({
    added: function(doc) {
      if (init) { return; }
      if (nodesInGraph.containsID(doc.sourceId)) {
        handlers.addHandler(doc.targetId);
      } else if (nodesInGraph.containsID(doc.targetId)) {
        handlers.addHandler(doc.sourceId);
      }
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
        d3.select('svg')
            .append('g').attr('class', 'context-menu')
            .selectAll('tmp')
            .data(items).enter()
            .append('g').attr('class', 'menu-entry')
            .style({'cursor': 'pointer'})
            .on('mouseover', function(){
                d3.select(this).select('rect').style(style.rect.mouseover) })
            .on('mouseout', function(){
                d3.select(this).select('rect').style(style.rect.mouseout) });

        d3.selectAll('.menu-entry')
            .append('rect')
            .attr('x', x)
            .attr('y', function(d, i){ return y + (i * height); })
            .attr('width', width)
            .attr('height', height)
            .on('click', function(d) {
              nodesInGraph.add(d._id);
            })
            .style(style.rect.mouseout);

        d3.selectAll('.menu-entry')
            .append('text')
            .text(function(d){ return d.title; })
            .attr('x', x)
            .attr('y', function(d, i){ return y + (i * height); })
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
                .text(function(d){ return d.title; })
                .style(style.text)
                .attr('x', -1000)
                .attr('y', -1000)
                .attr('class', 'tmp');
            var z = d3.selectAll('.tmp')[0]
                      .map(function(x){ return x.getBBox(); });
            width = d3.max(z.map(function(x){ return x.width; }));
            margin = margin * width;
            width =  width + 2 * margin;
            height = d3.max(z.map(function(x){ return x.height + margin / 2; }));

            // cleanup
            d3.selectAll('.tmp').remove();
            rescale = false;
        }
    }

    return menu;
}

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
            type: link.type,
            _id: link._id
        };
        if(tmp.source && tmp.target){
            result.push(tmp);
        }
    });
    return result;
};

function ForumTree(forumIndex, nodes, links) {

  this.forumIndex = forumIndex;

  this.nodes = nodes;
  this.links = links;

  var postWidth = 140,
      postHeight = 200;

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

  svg.call(zoom).on("dblclick.zoom", null);

  // init force layout
  var force = d3.layout.force()
      .nodes(nodes)
      .links(links)
      .gravity(0.10)
      .charge(-2000)
      .friction(0.7)
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

  d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

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

    d3.select(".tooltip").transition()
       .duration(500)
       .style("opacity", 0);
    // add links

    contextMenuShowing = false;

    linkElements = linkElements.data(force.links(), function(d, i) { return d._id; });


    linkElements.exit().remove();

    nodeElements = nodeElements.data(force.nodes(), function(d, i) { return d.id;});

    nodeElements.exit().remove();

    var nodeSelection = nodeElements.enter().append("g").call(drag).attr("class", "post node"); /*.attr("class", function (d) {
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

    var postSelection = nodeSelection.filter(".post");

    var menuFunction = function(d) {
      d.fixed = true;
      setTimeout(function() {
        d.fixed = false;
      }, 4000);
      var menuNodes = [];
      Link.find({sourceId: d._id}).fetch().forEach(function(link) {
        if (!nodesInGraph.containsID(link.targetId)) {
          var post = Post.findOne({_id: link.targetId});
          if (post) {
            var menuOption = {post: post, title: post.title};
            menuOption.clicked = function() {
              nodesInGraph.add(this.post._id);
            }
            menuNodes.push(menuOption);
          }
        }
      });
      Link.find({targetId: d._id}).fetch().forEach(function(link) {
        if (!nodesInGraph.containsID(link.sourceId)) {
          var post = Post.findOne({_id: link.sourceId});
          if (post) {
            var menuOption = {post: post, title: post.title};
            menuOption.clicked = function() {
              nodesInGraph.add(this.post._id);
            }
            menuNodes.push(menuOption);
          }
        }
      });

      d3.event.preventDefault();
      var menu = contextMenu().items(menuNodes);
      menu(d3.mouse(d3.select("svg")[0][0])[0], d3.mouse(d3.select("svg")[0][0])[1]);
    };

    var expandFunction = function(d) {
      d3.event.preventDefault();
      if (!d.body) { return; }
      if (!d.expanded) {
        d3.select('#text-' + d.id).text(d.body);
        d3plus.textwrap()
            .container(d3.select(this))
            .width(postWidth)
            .height(postHeight)
            .draw();
        d3.select("#rect-"+ d.id).attr('width', Math.min(Math.max(this.getBBox().width + 10, 60, document.getElementById("title-"+ d.id).getBBox().width), 140));
        d3.select("#rect-"+ d.id).attr('height', Math.max(this.getBBox().height + 10, 20));
        d3.select("#selectButton-" + d.id).attr("y", function(d) {
          return document.getElementById("rect-"+ d.id).getBBox().height -10;
        });
        d3.select("#loadButton-" + d.id).attr("y", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().height -10;
        })
        .attr("x", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().width -30;
        });
        d.expanded = true;
      } else {
        d3.select('#text-' + d.id).text(function() {
          var bodyText = d.body;
          if (bodyText.length > 100) bodyText = bodyText.substr(0, 100);
          return bodyText;
        });
        d3plus.textwrap()
            .container(d3.select(this))
            .width(postWidth)
            .height(postHeight)
            .draw();
        d3.select("#rect-"+ d.id).attr('width', Math.min(Math.max(this.getBBox().width + 10, 60, document.getElementById("title-"+ d.id).getBBox().width), 140));
        d3.select("#rect-"+ d.id).attr('height', Math.max(this.getBBox().height + 10, 20));
        d3.select("#selectButton-" + d.id).attr("y", function(d) {
          return document.getElementById("rect-"+ d.id).getBBox().height -10;
        });
        d3.select("#loadButton-" + d.id).attr("y", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().height -10;
        })
        .attr("x", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().width -30;
        });
        d.expanded = false;
      }
    };

    var edgeSelection = linkElements.enter().append("line")
      .attr('stroke', function (d) {
        if (d.type == "Attack") {
          return 'red';
        } else {
          return 'black';
        }
      });

    postSelection.append('rect')
        .attr("id", function (d) {
            return "rect-" + d.id;
        })
        .attr("width", function(d) {
          return Math.sqrt(d.body.length);
        })
        .attr("height", function(d) {
          return Math.sqrt(d.body.length);
        })
        .attr('stroke', '#dbdbdb')
        .attr("stroke-width", 1)
        .attr('fill', '#fafafa')
        .on('contextmenu', menuFunction)
        .on('mouseover', function (d) {
          d.fixed = true;
        })
        .on('mouseout', function (d) {
          if (!d.locked) d.fixed = false;
        });

    var titles = postSelection.append("text")
        .attr("id", function (d) {
          return "title-" + d.id;
        }).text(function (d) {
          var titleText = d.title;
          if (titleText.length > 15) titleText = titleText.substr(0, 15);
          return titleText;
        })
        .attr("font-family", "sans-serif")
        .attr("font-size", "11px")
        .on('contextmenu', menuFunction)
        .on('mouseover', function (d) {
          d.fixed = true;
          d3.select('#title-' + d.id).text(d.title);
        })
        .on('mouseout', function (d) {
          if (!d.locked) d.fixed = false;
          d3.select('#title-' + d.id).text(function (d) {
            var titleText = d.title;
            if (titleText.length > 15) titleText = titleText.substr(0, 15);
            return titleText;
          });
        });


    var bodys = postSelection.append("text")
        .text(function (d) {
          var bodyText = d.body;
          if (bodyText.length > 100) bodyText = bodyText.substr(0, 100);
          return bodyText;
        })
        .attr("font-size", "11px")
        .attr("font-family", "sans-serif")
        .attr("fill", "#33333f")
        .call(function (wrapSelection) {
            wrapSelection.each (function(d){
                if (!d.body) { return; }
                d3plus.textwrap()
                    .container(d3.select(this))
                    .width(postWidth)
                    .height(postHeight)
                    .draw();
                d3.select("#rect-"+ d.id).attr('width', Math.min(Math.max(this.getBBox().width + 10, 60, document.getElementById("title-"+ d.id).getBBox().width), 140));
                d3.select("#rect-"+ d.id).attr('height', Math.max(this.getBBox().height + 10, 20));
            });

        })
        .attr("id", function (d) {
            return "text-" + d.id;
        })
        .on('contextmenu', menuFunction)
        .on('mouseover', function (d) {
          d.fixed = true;
        })
        .on('mouseout', function (d) {
          if (!d.locked) d.fixed = false;
        })
        .on('dblclick', expandFunction);

    var removeButtons = postSelection.append("circle").attr("cx", function (d) {
            return document.getElementById("rect-"+ d.id).getBBox().width;
        })
        .attr("r", 10)
        .attr("class", 'control')
        .style("fill", "red")
        .on("click", function (d) {
            tree.removeNode(d)
            resetTargetsSelection();
        })
        .on('contextmenu', menuFunction)
        .on('mouseover', function (d) {
          d.fixed = true;
          d3.select(".tooltip").transition()
             .duration(200)
             .style("opacity", .9);
          d3.select(".tooltip").html("remove post")
             .style("left", (d3.event.pageX) + "px")
             .style("top", (d3.event.pageY - 28) + "px");
        })
        .on('mouseout', function (d) {
          if (!d.locked) d.fixed = false;
          d3.select(".tooltip").transition()
             .duration(500)
             .style("opacity", 0);
        });

    var selectButtons = postSelection.append("rect")
        .attr("y", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().height -10;
        })
        .attr("width", 30)
        .attr("height", 10)
        .attr("class", 'control select-button')
        .attr("id", function(d) { return "selectButton-" + d.id;})
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
                d3.select("#selectButton-" + d.id).style("fill", "green");
            } else {
                st[d._id] = true;
                Session.set('selectedTargets', st);
                d3.select("#selectButton-" + d.id).style("fill", "white");
            }
        })
        .on('contextmenu', menuFunction)
        .on('mouseover', function (d) {
          d.fixed = true;
          d3.select(".tooltip").transition()
             .duration(200)
             .style("opacity", .9);
          var st = Session.get('selectedTargets');
          if (st[d._id])
            d3.select(".tooltip").html("unselect post")
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
          else
            d3.select(".tooltip").html("select post")
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
        })
        .on('mouseout', function (d) {
          if (!d.locked) d.fixed = false;
          d3.select(".tooltip").transition()
             .duration(500)
             .style("opacity", 0);
        });

    var loadButtons = postSelection.append("rect")
        .attr("y", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().height -10;
        })
        .attr("x", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().width -30;
        })
        .attr("width", 30)
        .attr("height", 10)
        .attr("class", 'control load-button')
        .attr("id", function(d) { return "loadButton-" + d.id;})
        .style("fill", "rebeccapurple")
        .on("click", function (d) {
          d.fixed = true;
          d.locked = true;
          setTimeout(function() {
            d.fixed = false;
            d.locked = false;
          }, 1000);
          Link.find({sourceId: d._id}).fetch().forEach(function(link) {
            nodesInGraph.add(link.targetId);
            handlers.addHandler(link.targetId);

          });
          Link.find({targetId: d._id}).fetch().forEach(function(link) {
            nodesInGraph.add(link.sourceId);
            handlers.addHandler(link.sourceId);
          });
        })
        .on('contextmenu', menuFunction)
        .on('mouseover', function (d) {
          d.fixed = true;
          d3.select(".tooltip").transition()
             .duration(200)
             .style("opacity", .9);
          d3.select(".tooltip").html("load connecting posts")
             .style("left", (d3.event.pageX) + "px")
             .style("top", (d3.event.pageY - 28) + "px");
        })
        .on('mouseout', function (d) {
          if (!d.locked) d.fixed = false;
          d3.select(".tooltip").transition()
             .duration(500)
             .style("opacity", 0);
        });

    force.start();
  };

  this.addNode = function(doc) {
    if (!this.nodes.find(function(n) {return (doc._id == n._id)})) {
      doc.id = nodeIDMap.add(doc._id);
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
    if (this.nodes.length !== 0)
      this.nodes.forEach(function(node, i) {
        if (node._id === doc._id) {
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
