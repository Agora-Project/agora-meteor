//We need to wrap each given node/link in a new object, such that:
//  A. We don't contaminate given objects with new data.
//  B. We can return extra dummy nodes and links.

GraphLayoutLayered = function(nodes, links, args) {
    //Set default parameters
    let spacingHorizontal = args ? args.spacingHorizontal : undefined;
    spacingHorizontal = spacingHorizontal ? spacingHorizontal : 38.0;

    let spacingVertical = args ? args.spacingVertical : undefined;
    spacingVertical = spacingVertical ? spacingVertical : 38.0;

    //Set up the Directed Acyclic Graph (DAG)
    let dag = new DAG();

    for (let node of nodes) {
        dag.addVertex(node);
    }

    for (let link of links) {
        dag.addEdge(link.source, link.target);
    }

    let layout = new LayeredGraph(dag);

    //Place nodes depending on their layers and columns.
    for (let node of layout.nodes) {
        if (node.vertex !== undefined) {
            node.name = node.vertex.name;
        }

        let layerWidth = layout.table[node.layer].length - 1;

        node.x = (node.column - layerWidth*0.5)*spacingHorizontal;
        node.y = (layout.height*0.5 - node.layer)*spacingVertical;
    }

    //Iterate from top to bottom of table.
    for (let layer = layout.height; layer > 0; layer--) {
        let sourceLayer = layout.table[layer - 1];
        let targetLayer = layout.table[layer];

        //Place source groups directly below their targets, regardless of
        //whether this creates edges crossings or not.
        for (let target of targetLayer) {
            let left = null, right = null;

            for (let edge of target.edgesIn) {
                if (left === null || edge.source.x < left.x) {
                    left = edge.source;
                }
                if (right === null || edge.source.x > right.x) {
                    right = edge.source;
                }
            }

            if (left !== null) {
                let offset = target.x - (left.x + right.x)*0.5;
                for (let edge of target.edgesIn) {
                    edge.source.x += offset;
                }
            }
        }

        //Enforce spacing and order of layer.
        for (let column = 1; column < sourceLayer.length; column++) {
            let left = sourceLayer[column - 1];
            let right = sourceLayer[column];
            right.x = Math.max(right.x, left.x + spacingHorizontal);
        }

        //Shift entire layer to minimize average edge slant.
        let edgeSlant = 0.0;
        let edgeCount = 0;

        for (let node of targetLayer) {
            for (let edge of node.edgesIn) {
                edgeSlant += edge.source.x - node.x;
            }
            edgeCount += node.edgesIn.length;
        }

        if (edgeCount > 0) {
            let offset = -edgeSlant/edgeCount;
            for (let node of sourceLayer) {
                node.x += offset;
            }
        }

        //If there's room, place source groups below their targets again.
        for (let target of targetLayer) {
            let left = null, right = null;

            for (let edge of target.edgesIn) {
                if (left === null || edge.source.x < left.x) {
                    left = edge.source;
                }
                if (right === null || edge.source.x > right.x) {
                    right = edge.source;
                }
            }

            if (left !== null) {
                let offset = target.x - (left.x + right.x)*0.5;

                //Limit offset based on neighboring nodes.
                if (offset < 0.0) {
                    let neighbor = sourceLayer[left.column - 1];
                    if (neighbor !== undefined) {
                        if (left.x + offset < neighbor.x + spacingHorizontal) {
                            offset = neighbor.x + spacingHorizontal - left.x;
                        }
                    }
                }
                else {
                    let neighbor = sourceLayer[right.column + 1];
                    if (neighbor !== undefined) {
                        if (right.x + offset > neighbor.x - spacingHorizontal) {
                            offset = neighbor.x - spacingHorizontal - right.x;
                        }
                    }
                }

                for (let edge of target.edgesIn) {
                    edge.source.x += offset;
                }
            }
        }
    }

    //Iterate from bottom to top of table.
    for (let layer = 0; layer < layout.height; layer++) {
        let sourceLayer = layout.table[layer];
        let targetLayer = layout.table[layer + 1];

        //If there's room, place targets above their  source groups.
        //This for loop is weird, it goes from both ends
        //converging on the middle.
        for (let i = 0; i < targetLayer.length/2; i++) {
            //We use this code twice, so lets declare it a function.
            function offsetNode(node) {
                if (node.edgesIn.length > 0) {
                    let edgeSlant = 0.0;
                    let edgeCount = 0;

                    for (let edge of target.edgesIn) {
                        edgeSlant += edge.source.x - node.x;
                    }
                    edgeCount += target.edgesIn.length;

                    let offset = edgeSlant/edgeCount;

                    /*edgeSlant = 0.0;
                    edgeCount = 0;

                    for (let edge of target.edgesOut) {
                        edgeSlant += edge.target.x - target.x;
                    }
                    edgeCount += target.edgesOut.length;

                    offset += 0.5*edgeSlant/edgeCount;
                    */


                    //Limit offset based on neighboring nodes.
                    while (offset < 0.0) {
                        let neighbor = targetLayer[node.column - 1];
                        if (neighbor !== undefined) {
                            if (node.x + offset < neighbor.x + spacingHorizontal) {
                                if (offset < -spacingHorizontal/2 &&
                                    neighbor.edgesIn.length < 1 &&
                                    neighbor.edgesOut.length == 1 &&
                                    node.edgesOut.length == 1 &&
                                    neighbor.edgesOut[0].target ===
                                    node.edgesOut[0].target) {
                                        targetLayer.splice(node.column, 1);
                                        targetLayer.splice(node.column - 1, 0, node);
                                        node.column--;
                                        neighbor.column++;
                                        node.x -= spacingHorizontal;
                                        neighbor.x += spacingHorizontal;
                                        offset += spacingHorizontal;
                                } else {
                                    node.x = neighbor.x + spacingHorizontal;
                                    offset = 0;
                                }
                            } else {
                                node.x += offset;
                                offset = 0;
                            }
                        } else {
                            node.x += offset;
                            offset = 0;
                        }
                    }
                    while (offset > 0.0) {
                        let neighbor = targetLayer[node.column + 1];
                        if (neighbor !== undefined) {
                            if (node.x + offset > neighbor.x - spacingHorizontal) {
                                if (offset > spacingHorizontal/2 &&
                                    neighbor.edgesIn.length < 1 &&
                                    neighbor.edgesOut.length == 1 &&
                                    node.edgesOut.length == 1 &&
                                    neighbor.edgesOut[0].target ===
                                    node.edgesOut[0].target) {
                                        targetLayer.splice(node.column, 1);
                                        targetLayer.splice(node.column + 1, 0, node);
                                        node.column++;
                                        neighbor.column--;
                                        node.x += spacingHorizontal;
                                        neighbor.x -= spacingHorizontal;
                                        offset -= spacingHorizontal;
                                } else {
                                    node.x = neighbor.x - spacingHorizontal;
                                    offset = 0;
                                }
                            } else {
                                node.x += offset;
                                offset = 0;
                            }
                        } else {
                            node.x += offset;
                            offset = 0;
                        }
                    }
                }
            }

            //First, from left to right...
            let target = targetLayer[i];

            offsetNode(target);

            //Then, from right to left.
            target = targetLayer[targetLayer.length -1 - i];

            offsetNode(target);
        }


    }

    //Center new layout horizontally.
    let leftBound = Infinity, rightBound = -Infinity;

    for (let node of layout.nodes) {
        leftBound = Math.min(leftBound, node.x);
        rightBound = Math.max(rightBound, node.x);
    }

    let offset = -(leftBound + rightBound)*0.5;

    for (let node of layout.nodes) {
        node.x += offset;
    }

    //Expose arrays.
    this.nodes = layout.nodes;
    this.links = layout.edges;
}

GraphLayoutForce = function(nodes, links) {
    let nodeMap = new IdentityMap();
    this.nodes = [];

    //Wrap nodes.
    for (let node of nodes) {
        let nodeWrapper = {name:node};
        nodeMap.put(node, nodeWrapper);
        this.nodes.push(nodeWrapper);
    }

    //Wrap links.
    this.links = [];
    for (let link of links) {
        this.links.push({
            source:nodeMap.get(link.source),
            target:nodeMap.get(link.target)
        });
    }

    //Set up force graph.
    let graph = d3.layout.force()
        .nodes(this.nodes)
        .links(this.links)
        .gravity(1.0)
        .charge(-2000)
        .chargeDistance(512)
        .friction(0.9)
        .linkStrength(0.3)
        .linkDistance(16.0)
        .on("tick", function(e) {
            if (!nodes[0] || !nodes[0].y) {
                return;
            }

            links.forEach(function(d, i) {
                if (d.source.y < d.target.y + 160) {
                    d.target.y -= 1;
                }
            });
        });

    //Run force graph.
    graph.start();
    for (let i = 0; i < 256; i++) graph.tick();
    graph.stop();
}
