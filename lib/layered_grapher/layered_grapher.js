//Directed acyclic graph class, for input into LayeredGraph.
function DAG() {
    //Does a strict check to ensure no cycles are created in this graph.
    //Will reduce performance, especially on larger graphs.
    let ENSURE_NO_CYCLES = true;
    
    let self = this;
    this.vertices = {};
    
    let isObjectEmpty = function(obj) {
        for (let key in obj) {
            return false;
        }
        return true;
    };
    
    let Vertex = function(name) {
        let self = this;
        
        this.name = name;
        this.vertsIn = {};
        this.vertsOut = {};
        
        this.isSource = function() {
            return isObjectEmpty(self.vertsIn);
        };
        
        this.isSink = function() {
            return isObjectEmpty(self.vertsOut);
        };
    };
    
    //Adds the given vertex to this graph, returning true if the vertex did not already exist or false otherwise.
    this.addVertex = function(name) {
        if (name in self.vertices) return false;
        
        self.vertices[name] = new Vertex(name);
        return true;
    };
    
    //Returns whether a vertex exists in this graph with the given name.
    this.containsVertex = function(name) {
        return name in self.vertices;
    };
    
    //Removes the given vertex from this graph and returns true, or returns false if no such vertex exists.
    //Also removes any links which reference the given vertex.
    this.removeVertex = function(name) {
        if (!self.containsVertex(name)) return false;
        
        let v = self.vertices[name];
        for (let end in v.vertsOut) delete self.vertices[end].vertsIn[name];
        for (let start in v.vertsIn) delete self.vertices[start].vertsOut[name];
        
        delete self.vertices[name];
        return true;
    };
    
    let wouldCreateCycle = function(vStart, vEnd) {
        let visited = {};
        let frontier = {};
        frontier[vEnd.name] = vEnd;
        
        //Start at end vertex and traverse graph, checking if we can reach the start from the end.
        while (!isObjectEmpty(frontier)) {
            let newFrontier = {};
            
            for (let name in frontier) {
                let current = frontier[name];
                visited[name] = current;
                
                for (let out in current.vertsOut) {
                    let vOut = current.vertsOut[out];
                    
                    if (vOut === vStart) {
                        return true;
                    }
                    
                    if (!(out in visited)) {
                        newFrontier[out] = vOut;
                    }
                }
            }
            
            frontier = newFrontier;
        }
        
        return false;
    };
    
    //Adds the given edge to this graph, returning true if the edge did not already exist or false otherwise.
    //Throws an exception if the given nodes do not both exist.
    //Throws an exception upon trying to add a edge that would make this graph cyclic.
    this.addEdge = function(start, end) {
        if (!self.containsVertex(start)) throw new Error("No such vertex '" + start + "'");
        if (!self.containsVertex(end)) throw new Error("No such vertex '" + end + "'");
        
        let vStart = self.vertices[start];
        let vEnd = self.vertices[end];
        
        if (end in vStart.vertsOut) {
            return false;
        }
        
        if (ENSURE_NO_CYCLES && wouldCreateCycle(vStart, vEnd)) {
            throw new Error("An edge from '" + start + "' to '" + end + "' would create a cycle");
        }
        
        vStart.vertsOut[end] = vEnd;
        vEnd.vertsIn[start] = vStart;
        return true;
    };
    
    //Returns whether an edge exists in this graph between the given vertices.
    this.containsEdge = function(start, end) {
        return self.containsVertex(start) && end in start.vertsOut;
    };
    
    //Removes the given edge from this graph and returns true, or returns false if no such edge exists.
    this.removeEdge = function(start, end) {
        if (!self.containsVertex(start) || !self.containsVertex(end)) return false;
        
        let vStart = self.vertices[start];
        let vEnd = self.vertices[end];
        
        if (!(end in vStart.vertsOut)) {
            return false;
        }
        
        delete vStart.vertsOut[end];
        delete vEnd.vertsIn[start];
        return true;
    };
    
    //Performs the given function on the vertex names of each edge in this graph.
    this.forEachEdge = function(edgeConsumer) {
        for (let start in self.vertices) {
            let vStart = self.vertices[start];
            for (let end in vStart.vertsOut) edgeConsumer(start, end);
        }
    };
};

function LayeredGraph(dag) {
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
    
    let nodes = {};
    for (let name in dag.vertices) {
        nodes[name] = new Node(dag.vertices[name]);
    };
    
    let isObjectEmpty = function(obj) {
        for (let key in obj) {
            return false;
        }
        return true;
    };
    
    //Assign layers based on topological depth.
    {
        let frontier = {};
        
        //Start with sources.
        for (let name in nodes) {
            node = nodes[name];
            if (node.vertex.isSource()) {
                frontier[name] = node;
            }
        }
        
        //Traverse graph.
        while (!isObjectEmpty(frontier)) {
            let newFrontier = {};
            
            for (let current in frontier) {
                let nCurrent = nodes[current];
                
                for (let next in nCurrent.vertex.vertsOut) {
                    let nNext = nodes[next];
                    nNext.layer = Math.max(nCurrent.layer + 1, nNext.layer);
                    newFrontier[next] = nNext;
                }
            }
            
            frontier = newFrontier;
        }
    }
    
    let maxLayer = 0;
    for (let name in nodes) {
        maxLayer = Math.max(maxLayer, nodes[name].layer);
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
    for (let name in nodes) {
        insertNode(nodes[name]);
    }
    
    //Generate edges and dummy nodes.
    let Edge = function(start, end) {
        this.start = start;
        this.end = end;
        
        start.edgesOut.push(this);
        end.edgesIn.push(this);
    };
    
    let dummyNodes = [];
    
    for (let start in nodes) {
        let nStart = nodes[start];
        
        for (let end in nStart.vertex.vertsOut) {
            let nDummyStart = nStart;
            let nEnd = nodes[end];
            
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
        }
    }
    
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
                    edge.start.edgeCount++;
                    edge.start.edgeColumnTotal += nAbove.column;
                }
            }
        }
        else {
            for (let nBelow of referenceLayer) {
                for (let edge of nBelow.edgesOut) {
                    edge.end.edgeCount++;
                    edge.end.edgeColumnTotal += nBelow.column;
                }
            }
        }
        
        for (let node of layerToSift) {
            node.edgeAvgColumn = node.edgeColumnTotal/node.edgeCount;
        }
        
        layerToSift.sort(function(a, b) {
            return b.column - a.column;
        });
        
        for (let i = 0; i < layerToSift.length; i++) {
            layerToSift[i].column = i;
        }
    }
    
    //Sift from bottom to top.
    for (let i = 1; i <= maxLayer; i++)
        siftLayer(table[i], table[i - 1], false);

    //Then sift again from top to bottom.
    for (let i = maxLayer - 1; i >= 0; i--)
        siftLayer(table[i], table[i + 1], true);
    
    //Populate node array.
    this.nodes = [];
    
    for (let name in nodes) {
        this.nodes.push(nodes[name]);
    }
    
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
