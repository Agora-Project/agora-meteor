mouseLinking = false;
linkNode = undefined;
newLink = {node: null};

Template.forumIndex.events({

  'click .button-post': function() {
    if (!tempNodes) tempNodes = 0;
    var blankNode = {replyNode: true, _id: tempNodes++};
    tree.addNode(blankNode);
  },

  'click .button-delete': function() {
    for (var post in Session.get('selectedTargets')) {
      if (tree.removeNode(post))
        tree.render();
      if (handlers[post._id])
        handlers[post._id].stop();
      Post.removeWithLinks(post);
    }

  },

  'click .button-link': function() {
    mouseLinking = !mouseLinking;
    d3.selectAll('.node').on('mousedown.drag', null).call(mouseLinking ? tree.createLink : tree.drag);
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
    n.selectable = true;
    nodeIDMap.add(n);
    if (nodesInGraph.contains(n)) nodes.push(n);
  });

  var links = linksToD3Array(linksCursor.fetch(), nodes);

  tree = new ForumTree(this, nodes, links);

  nodesCursor.observe({
    added: function(doc) {
      if (init) { return; }
      doc.selectable = true;
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
      postHeight = 100;

  //find our SVG element for the forumIndex template and assign our SVG variable to it as a reference.
  //Then, beloy that add code so that when we're adding new links to the graph,
  //it will draw them to the mouse cursor as it's moved around.
  var svg = d3.select("#posts-graph")
  .on('mousemove', function() {
    if (newLink.node) {
      d3.select(".newLinkLine").attr("x1", function (d) {
          return newLink.node.x;
      })
      .attr("y1", function (d) {
          return newLink.node.y;
      })
      .attr("x2", function (d) {
          return d3.mouse(d3.select("svg")[0][0])[0];
      })
      .attr("y2", function (d) {
          return d3.mouse(d3.select("svg")[0][0])[1];
      });
    }
  });

  svg.selectAll("*").remove();

  var container = svg.append('g');

  var zoom = d3.behavior.zoom()
    .scaleExtent([0.4, 4])
    .on("zoom", function() {
      container.attr("transform",
        "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    });

  svg.call(zoom).on("dblclick.zoom", null);

  var linksGroup = container.append("g"),
    nodesGroup = container.append("g");

  var linkElements = linksGroup.selectAll("line");
  var nodeElements = nodesGroup.selectAll("g");

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
              if (document.getElementById("rect-"+ d.id))
                return "translate(" + (d.x - document.getElementById("rect-"+ d.id).getBBox().width/2) + ","
                       + (d.y - document.getElementById("rect-"+ d.id).getBBox().height/2) + ")";
              else return "translate(" + d.x + ","+ d.y + ")";
            });

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
        d3.select("svg").append("line").classed("newLinkLine", true).attr('stroke', 'black');
      })
      .on("drag", function(d) {
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

  d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  resize();
  d3.select(window).on("resize", resize);

  // tick
  function tick(e) {
    //This if statement keeps the app from choking when reloading the page.
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

      /*for (i = 0; i < links.length; i++) {
        if (nodes[links[i].target.index] && nodes[links[i].source.index]) {
          var targy = nodes[links[i].target.index].y;
          var sorcy = nodes[links[i].source.index].y;
          if (sorcy - targy < 40) {
              nodes[links[i].target.index].y -= 1;
              nodes[links[i].source.index].y += 1;
          }
        }
      }*/
      var k = 6 * e.alpha;
      links.forEach(function(d, i) {
        d.source.y += k;
        d.target.y -= k;
      });

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

    feMerge.append("feMergeNode")
        .attr("in", "offsetBlur")
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");

    d3.select(".tooltip").transition()
       .duration(500)
       .style("opacity", 0);
    // add links

    contextMenuShowing = false;

    linkElements = linkElements.data(force.links(), function(d, i) { return d._id; });


    linkElements.exit().remove();

    nodeElements = nodeElements.data(force.nodes(), function(d, i) { return d.id;});

    nodeElements.exit().remove();

    var nodeSelection = nodeElements.enter().append("g")
        .call(this.drag)
        .classed("node", true)
        .classed("post", function(d) {return (!d.replyNode)})
        .classed("reply", function(d) {return (d.replyNode)})
        .attr("id", function(d) {
          return "g-" + d.id;
        });

    var menuFunction = function(d) {
      var menuNodes = [];

      menuOption = {post: d, title: "Load All Connecting Posts"};
      menuOption.clicked = function() {
        Link.find({sourceId: this.post._id}).fetch().forEach(function(link) {
          nodesInGraph.add(link.targetId);
          handlers.addHandler(link.targetId);

        });
        Link.find({targetId: this.post._id}).fetch().forEach(function(link) {
          nodesInGraph.add(link.sourceId);
          handlers.addHandler(link.sourceId);
        });

      };
      menuNodes.push(menuOption);

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
        d3.select("#rect-"+ d.id).attr('height', Math.max(this.getBBox().height + 20, 20));
        d3.select("#loadButton-" + d.id).attr("y", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().height -20;
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
        d3.select("#rect-"+ d.id).attr('height', Math.max(this.getBBox().height + 20, 20));
        d3.select("#loadButton-" + d.id).attr("y", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().height -20;
        })
        .attr("x", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().width -30;
        });
        d.expanded = false;
      }
    };

    var edgeSelection = linkElements.enter().append("line")
      .classed('link', true)
      .attr('stroke', function (d) {
        if (d.type == "Attack") {
          return 'red';
        } else {
          return 'black';
        }
      });

    nodeSelection.append('rect')
        .attr("id", function (d) {
            return "rect-" + d.id;
        })
        .attr("width", function(d) {
          if (d.body)
            return Math.sqrt(d.body.length);
          else return postWidth;
        })
        .attr("height", function(d) {
        if (d.body)
          return Math.sqrt(d.body.length);
        else return postHeight;
        })
        .classed("text-box", true)
        .on('contextmenu', menuFunction)
        .on('click', function(d) {
          var st = Session.get('selectedTargets');
          if (st[d._id]) {
              delete st[d._id];
              Session.set('selectedTargets', st);
              d3.select("#rect-" + d.id).style("filter", "");
          } else {
              st[d._id] = true;
              Session.set('selectedTargets', st);
              d3.select("#rect-" + d.id).style("filter", "url(#drop-shadow)");
          }
        }).on('mousedown', function() {
          d3.event.preventDefault();
        })
        .on("mouseup", function(d){
        });

    /**
     * POSTS
    **/

    var postSelection = nodeSelection.filter(".post");

    postSelection.append("text") //Post titles
        .attr("id", function (d) {
          return "title-" + d.id;
        }).text(function (d) {
          var titleText = d.title;
          if (titleText.length > 20) titleText = titleText.substr(0, 20);
          return titleText;
        })
        .classed("text-title", true)
        .on('contextmenu', menuFunction)
        .on('mouseover', function (d) {
          d3.select('#title-' + d.id).text(d.title);
        })
        .on('mouseout', function (d) {
          d3.select('#title-' + d.id).text(function (d) {
            var titleText = d.title;
            if (titleText.length > 20) titleText = titleText.substr(0, 20);
            return titleText;
          });
        })
        .on('click', function(d) {
          var st = Session.get('selectedTargets');
          if (st[d._id]) {
              delete st[d._id];
              Session.set('selectedTargets', st);
              d3.select("#rect-" + d.id).style("filter", "");
          } else {
              st[d._id] = true;
              Session.set('selectedTargets', st);
              d3.select("#rect-" + d.id).style("filter", "url(#drop-shadow)");
          }
        });

    postSelection.append("text") //Post bodies
        .text(function (d) {
          if (!d.body) return;
          var bodyText = d.body;
          if (bodyText.length > 100) bodyText = bodyText.substr(0, 100);
          return bodyText;
        })
        .classed("text-body", true)
        .call(function (wrapSelection) {
            wrapSelection.each (function(d){
                if (!d.body) { return; }
                d3plus.textwrap()
                    .container(d3.select(this))
                    .width(postWidth)
                    .height(postHeight)
                    .draw();
                d3.select("#rect-"+ d.id).attr('width', Math.min(Math.max(this.getBBox().width + 10, 60, document.getElementById("title-"+ d.id).getBBox().width), 140));
                d3.select("#rect-"+ d.id).attr('height', Math.max(this.getBBox().height + 20, 20));
            });

        })
        .attr("id", function (d) {
            return "text-" + d.id;
        })
        .on('contextmenu', menuFunction)
        .on('dblclick', expandFunction)
        .on('click', function(d) {
          var st = Session.get('selectedTargets');
          if (st[d._id]) {
              delete st[d._id];
              Session.set('selectedTargets', st);
              d3.select("#rect-" + d.id).style("filter", "");
          } else {
              st[d._id] = true;
              Session.set('selectedTargets', st);
              d3.select("#rect-" + d.id).style("filter", "url(#drop-shadow)");
          }
        });

    postSelection.append("rect") //Load buttons
        .attr("y", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().height -20;
        })
        .attr("x", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().width -30;
        })
        .attr("width", 30)
        .attr("height", 20)
        .classed('control load-button', true)
        .attr("id", function(d) { return "loadButton-" + d.id;})
        .on("click", function (d) {
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
          d3.select(".tooltip").transition()
             .duration(200)
             .style("opacity", .9);
          d3.select(".tooltip").html("load connecting posts")
             .style("left", (d3.event.pageX) + "px")
             .style("top", (d3.event.pageY - 28) + "px");
        })
        .on('mouseout', function (d) {
          d3.select(".tooltip").transition()
             .duration(500)
             .style("opacity", 0);
        });

    /**
     * REPLIES
    **/

    var replySelection = nodeSelection.filter(".reply");

    var replyTitles = replySelection.append("foreignObject")
        .attr("width", postWidth)
        .attr("height","25")
        .attr("y","-25")
        .append("xhtml:div")
        .append("xhtml:input")
        .attr("id", function(d) { return "replyTitle-" + d.id;})
        .attr("size",15)
        .attr("z-index", 1)
        .attr("type", "text");

    var replybodies = replySelection.append("foreignObject")
        .attr("width", postWidth)
        .attr("height",postHeight - 20)
        .append("xhtml:div")
        .append("xhtml:textarea")
        .attr("id", function(d) { return "replyBody-" + d.id;})
        .classed("reply-body", true)
        .attr("rows", 4)
        .attr("cols", 15)
        .attr("z-index", 1)
        .attr("resize", "none");

    var removeButtons = nodeSelection.append("circle").attr("cx", function (d) {
            return document.getElementById("rect-"+ d.id).getBBox().width;
        })
        .attr("r", 10)
        .classed('control remove-button', true)
        .on("click", function (d) {
            tree.removeNode(d)
            resetTargetsSelection();
        })
        .on('contextmenu', menuFunction)
        .on('mouseover', function (d) {
          d3.select(".tooltip").transition()
             .duration(200)
             .style("opacity", .9);
          d3.select(".tooltip").html("remove post")
             .style("left", (d3.event.pageX) + "px")
             .style("top", (d3.event.pageY - 28) + "px");
        })
        .on('mouseout', function (d) {
          d3.select(".tooltip").transition()
             .duration(500)
             .style("opacity", 0);
        });

    var replyButtons = replySelection.append("rect")
        .attr("y", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().height -20;
        })
        .attr("x", function(d) {
            return document.getElementById("rect-"+ d.id).getBBox().width -30;
        })
        .attr("width", 30)
        .attr("height", 20)
        .classed('control reply-button', true)
        .attr("id", function(d) { return "replyButton-" + d.id;})
        .on("click", function(d) {
          var title = $('#replyTitle-' + d.id).val();
          var body = $('#replyBody-' + d.id).val();
          var links = [];

          for (var key in Session.get('selectedTargets')) {
              links.push(key);
          }

          if (links.length === 0) {
            d3.event.preventDefault();
            return;
          }

          var postId = Post.insert({
              ownerId: Meteor.userId(),
              title: title,
              body: body,
              isAttack: false,
              links: links
          });

          d3.event.preventDefault();
          setTimeout(function() {nodesInGraph.add(postId)}, 1000);
          handlers.addHandler(postId);
          tree.removeNode(d);
        });

        force.start();
        for (var i = 10000; i > 0; --i) force.tick();
        force.stop();
  };

  this.addNode = function(doc) {
    if (!this.nodes.find(function(n) {return (doc._id == n._id)})) {
      nodeIDMap.add(doc);
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
