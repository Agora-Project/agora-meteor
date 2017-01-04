//We need to wrap each given node/link in a new object, such that:
//  A. We don't contaminate given objects with new data.
//  B. We can return extra dummy nodes and links.

GraphLayoutLayered = function(nodes, links) {
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
        node.x = node.column*32.0;
        node.y = node.layer*32.0;
    }
    
    this.nodes = layout.nodes;
    this.links = layout.edges;
}

GraphLayoutForce = function(nodes, links) {
    let nodeMap = new IdentityMap();
    this.nodes = [];
    
    //Wrap nodes
    for (let node of nodes) {
        let nodeWrapper = {name:node};
        nodeMap.put(node, nodeWrapper);
        this.nodes.push(nodeWrapper);
    }
    
    //Wrap links
    this.links = [];
    for (let link of links) {
        this.links.push({
            source:nodeMap.get(link.source),
            target:nodeMap.get(link.target)
        });
    }
    
    //Set up force graph
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
    
    //Run force graph
    graph.start();
    for (let i = 0; i < 256; i++) graph.tick();
    graph.stop();
}
