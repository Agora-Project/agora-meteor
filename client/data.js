nodesInGraph = new Mongo.Collection(null);

handlers = {};
handlers.addHandler = function(id, callbacks) {
    if (!id) id = "rootNode";
    if (!callbacks) callbacks = {};
    if (!this[id]) {
        var handler = Meteor.subscribe("forum", id, callbacks);
        this[id] = handler;
        return true;
    }
    else  {
        if (callbacks.onReady) callbacks.onReady();
        return this[id];
    }
}
handlers.stop = function(node) {
    if (node.isRoot) {
        this['rootNode'].stop();
        delete this['rootNode'];
        console.log(node);
    }
    if (this[node._id]) {
        this[node._id].stop();
        delete this[node._id];
        console.log(node);
    }
    if (this[node]) {
        this[node].stop();
        delete this[node];
        console.log(node);
    }
}
handlers.addHandler();
