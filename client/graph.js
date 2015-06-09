function removePost(){};

var svg = d3.select("#GraphPanel")
                .append("svg")
                .attr("width", 1000)
                .attr("height", 540);

var jsgraph = { nodes: Thread.find(), links: []}
var force = d3.layout.force()
                 .nodes(jsgraph.nodes)
                 .links(jsgraph.links)
                 .size([1000, 540])
                 .linkStrength(0.3)
                 .gravity(0.005)
                 .charge([-100])
                 .chargeDistance([300])
                 .start();
            
            edges = svg.selectAll("line")
                .data(jsgraph.links);
        
            edges.exit().remove();
        
            edges.enter()
                .append("line")
                .style("stroke", "rgb(255,0,0)");
        
            var numPosts = 0;
        
            var nodes = svg.selectAll("g")
                .data(jsgraph.nodes);
                
            
        
            nodes.exit().remove();
            
            nodes.enter()
                .append("g")
                .attr("transform", function(d) {return "translate("+1000+","+1000+")";});;
        
            svg.selectAll("g")
                .attr("id", function(d) {
                    return "group" + numPosts++;
                });
        
            
            numPosts = 0;
             var rects = svg.selectAll("g")
                .append("rect")
                .attr("width", function(d) {
                    return sizeArgument(d)[0];
                }).attr("height", function(d) {
                    return sizeArgument(d)[1];
                }).attr("id", function(d) { return "rect" + numPosts++;})
                .call(force.drag);
        
            var titles = svg.selectAll("g")
                .append("text")
                .text(function(d) {return d.post.getContent().get("Title");})
                .attr("font-family", "sans-serif")
                .attr("font-size", "11px");
        
            var i;
            numPosts = 0;
            var texts = svg.selectAll("g")
                .append("text")
                .text(function(d) {return d.post.getText();})
                .attr("font-size", "11px")
                .attr("font-family", "sans-serif")
                .attr("fill", "white")
                .attr("id", function(d) { return "text" + numPosts++;});
        
            for (i = 0; i < numPosts; i++) {
                d3plus.textwrap()
                    .container(d3.select("#text" + i))
                    .width(d3.select("#rect" + i).node().width.baseVal.value)
                    .draw();
            }
        
            var expandButtons = svg.selectAll("g")
                .append("rect")
                .attr("x", function(d) {
                    return d3.select("#rect" + d.index).node().width.baseVal.value -30;
                })
                .attr("y", function(d) {
                    return d3.select("#rect" + d.index).node().height.baseVal.value -10;
                })
                .attr("width", 30)
                .attr("height", 10)
                .style("fill", "blue")
                .on("click", function(d) {
                    loadNodes(d.post.getID());
                });
            
            numPosts = 0;
            var replyButtons = svg.selectAll("g")
                    .append("rect")
                    .attr("y", function(d) {
                        return d3.select("#rect" + d.index).node().height.baseVal.value -10;
                    })
                    .attr("width", 30)
                    .attr("height", 10)
                    .attr("id", function(d) { return "replyButton" + numPosts++;})
                    .style("fill", function(d) {
                        for (i = 0; i < targets.length; i++) {
                            if (targets[i].getID().equals(d.post.getID())) {
                                return "white";
                            }
                        }
                        
                        return "green";             
                    })
                    .on("click", function (d) {
                        var index = -1;
                        for (i = 0; i < targets.length; i++) {
                            if (targets[i].getID().equals(d.post.getID())) {
                                index = i;
                                break;
                            }
                        }
                        if (index == -1) {
                            targets.push(d.post);
                            d3.select("#replyButton" + d.index)
                            .style("fill", "white");
                        } else {
                            targets.splice(index, 1);
                            d3.select("#replyButton" + d.index)
                            .style("fill", "green");
                        }
                    });
                    
            var closeButtons = svg.selectAll("g")
                    .append("circle")
                    .attr("cx", function(d) {
                        return d3.select("#rect" + d.index).node().width.baseVal.value;
                    })
                    .attr("r", 10)
                    .style("fill", "red")
                    .on("click", removePost);
            
            force.on("tick", function() {

                edges.attr("x1", function(d) { return d.source.x + d3.select("#rect" + d.source.index).node().width.baseVal.value/2})
                     .attr("y1", function(d) { return d.source.y + d3.select("#rect" + d.source.index).node().height.baseVal.value/2; })
                     .attr("x2", function(d) { return d.target.x + d3.select("#rect" + d.target.index).node().width.baseVal.value/2; })
                     .attr("y2", function(d) { return d.target.y + d3.select("#rect" + d.target.index).node().height.baseVal.value/2; });
             
                for(i = 0; i < jsgraph.links.length; i++) {
                    var targy = jsgraph.nodes[jsgraph.links[i].target.index].y;
                    var sorcy = jsgraph.nodes[jsgraph.links[i].source.index].y;
                    if (sorcy - targy < 80) {
                        jsgraph.nodes[jsgraph.links[i].target.index].y -= 1;
                        jsgraph.nodes[jsgraph.links[i].source.index].y += 1;
                    }
                }
                nodes.attr("transform", function(d) {return "translate("+d.x+","+d.y+")";});

            })
            .stop()
            .linkDistance(function(d) {
                var rectw = d3.select("#rect" + d.source.index).node().width.baseVal.value;
                var recth = d3.select("#rect" + d.source.index).node().height.baseVal.value;
                var linkLength = Math.sqrt((rectw * rectw) + (recth * recth));
                rectw = d3.select("#rect" + d.target.index).node().width.baseVal.value;
                recth = d3.select("#rect" + d.target.index).node().height.baseVal.value;
                linkLength += Math.sqrt((rectw * rectw) + (recth * recth));
                linkLength *= .75;
                return linkLength;
            })
            .start();