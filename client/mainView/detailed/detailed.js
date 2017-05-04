let POST_WIDTH = 0.75;
let POST_HEIGHT = 0.875;

Template.mainDetailedPost.onCreated(function() {
    let instance = this;
    
    let parentView = this.view.parentView;
    while (parentView.templateInstance === undefined) {
        parentView = parentView.parentView;
    }
    this.parent = parentView.templateInstance();
    
    //Automatically update data with content, title, user data, etc.
    this.post = new ReactiveVar();
    this.poster = new ReactiveVar();
    let onSubReady = new Notifier();
    this.onRendered = new Notifier();
    
    this.subscribe('post', this.data._id, this.data.poster, {onReady: onSubReady.fulfill});
    
    Notifier.all(onSubReady, this.onRendered).onFulfilled(function() {
        //Populate post data.
        instance.post.set(Posts.findOne({_id: instance.data._id}));
        instance.poster.set(Meteor.users.findOne({_id: instance.data.poster}));
        
        //Fade out spinner and fade in actual post.
        instance.div.children('.main-detailed-post-spinner').fadeOut(100);
        instance.div.children('.main-detailed-post-flex')
            .css('display', 'flex')
            .hide()
            .fadeIn(200);
    });
});

Template.mainDetailedPost.onRendered(function() {
    this.div = $('#main-detailed-post-' + this.data._id);
    this.div.fadeIn(200);
    setTimeout(this.onRendered.fulfill, 250);
});

Template.mainDetailedPost.helpers({
    post: function() {
        return Template.instance().post.get();
    },
    poster: function() {
        return Template.instance().poster.get();
    },
    age: function() {
        let post = Template.instance().post.get();
        if (post) {
            return new Date(post.postedOn).toDateString();
        }
    },
    hasReplyButton: function() {
        return Template.instance().parent.replyTarget.get() === undefined;
    }
});

Template.mainDetailedPost.events({
    'mousedown, touchstart, mousemove, touchmove, mouseup, touchend, wheel': function(event, instance) {
        if (instance.parent.camera.isDragging()) {
            //Prevents interaction while dragging.
            event.preventDefault();
        }
        else {
            //Prevent events from passing through posts into the WebGL canvas.
            event.stopImmediatePropagation();
        }
    }
});

MainViewDetailedPosts = function(camera, partitioner) {
    let self = this;
    
    //Collection of currently visible detailed posts.
    let visiblePosts = new Mongo.Collection(null);
    let visiblePostsCursor = visiblePosts.find({});
    
    let remove = function(post) {
        let div = $('#main-detailed-post-' + post._id);
        div.fadeOut(200, function() {
            visiblePosts.remove(post);
        });
    };
    
    this.init = function(postArray) {
    };
    
    this.addPost = function(post) {
    };
    
    this.removePost = function(post) {
    };
    
    this.updatePostPosition = function(id, pos) {
        visiblePosts.update({_id: id}, {$set: {defaultPosition: pos}});
    };
    
    this.update = function() {
        if (camera.getScale() < 256.0) {
            //Remove all posts if zoomed too far out.
            visiblePostsCursor.forEach(remove);
        }
        else {
            //Remove posts which are no longer visible.
            visiblePostsCursor.forEach(function(post) {
                if (!camera.isPointVisible(post.defaultPosition)) {
                    remove(post);
                }
            });
            
            //Add posts which are newly visible.
            let visible = partitioner.getVisible();
            for (let post of visible) {
                if (!visiblePosts.findOne({_id: post._id})) {
                    visiblePosts.insert(post);
                }
            }
        }
        
        //Update post positions/sizes.
        visiblePostsCursor.forEach(function(post) {
            let div = $('#main-detailed-post-' + post._id);
            let pos = camera.toScreen(post.defaultPosition);
            div.width(POST_WIDTH*camera.getScale());
            div.css('max-height', POST_HEIGHT*camera.getScale());
            div.css('left', pos.x - div.outerWidth()/2);
            div.css('top', pos.y - div.outerHeight()/2);
        });
    };
    
    this.find = function() {
        return visiblePostsCursor;
    };
};

Template.mainDetailedPostReplyButton.onCreated(function() {
    let parentView = this.view.parentView;
    while (parentView.templateInstance === undefined) {
        parentView = parentView.parentView;
    }
    this.parent = parentView.templateInstance();
});

Template.mainDetailedPostReplyButton.events({
    'click': function(event, instance) {
        //Our parent is a mainDetailedPost, and its parent is the mainView.
        instance.parent.parent.replyTarget.set(instance.parent.post.get());
    }
});
