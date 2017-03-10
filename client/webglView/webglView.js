/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Template.webglView.onCreated(function() {
    let instance = this;
    this.onRendererReady = new Notifier();
    let onSubReady = new Notifier();
    
    this.subscribe('abstractPosts', {onReady: onSubReady.fulfill});
    
    Notifier.all(onSubReady, this.onRendererReady).onFulfilled(function() {
        instance.postObserver = Posts.find({}).observe({
            added: function(post) {
                instance.renderer.addPost(post);
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
    this.postObserver.stop();
});
