nodesInGraph = new Mongo.Collection(null);

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
