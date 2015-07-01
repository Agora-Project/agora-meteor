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
        result.push(tmp);
    });
    return result;
};

Template.graph.rendered = function() {
    var width = 1000, //d3.select('.fit-graph').attr('width'),
        height = 500; //d3.select('.fit-graph').attr('height');

    var svg = d3.select("#arguments-graph")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    var render = function (svg, nodesCol, linksCol) {

        var nodes = nodesCol,
            links = LinksToD3Array(linksCol, nodesCol);

        var force = d3.layout.force()
            .nodes(nodes)
            .links(links)
            .size([width, height])
            .linkStrength(0.3)
            .gravity(0.01)
            .charge([-100])
            .chargeDistance([300])
            .linkDistance(200)
            .start();

        //var key = function (d) {
        //    return d._id;
        //};

        var linkElements = svg.selectAll("line")
            .data(force.links());

        linkElements.exit().remove();

        var lines = linkElements.enter().append("line")
            .attr('stroke', function (d) {
                if (d.isAttack) {
                    return 'red';
                } else {
                    return 'black';
                }
            });

        var nodeElements = svg.selectAll("g")
            .data(force.nodes());

        nodeElements.exit().remove();

        var groups = nodeElements.enter().append("g");
        groups.append('rect')
            .attr("id", function (d) {
                return "rect-" + d._id;
            })
            .attr("width", 150)
            .attr("height", 60)
            //.attr("r", 6)
            .attr('fill', 'black').call(force.drag);

        var titles = groups.append("text")
            .text(function (d) {
                return d.title;
            })
            .attr("font-family", "sans-serif")
            .attr("font-size", "11px");

        var bodys = groups.append("text")
            .text(function (d) {
                return d.body;
            })
            .attr("font-size", "11px")
            .attr("font-family", "sans-serif")
            .attr("fill", "white")
            .attr("id", function (d) {
                return "text-" + d._id;
            })
            .on('load', function (d) {
                console.log(d);
                d3plus.textwrap()
                    .container(d3.select("#text-" + d._id))
                    .width(d3.select("#rect-" + d._id).node().width.baseVal.value)
                    .draw();
            });

        var removeButtons = groups.append("circle").attr("cx", function (d) {
                return d3.select("#rect-" + d._id).node().width.baseVal.value;
            })
            .attr("r", 10)
            .style("fill", "red")
            .on("click", function (d) {
                Argument.remove(d._id);
            });

        Session.setDefault('selectedTargets', {})

        var replyButtons = groups
            .append("rect")
            .attr("y", function(d) {
                return d3.select("#rect-" + d._id).node().height.baseVal.value -10;
            })
            .attr("width", 30)
            .attr("height", 10)
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
            //lines.attr("x1", function (d) {
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
            lines.attr("x1", function (d) {
                    return d.source.x + 150 / 2
                })
                .attr("y1", function (d) {
                    return d.source.y + 60 / 2;
                })
                .attr("x2", function (d) {
                    return d.target.x + 150 / 2;
                })
                .attr("y2", function (d) {
                    return d.target.y + 60 / 2;
                });

            for (i = 0; i < links.length; i++) {
                var targy = nodes[links[i].target.index].y;
                var sorcy = nodes[links[i].source.index].y;
                if (sorcy - targy < 80) {
                    nodes[links[i].target.index].y -= 1;
                    nodes[links[i].source.index].y += 1;
                }
            }

            groups.attr("transform", function (d) {
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
        render(svg, nodesCol, linksCol);
    });
}