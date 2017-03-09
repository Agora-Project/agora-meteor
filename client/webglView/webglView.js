/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Template.webglView.onCreated(function() {
    let instance = this;
    
    this.subscribe('abstractPosts', {
        onReady: function() {
        }
    });
    
    Posts.find({}).observe({
        added: function(post) {
        },
        removed: function(post) {
        }
    });
});

Template.webglView.onRendered(function() {
    this.renderer = new WebGLRenderer($(".gl-viewport"));
    this.renderer.begin();
});

Template.webglView.onDestroyed(function() {
    this.renderer.destroy();
    delete this.renderer;
});
