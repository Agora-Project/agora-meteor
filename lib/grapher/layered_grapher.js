LayeredGrapher = function(nodes) {
    //Set up fields.
    for (let id in nodes) {
        let node = nodes[id];
        node.layer = 0;
        node.column = 0;
        
        node.x = 0.0;
        node.y = 0.0;
        
        node.edgesOut = [];
        node.edgesIn = [];
        
        node.subtreeWidth = 0;
        node.relativePos = 0.0;
    }
    
    //Populate edge arrays.
    for (let id in nodes) {
        let node = nodes[id];
        
        for (let link of node.links) {
            let target = nodes[link.target];
            
            node.edgesOut.push(target);
            target.edgesIn.push(node);
        }
        
        delete node.links; //Don't need this anymore.
    }
    
    //Find root.
    let root = null;
    for (let id in nodes) {
        let node = nodes[id];
        
        if (node.edgesOut.length === 0) {
            root = node;
            break;
        }
    }
    
    //Assign layers based on topological depth.
    {
        //Start at root.
        let frontier = new IdentitySet();
        frontier.add(root);
        
        //Traverse graph.
        while (!frontier.isEmpty()) {
            let newFrontier = new IdentitySet();
            
            for (let current of frontier.elements) {
                for (let next of current.edgesIn) {
                    next.layer = Math.max(current.layer + 1, next.layer);
                    newFrontier.add(next);
                }
            }
            
            frontier = newFrontier;
        }
    }
    
    //Construct table.
    let maxLayer = 0;
    for (let id in nodes) {
        let node = nodes[id];
        maxLayer = Math.max(maxLayer, node.layer);
    }
    
    let table = [];
    for (let i = 0; i <= maxLayer; i++) {
        table.push([]);
    }
    
    let insertNode = function(node) {
        let layer = table[node.layer];
        node.column = layer.length;
        layer.push(node);
    }
    
    for (let id in nodes) {
        insertNode(nodes[id]);
    }
    
    //Calculate subtree dimensions.
    for (let i = maxLayer - 1; i >= 0; i--)
    {
        let layer = table[i];
        
        for (let node of layer) {
            if (node.edgesIn.length === 0) {
                node.subtreeWidth = 1;
            }
            else for (let below of node.edgesIn) {
                node.subtreeWidth += below.subtreeWidth;
            }
        }
    }
    
    //Assign relative positions.
    for (let id in nodes) {
        let node = nodes[id];
        
        if (node.edgesIn.length > 1) {
            //Arrange edgesIn arrays to put bigger subtrees away from center.
            node.edgesIn.sort(function(a, b) {
                return a.subtreeWidth - b.subtreeWidth;
            });
            
            /*
            let edges = [];
            let i = node.edgesIn.length - 1;
            
            for (; i >= 0; i -= 2) {
                edges.push(node.edgesIn[i]);
                //console.log(i);
            }
            
            if (i === -1) i = 0;
            else i = 1;
            
            for (; i < node.edgesIn.length; i += 2) {
                edges.push(node.edgesIn[i]);
                //console.log(i);
            }
            
            console.log(' ');
            
            node.edgesIn = edges;
            */
        }
        
        /*
        let x = -node.subtreeWidth*0.5;
        
        for (let below of node.edgesIn) {
            let hw = below.subtreeWidth*0.5;
            x += hw;
            below.relativePos = x;
            x += hw;
        }
        */
        
        let x = 0.0;
        
        for (let below of node.edgesIn) {
            below.relativePos = x;
            x += below.subtreeWidth;
        }
        
        node.y = maxLayer*0.5 - node.layer;
    }
    
    //Calculate absolute positions.
    for (let layer of table) {
        for (let node of layer) {
            for (let next of node.edgesIn) {
                next.x = node.x + next.relativePos;
            }
        }
    }
};
