nodesInGraph = {ids: {}};
nodesInGraph.contains = function(node) {
    return (node.isRoot || this.ids[node._id]);
};
nodesInGraph.containsID = function(_id) {
    return (this.ids[_id] || (Post.findOne({_id: _id}) && Post.findOne({_id: _id}).isRoot));
};
nodesInGraph.add = function(_id) {
    this.ids[_id] = true;
    var post = Post.findOne({_id: _id});
    if (post && tree) tree.addNode(post);
    Link.find({sourceId: _id}).fetch().forEach(function(link) {
        //nodesInGraph.add(link.targetId);
        handlers.addHandler(link.targetId);

    });
    Link.find({targetId: _id}).fetch().forEach(function(link) {
        //nodesInGraph.add(link.sourceId);
        handlers.addHandler(link.sourceId);
    });
};
nodesInGraph.remove = function(_id) {
    if (!this.ids[_id]) return false;
    this.ids[_id] = false;
    return true;
};

nodeIDMap = {map: {}, reverseMap: {}, count:0};
nodeIDMap.add = function(node) {
    if (node._id) {
        if (!this.map[node._id]) {
            this.map[node._id] = this.count;
            this.reverseMap[this.count] = node._id;
            node.id = this.count;
            this.count++;
        }
        node.id = this.map[node._id];
        return this.map[node._id];
    } else {
        console.log("Whooops!");
    }
}
nodeIDMap.get = function(n) {
    if (n._id) return this.map[n._id];
    else return this.map[n];
}
nodeIDMap.getReverse = function(node) {
    return this.reverseMap[node.id];
}

handlers = {};
handlers.addHandler = function(id) {
    if (!id) id = "rootNode";
    if (!this[id]) {
        if (id === "rootNode") var handler = Meteor.subscribe("forum");
        else var handler = Meteor.subscribe("forum", id);
        this[id] = handler;
    }
}
handlers.stop = function(node) {
    if (node.isRoot) {
        this['rootNode'].stop();
        delete this['rootNode'];
    }
    if (this[node._id]) {
        this[node._id].stop();
        delete this[node._id];
    }
}
handlers.addHandler();
