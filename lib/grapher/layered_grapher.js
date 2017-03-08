//Directed acyclic graph class, for input into LayeredGraph.
DAG = function() {
    //Does a strict check to ensure no cycles are created in this graph.
    //Will reduce performance, especially on larger graphs.
    let ENSURE_NO_CYCLES = true;
    
    let self = this;
    this.vertices = new IdentityMap();
    
    let Vertex = function(name) {
        this.name = name;
        this.vertsOut = new IdentitySet();
        this.vertsIn = new IdentitySet();
        let self = this;
        
        this.isSink = function() {
            return self.vertsOut.isEmpty();
        }
        
        this.isSource = function() {
            return self.vertsIn.isEmpty();
        }
    }
    
    //Returns whether a vertex exists in this graph with the given name.
    this.containsVertex = function(name) {
        return self.vertices.containsKey(name);
    };
    
    //Adds the given vertex to this graph, returning true if the vertex did not
    //already exist or false otherwise.
    this.addVertex = function(name) {
        if (self.containsVertex(name)) {
            return false;
        }
        
        let vertex = new Vertex(name);
        self.vertices.put(name, vertex);
        return true;
    };
    
    //Removes the given vertex from this graph and returns true, or returns
    //false if no such vertex exists. Also removes any links which reference the
    //given vertex.
    this.removeVertex = function(name) {
        let vertex = self.vertices.remove(name);
        if (vertex === null) {
            return false;
        }
        
        for (let vEnd of vertex.vertsOut.elements) {
            vEnd.vertsIn.remove(vertex);
        }
        for (let vStart of vertex.vertsIn.elements) {
            vStart.vertsOut.remove(vertex);
        }
        return true;
    };
    
    let wouldCreateCycle = function(vStart, vEnd) {
        let frontier = new IdentitySet();
        frontier.add(vEnd);
        
        //Start at end vertex and traverse graph, checking if we can reach the
        //start from the end.
        while (!frontier.isEmpty()) {
            let newFrontier = new IdentitySet();
            
            for (let current of frontier.elements) {
                for (let vOut of current.vertsOut.elements) {
                    if (vOut === vStart) {
                        return true;
                    }
                    newFrontier.add(vOut);
                }
            }
            
            frontier = newFrontier;
        }
        
        return false;
    };
    
    //Returns whether an edge exists in this graph between the given vertices.
    this.containsEdge = function(start, end) {
        if (!self.containsVertex(start) || !self.containsVertex(end)) {
            return false;
        }
        
        let vStart = self.vertices.get(start);
        let vEnd = self.vertices.get(end);
        return vStart.vertsOut.contains(vEnd);
    };
    
    //Adds the given edge to this graph, returning true if the edge did not
    //already exist or false otherwise. Throws an exception if the given nodes
    //do not both exist. Throws an exception upon trying to add a edge that
    //would make this graph cyclic.
    this.addEdge = function(start, end) {
        if (!self.containsVertex(start)) throw new Error("No such vertex '" + start + "'");
        if (!self.containsVertex(end)) throw new Error("No such vertex '" + end + "'");
        
        let vStart = self.vertices.get(start);
        let vEnd = self.vertices.get(end);
        
        if (vStart.vertsOut.contains(vEnd)) {
            return false;
        }
        
        if (ENSURE_NO_CYCLES && wouldCreateCycle(vStart, vEnd)) {
            throw new Error("An edge from '" + start + "' to '" + end + "' would create a cycle");
        }
        
        vStart.vertsOut.add(vEnd);
        vEnd.vertsIn.add(vStart);
        return true;
    };
    
    //Removes the given edge from this graph and returns true, or returns false
    //if no such edge exists.
    this.removeEdge = function(start, end) {
        if (!self.containsVertex(start) || !self.containsVertex(end)) {
            return false;
        }
        
        let vStart = self.vertices.get(start);
        let vEnd = self.vertices.get(end);
        
        if (!vStart.vertsOut.contains(vEnd)) {
            return false;
        }
        
        vStart.vertsOut.remove(vEnd);
        vEnd.vertsIn.remove(vStart);
        return true;
    };
    
    //Performs the given action on the vertex names of each edge in this graph.
    this.forEachEdge = function(action) {
        self.vertices.forEachEntry(function(start, vStart) {
            for (let vEnd of vStart.vertsOut.elements) {
                action(start, vEnd.name);
            }
        });
    };
};

