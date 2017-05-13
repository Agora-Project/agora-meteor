let POST_WIDTH = 0.75;
let POST_HEIGHT = 0.875;

Template.mainDetailedPost.onCreated(function() {
    let instance = this;

    let parentView = this.view.parentView;
    while (parentView.templateInstance === undefined) {
        parentView = parentView.parentView;
    }
    this.parent = parentView.templateInstance();
    
    let onSubReady = new Notifier();
    this.onRendered = new Notifier();

    this.subscribe('post', this.data._id, this.data.poster, {onReady: onSubReady.fulfill});

    Notifier.all(onSubReady, this.onRendered).onFulfilled(function() {
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
    this.div.css('display', 'flex').hide().fadeIn(200);
    setTimeout(this.onRendered.fulfill, 250);
});

Template.mainDetailedPost.helpers({
    poster: function() {
        let post = Template.currentData();
        return Meteor.users.findOne({_id: post.poster});
    },
    age: function() {
        let post = Template.currentData();
        if (post.postedOn) {
            return new Date(post.postedOn).toDateString();
        }
    },
    content: function() {
        let rawContent = Template.currentData().content;
        if (rawContent) {
            return XBBCODE.process({
                text: rawContent,
                removeMisalignedTags: false,
                addInLineBreaks: true
            }).html;
        }
    },
    editAccess: function() {
        return this.poster === Meteor.userId() || Roles.userIsInRole(Meteor.userId(), ['moderator']);
    },
    moderator: function() {
        return Roles.userIsInRole(Meteor.userId(), ['moderator']);
    },
    hasReplyButtons: function() {
        return !Template.instance().parent.isReplyBoxOpen();
    },
    hasReportButton: function() {
        return Template.instance().parent.reportTarget.get() === undefined;
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

    this.init = function(postArray) {
    };

    this.addPost = function(post) {
    };

    this.removePost = function(post) {
        let div = $('#main-detailed-post-' + post._id);
        div.fadeOut(200, function() {
            visiblePosts.remove({_id: post._id});
        });
    };

    this.updatePost = function(id, fields) {
        visiblePosts.update({_id: id}, {$set: fields});
    };

    this.update = function() {
        if (camera.getScale() < 256.0) {
            //Remove all posts if zoomed too far out.
            visiblePostsCursor.forEach(self.removePost);
        }
        else {
            //Remove posts which are no longer visible.
            visiblePostsCursor.forEach(function(post) {
                if (!camera.isPointVisible(post.defaultPosition)) {
                    self.removePost(post);
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
        instance.parent.parent.replyTarget.set(instance.parent.data);
    }
});

Template.mainDetailedPostEditButton.onCreated(function() {
    let parentView = this.view.parentView;
    while (parentView.templateInstance === undefined) {
        parentView = parentView.parentView;
    }
    this.parent = parentView.templateInstance();
});

Template.mainDetailedPostEditButton.events({
    'click': function(event, instance) {
        //Our parent is a mainDetailedPost, and its parent is the mainView.
        instance.parent.parent.editTarget.set(instance.parent.data);
    }
});

Template.mainDetailedPostReportButton.onCreated(function() {
    let parentView = this.view.parentView;
    while (parentView.templateInstance === undefined) {
        parentView = parentView.parentView;
    }
    this.parent = parentView.templateInstance();
});

Template.mainDetailedPostReportButton.events({
    'click': function(event, instance) {
        //Our parent is a mainDetailedPost, and its parent is the mainView.
        instance.parent.parent.reportTarget.set(instance.parent.data);
    }
});

Template.mainDetailedPostDeleteButton.onCreated(function() {
    let parentView = this.view.parentView;
    while (parentView.templateInstance === undefined) {
        parentView = parentView.parentView;
    }
    this.parent = parentView.templateInstance();
});

Template.mainDetailedPostDeleteButton.events({
    'click': function(event, instance) {
        //Our parent is a mainDetailedPost, and its parent is the mainView.
        if (confirm("Are you sure you want to delete this post?")) {
            Meteor.call('deletePost', instance.parent.data._id);
        }
    }
});
