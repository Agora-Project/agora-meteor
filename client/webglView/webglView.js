/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Template.webglView.onCreated(function() {
    let instance = this;
    this.onSubReady = new Notifier();
    this.onRendererReady = new Notifier();
    
    this.subscribe('abstractPosts', {onReady: this.onSubReady.fulfill});
    
    Notifier.all(this.onSubReady, this.onRendererReady).onFulfilled(function() {
        Posts.find({}).observe({
            added: function(post) {
            },
            removed: function(post) {
            }
        });
    });
});

Template.webglView.onRendered(function() {
    this.renderer = new WebGLRenderer($(".gl-viewport"));
    this.renderer.begin();
    this.onRendererReady.fulfill();
});

Template.webglView.onDestroyed(function() {
    this.renderer.stop();
});