//-----------------------------ACTUAL LAYOUT CODE-------------------------------

LayeredGraph = function(dag) {
    let Node = function(vertex) {
        this.vertex = vertex;
        this.layer = 0;
        this.column = 0;
        
        this.edgesOut = [];
        this.edgesIn = [];
        
        this.edgeCount = 0;
        this.edgeColumnTotal = 0;
        this.edgeAvgColumn = 0.0;
    };
    
    let nodes = new IdentityMap();
    dag.vertices.forEachEntry(function(name, vertex) {
        nodes.put(name, new Node(vertex));
    });
    
    //Assign layers based on reverse (!) topological depth.
    {
        let frontier = new IdentitySet();
        
        //Start with sinks.
        nodes.forEachEntry(function(name, node) {
            if (node.vertex.isSink()) {
                frontier.add(node);
            }
        });
        
        //Traverse graph.
        while (!frontier.isEmpty()) {
            let newFrontier = new IdentitySet();
            
            for (let nCurrent of frontier.elements) {
                for (let vNext of nCurrent.vertex.vertsIn.elements) {
                    let nNext = nodes.get(vNext.name);
                    nNext.layer = Math.max(nCurrent.layer + 1, nNext.layer);
                    newFrontier.add(nNext);
                }
            }
            
            frontier = newFrontier;
        }
    }
    
    let maxLayer = 0;
    nodes.forEachEntry(function(name, node) {
        maxLayer = Math.max(maxLayer, node.layer);
    });
    
    //Reverse layers so that nodes like to stay close to their parents. Should
    //result in less crowding on layer zero.
    nodes.forEachEntry(function(name, node) {
        node.layer = maxLayer - node.layer;
    });
    
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
    nodes.forEachEntry(function(name, node) {
        insertNode(node);
    });
    
    //Generate edges and dummy nodes.
    let Edge = function(source, target) {
        this.source = source;
        this.target = target;
        
        source.edgesOut.push(this);
        target.edgesIn.push(this);
    };
    
    let dummyNodes = [];
    
    nodes.forEachEntry(function(start, nStart) {
        nStart.vertex.vertsOut.forEach(function(vEnd) {
            let nDummyStart = nStart;
            let nEnd = nodes.get(vEnd.name);
            
            while (nEnd.layer > nDummyStart.layer + 1)
            {
                let dummy = new Node();
                dummy.layer = nDummyStart.layer + 1;
                insertNode(dummy);
                dummyNodes.push(dummy);
                new Edge(nDummyStart, dummy);
                nDummyStart = dummy;
            }
            
            new Edge(nDummyStart, nEnd);
        });
    });
    
    //Sorts layerToSift by average connection position.
    //The idea is to put nodes close to connected nodes, to reduce edge crossings.
    let siftLayer = function(layerToSift, referenceLayer, isRefAbove) {
        for (let node of layerToSift) {
            node.edgeCount = 0;
            node.edgeColumnTotal = 0;
        }
        
        if (isRefAbove) {
            for (let nAbove of referenceLayer) {
                for (let edge of nAbove.edgesIn) {
                    edge.source.edgeCount++;
                    edge.source.edgeColumnTotal += nAbove.column;
                }
            }
        }
        else {
            for (let nBelow of referenceLayer) {
                for (let edge of nBelow.edgesOut) {
                    edge.target.edgeCount++;
                    edge.target.edgeColumnTotal += nBelow.column;
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
    
    /*//Debug print
    for (let i = 0; i <= maxLayer; i++) {
        let layer = table[i];
        for (let node of layer) {
            console.log(node);
        }
    }
    */
    
    //Expose table and dimensions.
    this.table = table;
    this.height = maxLayer;
    this.width = 0;
    for (let i = 0; i < table.length; i++) {
        this.width = Math.max(this.width, table[i].length - 1);
    }
    
    //Populate node array.
    this.nodes = [];
    let self = this;
    nodes.forEachEntry(function(name, node) {
        self.nodes.push(node);
    });
    
    for (let node of dummyNodes) {
        this.nodes.push(node);
    }
    
    //Populate edge array.
    this.edges = [];
    for (let node of this.nodes) {
        for (let edge of node.edgesOut) {
            this.edges.push(edge);
        }
    }
};
