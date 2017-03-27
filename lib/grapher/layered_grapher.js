LayeredGrapher = function(nodes) {
    //Set up fields.
    for (let id in nodes) {
        let node = nodes[id];
        node.layer = 0;
        node.column = 0;
        
        node.edgesOut = [];
        node.edgesIn = [];
        
        node.edgeCount = 0;
        node.edgeColumnTotal = 0;
        node.edgeAvgColumn = 0.0;
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
    
    //Assign layers based on reverse (!) topological depth.
    {
        let frontier = new IdentitySet();
        
        //Start with sinks.
        for (let id in nodes) {
            let node = nodes[id];
            
            if (node.edgesOut.length === 0) {
                frontier.add(node);
            }
        }
        
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
    
    let maxLayer = 0;
    for (let id in nodes) {
        let node = nodes[id];
        maxLayer = Math.max(maxLayer, node.layer);
    }
    
    //Reverse layers so that nodes like to stay close to their parents. Should
    //result in less crowding on layer zero.
    for (let id in nodes) {
        let node = nodes[id];
        node.layer = maxLayer - node.layer;
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
    
    //Assign arbitrary columns.
    for (let id in nodes) {
        insertNode(nodes[id]);
    }
    
    //Sorts layerToSift by average connection position.
    //The idea is to put nodes close to connected nodes, to reduce edge crossings.
    let siftLayer = function(layerToSift, referenceLayer, isRefAbove) {
        for (let node of layerToSift) {
            node.edgeCount = 0;
            node.edgeColumnTotal = 0;
        }
        
        if (isRefAbove) {
            for (let above of referenceLayer) {
                for (let below of above.edgesIn) {
                    below.edgeCount++;
                    below.edgeColumnTotal += above.column;
                }
            }
        }
        else {
            for (let below of referenceLayer) {
                for (let above of below.edgesOut) {
                    above.edgeCount++;
                    above.edgeColumnTotal += below.column;
                }
            }
        }
        
        for (let node of layerToSift) {
            node.edgeAvgColumn = node.edgeColumnTotal/node.edgeCount;
        }
        
        layerToSift.sort(function(a, b) {
            return a.edgeAvgColumn - b.edgeAvgColumn;
        });
        
        for (let i = 0; i < layerToSift.length; i++) {
            layerToSift[i].column = i;
        }
    }
    
    for (let iteration = 0; iteration < 2; iteration++) {
        //Sift from bottom to top.
        for (let i = 1; i <= maxLayer; i++)
            siftLayer(table[i], table[i - 1], false);

        //Then sift again from top to bottom.
        for (let i = maxLayer - 1; i >= 0; i--)
            siftLayer(table[i], table[i + 1], true);
    }
    
    //Expose table and dimensions.
    this.table = table;
    this.height = maxLayer;
    this.width = 0;
    for (let i = 0; i < table.length; i++) {
        this.width = Math.max(this.width, table[i].length - 1);
    }
    
    //Clean up temporary fields.
    for (let id in nodes) {
        let node = nodes[id];
        
        delete node.edgeCount;
        delete node.edgeColumnTotal;
        delete node.edgeAvgColumn;
    }
    
    let count = 0;
    
    //Place nodes based on their layers and columns.
    for (let id in nodes) {
        let node = nodes[id];
        let layerWidth = table[node.layer].length - 1;
        node.x = node.column - layerWidth*0.5
        node.y = node.layer - maxLayer*0.5;
    }
    
    //TODO:
    //  *Reimplement dummy nodes
    //  *Implement table shifting to improve spacing and minimize edge slant.
};
