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
  if (post) tree.addNode(post);
};
nodesInGraph.remove = function(_id) {
  if (!this.ids[_id]) return false;
  this.ids[_id] = false;
  return true;
};

nodeIDMap = {map: {}, reverseMap: {}, count:0};
nodeIDMap.add = function(_id) {
  if (!this.map[_id]) {
    this.map[_id] = this.count;
    this.reverseMap[this.count] = _id;
    this.count++;
  }
  return this.map[_id];
}
nodeIDMap.get = function(_id) {
  return this.map[_id];
}
nodeIDMap.getReverse = function(id) {
  return this.reverseMap[id];
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
