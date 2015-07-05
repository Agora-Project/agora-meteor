var LinksToD3Array = function(linksCol, nodesCol) {
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

Template.graph.rendered = function() {
    Session.setDefault('selectedTargets', {})

    var viewWidth = 1000, //d3.select('.fit-graph').attr('width'),
        viewHeight = 500, //d3.select('.fit-graph').attr('height');
        argumentWidth = 150,
        argumentHeight = 60;

    var svg = d3.select("#arguments-graph")
        .append("svg")
        .attr("width", viewWidth)
        .attr("height", viewHeight);

    var key = function (d) {
        return d._id;
    };

    var renderUI = function(nodesCol, linksCol) {
        console.log(linksCol);
        var nodes = nodesCol,  links = LinksToD3Array(linksCol, nodesCol);
        console.log(nodes); console.log(links);

        var force = d3.layout.force()
            .nodes(nodes)
            .links(links)
            .size([viewWidth, viewHeight])
            .linkDistance(100)
            .charge(-600)
            .start();

        //force.resume();

        var linkElements = svg.selectAll("line").data(force.links());;
        var nodeElements = svg.selectAll("g").data(force.nodes());

        linkElements.exit().remove();

        var edgeSelection = linkElements.enter().append("line")
            .attr('stroke', function (d) {
                if (d.isAttack) {
                    return 'red';
                } else {
                    return 'black';
                }
            });

        nodeElements.exit().remove();

        var nodeSelection = nodeElements.enter().append("g").attr("class", function (d) {
            if(d.isRoot) { return "root-argument"; } else { return ""; }
        });

        nodeSelection.append('rect')
            .attr("id", function (d) {
                return "rect-" + d._id;
            })
            .attr("width", argumentWidth)
            .attr("height", argumentHeight)
            //.attr("r", 6)
            .attr('fill', 'black').call(function(){ force.drag(); force.start(); });

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
            .attr("fill", "white")
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
                Session.set('selectedTargets', {})
            });

        var replyButtons =      nodeSelection.append("rect")
            .attr("y", function(d) {
                return argumentHeight -10;
            })
            .attr("width", 30)
            .attr("height", 10)
            .attr("class", 'control')
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

        force.on("tick", function () {
            //edgeSelection.attr("x1", function (d) {
            //        return d.source.x + d3.select("#rect-" + d.source._id).node().width.baseVal.value / 2
            //    })
            //    .attr("y1", function (d) {
            //        return d.source.y + d3.select("#rect-" + d.source._id).node().height.baseVal.value / 2;
            //    })
            //    .attr("x2", function (d) {
            //        return d.target.x + d3.select("#rect-" + d.target._id).node().width.baseVal.value / 2;
            //    })
            //    .attr("y2", function (d) {
            //        return d.target.y + d3.select("#rect-" + d.target._id).node().height.baseVal.value / 2;
            //    });
            edgeSelection.attr("x1", function (d) {
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

            nodeSelection.attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
        });
        //.stop()
        //.linkDistance(function(d) {
        //    var rectw = d3.select("#rect-" + d.source._id).node().width.baseVal.value;
        //    var recth = d3.select("#rect-" + d.source._id).node().height.baseVal.value;
        //    var linkLength = Math.sqrt((rectw * rectw) + (recth * recth));
        //    rectw = d3.select("#rect-" + d.target._id).node().width.baseVal.value;
        //    recth = d3.select("#rect-" + d.target._id).node().height.baseVal.value;
        //    linkLength += Math.sqrt((rectw * rectw) + (recth * recth));
        //    linkLength *= .75;
        //    return linkLength;
        //})
        //.start();

    };

    var renderForce = function () {
        //force.size([viewWidth, viewHeight])
        //    .linkStrength(0.3)
        //    .gravity(0.01)
        //    .charge([-100])
        //    .chargeDistance([300])
        //    .linkDistance(200).start();
        //;

        force.on("tick", function () {
            //edgeSelection.attr("x1", function (d) {
            //        return d.source.x + d3.select("#rect-" + d.source._id).node().width.baseVal.value / 2
            //    })
            //    .attr("y1", function (d) {
            //        return d.source.y + d3.select("#rect-" + d.source._id).node().height.baseVal.value / 2;
            //    })
            //    .attr("x2", function (d) {
            //        return d.target.x + d3.select("#rect-" + d.target._id).node().width.baseVal.value / 2;
            //    })
            //    .attr("y2", function (d) {
            //        return d.target.y + d3.select("#rect-" + d.target._id).node().height.baseVal.value / 2;
            //    });
            edgeSelection.attr("x1", function (d) {
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

            nodeSelection.attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
        });
        //.stop()
        //.linkDistance(function(d) {
        //    var rectw = d3.select("#rect-" + d.source._id).node().width.baseVal.value;
        //    var recth = d3.select("#rect-" + d.source._id).node().height.baseVal.value;
        //    var linkLength = Math.sqrt((rectw * rectw) + (recth * recth));
        //    rectw = d3.select("#rect-" + d.target._id).node().width.baseVal.value;
        //    recth = d3.select("#rect-" + d.target._id).node().height.baseVal.value;
        //    linkLength += Math.sqrt((rectw * rectw) + (recth * recth));
        //    linkLength *= .75;
        //    return linkLength;
        //})
        //.start();
    };

    Tracker.autorun(function () {
        var nodesCol = Argument.find({}).fetch();
        var linksCol = Link.find({}).fetch();
        renderUI(nodesCol, linksCol);
    });
    //renderForce();
}