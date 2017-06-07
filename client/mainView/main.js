/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

/**
 * The main view consists of the following basic modules:
 *
 *    * Main Module (main.js)
 *          This file; the primary entry-point and handler for the other four modules.
 *          Callbacks are mostly set up and destroyed in this module.
 *
 *    * Camera (camera.js)
 *          Stores client view state (position, zoom, screen boundaries).
 *          Also handles camera input.
 *
 *    * Partitioner (partitioner.js)
 *          An optimization module. Exposes a number of efficient spatial queries.
 *          Depends on the camera.
 *
 *    * Renderer (renderer.js)
 *          Handles the WebGL context and performs canvas rendering.
 *          Depends on the camera.
 *
 *    * Detailed Posts (detailed/detailed.js)
 *          Handles the creation of template-based HTML posts.
 *          These detailed posts appear when the camera is sufficiently zoomed.
 *          Depends on the camera and partitioner.
 *
 *    * Reply (reply/reply.js)
 *          Handles the reply box and related code.
 *
 *    * Edit (edit/edit.js)
 *          Handles the edit box and related code.
 *
 *    * Report (report/report.js)
 *          Handles the report box and related code.
 *
 */

Template.mainView.onCreated(function() {
    let instance = this;

    //Declare modules.
    this.camera = new MainViewCamera();
    this.partitioner = new MainViewPartitioner(this.camera);
    this.renderer = new MainViewRenderer(this.camera);
    this.detailedPosts = new MainViewDetailedPosts(this.camera, this.partitioner);
    let modules = [this.camera, this.partitioner, this.renderer, this.detailedPosts];

    //Set up async notifiers.
    this.onRendered = new Notifier();
    let onSubReady = new Notifier();

    this.subscribe('abstractPosts', {onReady: onSubReady.fulfill});
    this.replyTarget = new ReactiveVar();
    this.editTarget = new ReactiveVar();
    this.reportTarget = new ReactiveVar();
    this.isSizeDirty = true;

    this.isReplyBoxOpen = function() {
        return instance.replyTarget.get() !== undefined || instance.editTarget.get() !== undefined;
    };

    Notifier.all(onSubReady, this.onRendered).onFulfilled(function() {
        //Perform initial setup.
        let postCursor = Posts.find({});
        let initPostArray = postCursor.fetch();

        for (let module of modules) {
            module.init(initPostArray);
        }

        //Callback for added/removed posts.
        let isLive = false;
        instance.postObserver = postCursor.observe({
            added: function(post) {
                if (isLive) {
                    for (let module of modules) {
                        module.addPost(post);
                    }
                }
            },
            removed: function(post) {
                for (let module of modules) {
                    module.removePost(post);
                }
            }
        });
        isLive = true;

        //Callback for changed post positions.
        instance.changeObserver = postCursor.observeChanges({
            changed: function(id, fields) {
                for (let module of modules) {
                    module.updatePost(id, fields);
                }
            }
        });

        let t0 = performance.now();

        //Begin rendering.
        let render = function() {
            if (instance.isDestroyed) {
                return;
            }

            let t1 = performance.now();
            let dt = (t1 - t0)/1000.0;

            instance.canvas[0].width = instance.canvas.width();
            instance.canvas[0].height = instance.canvas.height();

            instance.camera.step(dt);
            instance.renderer.render();
            instance.detailedPosts.update();
            window.requestAnimationFrame(render);
            t0 = t1;
        };

        window.requestAnimationFrame(render);
    });
});

Template.mainView.onRendered(function() {
    let instance = this;

    //Initialize everything that depends on the canvas existing.
    let canvas = $('#main-viewport');

    this.canvas = canvas;
    this.camera.construct(canvas);
    this.renderer.construct(canvas);
    this.onRendered.fulfill();

    this.getMousePos = function(event) {
        return {x:event.pageX, y:event.pageY - canvas.offset().top};
    };

    this.getTouchPos = function(event) {
        let ret = [];
        for (touch of event.touches) {
            ret.push({x: touch.pageX, y: touch.pageY - canvas.offset().top})
        }
        return ret;
    }
});

Template.mainView.helpers({
    detailedPosts: function() {
        return Template.instance().detailedPosts.find();
    },
    replyTarget: function() {
        return (Template.instance().replyTarget.get() || Template.instance().editTarget.get());
    },
    reportTarget: function() {
        return Template.instance().reportTarget.get();
    }
});

Template.mainView.events({
    'mousedown': function(event, instance) {
        if (instance.camera) {
            instance.camera.mouseDown(instance.getMousePos(event), event.button);
        }
    },
    'touchstart': function(event, instance) {
        var touches = instance.getTouchPos(event.originalEvent);
        if (instance.camera) {
            instance.camera.touchStart(touches);
        }
    },
    'mousemove': function(event, instance) {
        if (instance.camera) {
            instance.camera.mouseMove(instance.getMousePos(event));
        }
    },
    'touchmove': function(event, instance) {
        var touches = instance.getTouchPos(event.originalEvent);
        if (instance.camera) {
            instance.camera.touchMove(touches);
        }
    },
    'mouseup': function(event, instance) {
        if (instance.camera) {
            instance.camera.mouseUp(instance.getMousePos(event), event.button);
        }
    },
    'touchend': function(event, instance) {
        var touches = instance.getTouchPos(event.originalEvent);
        if (instance.camera) {
            instance.camera.touchEnd(touches);
        }
    },
    'mouseleave': function(event, instance) {
        //Stop dragging if we leave the canvas area. We can't see mouseup events if they are outside of the window.
        if (instance.camera && $('#main-container').is(event.target)) {
            instance.camera.mouseUp(instance.getMousePos(event), 0);
        }
    },
    'touchleave': function(event, instance) {
        var touches = instance.getTouchPos(event.originalEvent);
        if (instance.camera && $('#main-container').is(event.target)) {
            instance.camera.touchEnd(touches);
        }
    },
    'wheel': function(event, instance) {
        if (instance.camera) {
            //Normalize across browsers.
            //Will not respond properly to very fast scrolling, but whatever.
            instance.camera.mouseWheel(event.originalEvent.deltaY > 0 ? 1.0 : -1.0);
        }
    }
});

Template.mainView.onDestroyed(function() {
    this.postObserver.stop();
    this.changeObserver.stop();
    this.isDestroyed = true;
});

Template.mainZoomSlider.getParents();

Template.mainZoomSlider.onRendered(function() {
    this.slider = $('#main-zoom-slider');
    let instance = this;
    this.parent.camera.onZoom(function(camera) {
        instance.slider.val(camera.getZoomFraction()*100.0);
    });
});

Template.mainZoomSlider.events({
    'mousedown, touchstart, mousemove, touchmove, mouseup, touchend, wheel': function(event, instance) {
        if (instance.parent.camera.isDragging()) {
            //Prevents interaction while dragging.
            event.preventDefault();
        }
        else {
            //Prevent events from passing through posts into the WebGL canvas.
            event.stopImmediatePropagation();
        }
    },
    'input': function() {
        let instance = Template.instance();
        instance.parent.camera.setZoomFraction(instance.slider.val()/100.0);
    }
});
