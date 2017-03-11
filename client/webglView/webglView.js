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
    let instance = this;
    
    let canvas = $('.gl-viewport');
    this.camera = new Camera(canvas);
    this.renderer = new WebGLRenderer(canvas, this.camera);
    this.renderer.begin();
    this.onRendererReady.fulfill();
    
    $(window).resize(function() {
        instance.camera.resize();
        instance.renderer.resize();
    });
});

Template.webglView.events({
    'mousedown, touchstart': function(event, instance) {
        let mp = {x:event.offsetX, y:event.offsetY};
        instance.camera.mouseDown(mp);
    },
    'mousemove, touchmove': function(event, instance) {
        let mp = {x:event.offsetX, y:event.offsetY};
        instance.camera.mouseMove(mp);
    },
    'mouseup, mouseout, touchend': function(event, instance) {
        let mp = {x:event.offsetX, y:event.offsetY};
        instance.camera.mouseUp(mp);
    },
    'wheel': function(event, instance) {
        instance.camera.mouseWheel(event.originalEvent.deltaY);
    }
});

Template.webglView.onDestroyed(function() {
    this.postObserver.stop();
    this.renderer.stop();
    $(window).off('resize');
});
