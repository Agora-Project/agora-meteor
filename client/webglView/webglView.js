/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Template.webglView.onCreated(function() {
    let subscription = this.subscribe('abstractPosts', Date.now());
    let template = this;
    
    this.autorun(function() {
        if (subscription.ready()) {
            let posts = Posts.find({});
            
            posts.observe({
                added: function(post) {
                },
                removed: function(post) {
                }
            });
        }
    });
});

Template.webglView.onRendered(function() {
    let renderer = new WebGLRenderer($(".gl-viewport"));
    renderer.begin();
});

Template.webglView.onDestroyed(function() {
    renderer.destroy();
});
