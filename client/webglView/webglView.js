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
    
    this.renderer = new WebGLRenderer($('.gl-viewport'));
    this.renderer.begin();
    this.onRendererReady.fulfill();
    
    $(window).resize(function() {
        instance.renderer.resize();
    });
});

Template.webglView.events({
    'mousedown, touchstart': function(event, instance) {
    },
    'mouseup, mouseout, touchend': function(event, instance) {
    },
    'mousemove, touchmove': function(event, instance) {
        //console.log(event.offsetX + " " + event.offsetY);
    },
    'wheel': function(event, instance) {
        //event.originalEvent.deltaY
    }
});

Template.webglView.onDestroyed(function() {
    this.postObserver.stop();
    this.renderer.stop();
    $(window).off('resize');
});
