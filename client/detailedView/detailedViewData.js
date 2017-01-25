/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

handlers = {};
handlers.addHandler = function(id, callbacks) {
    if (!id) id = "rootNode";
    if (!callbacks) callbacks = {};
    if (!this[id]) {
        var handler = Meteor.subscribe("post", id, callbacks);
        this[id] = handler;
        return true;
    }
    else  {
        if (callbacks.onReady) callbacks.onReady();
        return this[id];
    }
}
handlers.stop = function(node) {
    if (this[node]) {
        this[node].stop();
        delete this[node];
        return;
    }
    if (node.links && node.links.length < 1) {
        this['rootNode'].stop();
        delete this['rootNode'];
        return;
    }
    if (this[node._id]) {
        this[node._id].stop();
        delete this[node._id];
        return;
    }
}
