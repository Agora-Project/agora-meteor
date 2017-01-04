//--------------------------------HELPER OBJECTS--------------------------------

//An object that maps keys to values.  A map cannot contain duplicate keys; each
//key can map to at most one value. Keys and values are compared by identity,
//not equality. This is useful in cases where specific instances of objects are
//to be stored or associated. Almost anything may be used as a key or value,
//including primitives, null, undefined, arrays, objects, or functions. The only
//exception is NaN, which may never be used as a key.
function IdentityMap() {
    let keys = [];
    let values = [];
    
    //Returns the number of key-value mappings in this identity map.
    this.size = function() {
        return keys.length;
    };
    
    //Returns true if this map contains no key-value mappings.
    this.isEmpty = function() {
        return keys.length === 0;
    };
    
    //Tests whether the specified object reference is a key in this identity
    //map.
    this.containsKey = function(key) {
        return keys.indexOf(key) !== -1;
    };
    
    //Tests whether the specified object reference is a value in this identity
    //map.
    this.containsValue = function(value) {
        return values.indexOf(value) !== -1;
    };
    
    //Returns the value to which the specified key is mapped, or null if this
    //map contains no mapping for the key. A return value of null does not
    //necessarily indicate that the map contains no mapping for the key; it's
    //also possible that the map explicitly maps the key to null.
    this.get = function(key) {
        let index = keys.indexOf(key);
        
        if (index === -1) {
            return null;
        }
        
        return values[index];
    };
    
    //Associates the specified value with the specified key in this identity
    //map. If the map previously contained a mapping for the key, the old value
    //is replaced and returned. Otherwise, null is returned. A null return can
    //also indicate that the map previously associated the key with null. Note
    //that NaN may not be used as a key, as it has no identity by definition.
    this.put = function(key, value) {
        if (key !== key) {
            return null; //Key is NaN.
        }
        
        let index = keys.indexOf(key);
        
        if (index !== -1) {
            let oldValue = values[index];
            values[index] = value;
            return oldValue;
        }
        
        keys.push(key);
        values.push(value);
        return null;
    };
    
    //Removes and returns the mapping for this key from this map if present.
    //Returns null if no such mapping existed. A null return can also indicate
    //that the map previously associated the key with null.
    this.remove = function(key) {
        let index = keys.indexOf(key);
        
        if (index === -1) {
            return null;
        }
        
        let oldValue = values[index];
        keys.splice(index, 1);
        values.splice(index, 1);
        return oldValue;
    };
    
    //Removes all of the mappings from this map.
    this.clear = function() {
        keys = [];
        values = [];
    };
    
    //Performs the given action for each key-value pair in this identity map
    //until all entries have been processed.
    this.forEachEntry = function(action) {
        let size = keys.length;
        for (let i = 0; i < size; i++) {
            action(keys[i], values[i]);
        }
    };
}

//A collection that contains no identical elements.
function IdentitySet() {
    //This is exposed so we can iterate over it easily. Do not modify.
    this.elements = [];
    
    //Returns the number of elements in this identity set.
    this.size = function() {
        return this.elements.length;
    };
    
    //Returns true if this set contains no elements.
    this.isEmpty = function() {
        return this.elements.length === 0;
    };
    
    //Tests whether the specified object is an element in this identity set.
    this.contains = function(obj) {
        return this.elements.indexOf(obj) !== -1;
    };
    
    //Adds the specified element to this set, and returns true if it is not
    //already present.
    this.add = function(element) {
        if (element !== element) {
            return false; //Element is NaN.
        }
        
        if (this.elements.indexOf(element) !== -1) {
            return false;
        }
        
        this.elements.push(element);
        return true;
    };
    
    //Removes the specified element from this set and returns true, if it is
    //an element in this set.
    this.remove = function(element) {
        let index = keys.indexOf(element);
        if (index === -1) {
            return false;
        }
        
        this.elements.splice(index, 1);
        return true;
    };
    
    //Removes all of the mappings from this map.
    this.clear = function() {
        this.elements = [];
    };
    
    //Performs the given action for each element in this identity set until all
    //entries have been processed.
    this.forEach = function(action) {
        for (let element of this.elements) {
            action(element);
        }
    };
}

//Directed acyclic graph class, for input into LayeredGraph.
function DAG() {
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

//TODO, fix the following

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
    
    let nodes = new IdentityMap();
    dag.vertices.forEachEntry(function(name, vertex) {
        nodes.put(name, new Node(vertex));
    });
    
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

/* //Test code
let a = "A";
let b = "B";
let c = "C";

let dag = new DAG();
dag.addVertex(a);
dag.addVertex(a);
dag.addVertex(b);
dag.addVertex(c);
dag.addEdge(a, b);
dag.addEdge(b, c);
dag.addEdge(a, c);

let layout = new LayeredGraph(dag);
*/
