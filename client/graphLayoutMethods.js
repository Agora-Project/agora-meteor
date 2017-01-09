//We need to wrap each given node/link in a new object, such that:
//  A. We don't contaminate given objects with new data.
//  B. We can return extra dummy nodes and links.

GraphLayoutLayered = function(nodes, links) {
    let SPACING_DISTANCE = 32.0;
    let dag = new DAG();
    
    for (let node of nodes) {
        dag.addVertex(node);
    }
    
    for (let link of links) {
        dag.addEdge(link.source, link.target);
    }
    
    let layout = new LayeredGraph(dag);
    
    for (let node of layout.nodes) {
        if (node.vertex !== undefined) {
            node.name = node.vertex.name;
        }
        
        let layerWidth = layout.table[node.layer].length - 1;
        
        node.x = (node.column - layerWidth*0.5)*SPACING_DISTANCE;
        node.y = (node.layer - layout.height*0.5)*SPACING_DISTANCE;
    }
    
    //Try to move nodes towards their connections, while maintaining distance
    //from their neighbors.
    for (let i = 0; i < 3; i++) {
        for (let node of layout.nodes) {
            let totalX = 0.0;
            let xCount = 0;
            
            for (let edge of node.edgesOut) {
                totalX += edge.target.x;
                xCount++;
            }
            
            for (let edge of node.edgesIn) {
                totalX += edge.source.x;
                xCount++;
            }
            
            if (xCount == 0) {
                node.targetX = node.x;
                continue;
            }
            
            node.targetX = totalX/xCount;
            
            //Limit offset based on neighboring nodes.
            if (node.targetX < node.x) {
                let neighbor = layout.table[node.layer][node.column - 1];
                if (neighbor !== undefined) {
                    node.targetX = Math.max(neighbor.x + SPACING_DISTANCE, node.targetX);
                }
            }
            else {
                let neighbor = layout.table[node.layer][node.column + 1];
                if (neighbor !== undefined) {
                    node.targetX = Math.min(neighbor.x - SPACING_DISTANCE, node.targetX);
                }
            }
        }
        
        for (let node of layout.nodes) {
            node.x = node.targetX;
        }
    }
    
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
