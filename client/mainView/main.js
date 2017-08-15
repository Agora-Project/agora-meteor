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

    let localPostPositions = new Mongo.Collection(null);

    //Declare modules
    this.layout = new MainViewLayout(localPostPositions);
    this.camera = new MainViewCamera(localPostPositions);
    this.partitioner = new MainViewPartitioner(this.camera, localPostPositions);
    this.renderer = new MainViewRenderer(this.camera, localPostPositions);
    this.detailedPosts = new MainViewDetailedPosts(this.camera, this.partitioner, localPostPositions);
    let modules = [this.layout, this.camera, this.partitioner, this.renderer, this.detailedPosts];

    Template.body.camera = this.camera;

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

        instance.userObserver = Meteor.users.find({_id: Meteor.userId()}).observeChanges({
            changed: function(id, fields) {
                if (!fields.seenPosts) return;
                for (let postID of fields.seenPosts)
                    instance.renderer.seePost(postID);
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

        instance.autorun(
            function() {
                let post = Posts.findOne(Iron.controller().state.get('postID'), {fields: {'defaultPosition':1}});
                if (post) {
                    instance.camera.goToPos(post.defaultPosition);
                }
                return;
            }
        );
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
    showFullPosts: function() {
        return Template.instance().detailedPosts.showFullPosts.get();
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
        event.preventDefault();
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
        event.preventDefault();
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
        event.preventDefault();
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
        event.preventDefault();
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
    if (this.postObserver) this.postObserver.stop();
    if(this.changeObserver) this.changeObserver.stop();
    this.isDestroyed = true;
});

Template.mainZoomControl.getParents();

Template.mainZoomControl.onRendered(function() {
    this.slider = $('#main-zoom-control-slider');
    let instance = this;
    this.parent.camera.onZoom(function(camera) {
        instance.slider.val(camera.getZoomFraction()*100.0);
    });
});

Template.mainZoomControl.events({
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
    },
    "click #main-zoom-plus-button": function() {
        let instance = Template.instance();
        instance.parent.camera.setZoomFraction(instance.parent.camera.getZoomFraction() + 0.01);
    },
    "click #main-zoom-minus-button": function() {
        let instance = Template.instance();
        instance.parent.camera.setZoomFraction(instance.parent.camera.getZoomFraction() - 0.01);
    },
    "click #main-zoom-up-button": function() {
        let instance = Template.instance();
        instance.parent.camera.buttonPressed("ButtonUp");
    },
    "click #main-zoom-down-button": function() {
        let instance = Template.instance();
        instance.parent.camera.buttonPressed("ButtonDown");
    },
    "click #main-zoom-left-button": function() {
        let instance = Template.instance();
        instance.parent.camera.buttonPressed("ButtonLeft");
    },
    "click #main-zoom-right-button": function() {
        let instance = Template.instance();
        instance.parent.camera.buttonPressed("ButtonRight");
    },
    "keydown #main-zoom-control-slider": function(e, data, tpl) {
        // e -> jquery event
        // data -> Blaze data context of the DOM element triggering the event handler
        // tpl -> the parent template instance for the target element

        if (e.key.startsWith("Arrow")) {
            e.stopImmediatePropagation();
        } else if (e.key == "-") {
            let instance = Template.instance();
            instance.parent.camera.setZoomFraction(instance.parent.camera.getZoomFraction() - 0.01);
        } else if (e.key == "+") {
            let instance = Template.instance();
            instance.parent.camera.setZoomFraction(instance.parent.camera.getZoomFraction() + 0.01);
        }
    },
    "keyup #main-zoom-control-slider": function(e, data, tpl) {
        // e -> jquery event
        // data -> Blaze data context of the DOM element triggering the event handler
        // tpl -> the parent template instance for the target element

        if (e.key.startsWith("Arrow")) {
            e.stopImmediatePropagation();
        } else if (e.key == "-" || e.key == "+") {
            Template.body.camera.keyReleased(e.key);
        }
    }
});

//code for catching key events globally.
Template.body.events({
    "keydown": function(e, data, tpl) {
        // e -> jquery event
        // data -> Blaze data context of the DOM element triggering the event handler
        // tpl -> the parent template instance for the target element

        if (e.key.startsWith("Arrow") || e.key == "-" || e.key == "+") {
            Template.body.camera.keyPressed(e.key);
        }
    },
    "keyup": function(e, data, tpl) {
        // e -> jquery event
        // data -> Blaze data context of the DOM element triggering the event handler
        // tpl -> the parent template instance for the target element

        if (e.key.startsWith("Arrow") || e.key == "-" || e.key == "+") {
            Template.body.camera.keyReleased(e.key);
        }
    }
})
