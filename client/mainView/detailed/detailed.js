/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

let POST_WIDTH = 0.90;
let POST_HEIGHT = 0.90;
let POST_PRECISION = 3;

Template.mainDetailedPost.getParents();

Template.mainDetailedPost.onCreated(function() {
    let instance = this;
    let onSubReady = new Notifier();
    this.onRendered = new Notifier();
    this.seen = new ReactiveVar(true);

    this.subscribe('fullPost', this.data._id, this.data.attributedTo, {onReady: onSubReady.fulfill});

    this.subscribe('abstractReplies', this.data._id);

    this.subscribe('abstractPost', this.data.inReplyTo);

    Notifier.all(onSubReady, this.onRendered).onFulfilled(function() {
        //Fade out spinner and fade in actual post.
        instance.div.children('.main-detailed-post-spinner').fadeOut(100);

        instance.div.children('.main-detailed-post-flex')
            .css('display', 'flex')
            .hide()
            .fadeIn(200);

        if (!postIsSeen(instance.data)) {
            instance.seen.set(false);
            instance.div.addClass('unseen');
            Meteor.call('addSeenPost', instance.data._id);
        }
    });
});

Template.mainDetailedPost.onRendered(function() {
    this.div = $('#main-detailed-post-' + this.data._id);
    this.div.css('display', 'flex').hide().fadeIn(200);
    setTimeout(this.onRendered.fulfill, 250);
});

Template.mainDetailedPost.helpers({
    actor: function() {
        return Actors.findOne({id: this.attributedTo});
    },
    initials: function() {
        return Actors.findOne({id: this.attributedTo}).name[0];
    },
    age: function() {
        let post = Template.currentData();
        if (post.published) {
            return new Date(post.published).toDateString();
        }
    },
    currentUser: function() {
        return (Meteor.user());
    },
    verifiedUser:function() {
        let user = Meteor.user();
        return (user.emails && user.emails.length > 0 && user.emails[0].verified);
    },
    content: function() {
        let rawContent = this.content;
        if (rawContent) {
            return XBBCODE.process({
                text: rawContent,
                removeMisalignedTags: false,
                addInLineBreaks: true
            }).html;
        }
    },
    editAccess: function() {
        return this.attributedTo === Meteor.userId() || Roles.userIsInRole(Meteor.userId(), ['moderator']);
    },
    moderator: function() {
        return Roles.userIsInRole(Meteor.userId(), ['moderator']);
    },
    hasReplyButtons: function() {
        return !Template.instance().parent.isReplyBoxOpen();
    },
    hasReportButton: function() {
        return Template.instance().parent.reportTarget.get() === undefined;
    },
    hasLoadButton: function() {
        let instance = Template.instance();
        let ret = false;
        Posts.find({inReplyTo: this._id}).forEach(function(post) {
            if (!ret && !instance.parent.layout.getPost(post._id)) ret = true;
        })
        if (!ret && this.inReplyTo && !Template.instance().parent.layout.getPost(this.inReplyTo)) ret = true;
        return ret;
    },
    seen: function() {
        return Template.instance().seen.get();
    }
});

Template.mainDetailedPost.events({
    'click .main-detailed-post-close-button': function() {
        Template.instance().parent.removePost(this);
    },
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
    // Sort by position, left to right and then top to bottom
    let visiblePostsCursor = visiblePosts.find({}, {sort: {position: -1}});

    let postPositionHashMap = {};
    this.showFullPosts = new ReactiveVar(false);

    this.init = function(postArray) {};

    this.addPost = function() {};

    this.addVisiblePost = function(post) {

        if (visiblePosts.findOne({_id: post._id})) {
            return;
        }

        visiblePosts.insert(post);
        postPositionHashMap["" + post.position.x + ", " + post.position.y] = post;
    };

    this.removePost = function(post) {
        let div;

        if (self.showFullPosts.get()) {
            div = $('#main-detailed-post-' + post._id);
        } else {
            div = $('#main-basic-post-' + post._id);
        }

        div.fadeOut(200, function() {
            visiblePosts.remove({_id: post._id});
            delete postPositionHashMap["" + post.position.x + ", " + post.position.y];
        });
    };

    this.updatePost = function(id, fields) {
        let post = visiblePosts.findOne({_id: id});

        //If post is not actually visible we don't need to do anything.
        if (!post) return;

        if (fields.position) {
            delete postPositionHashMap["" + post.position.x + ", " + post.position.y];
        }

        if (visiblePosts.findOne({_id: id}))
            visiblePosts.update({_id: id}, {$set: fields});

        post = visiblePosts.findOne({_id: id});
        if (fields.position) {
            postPositionHashMap["" + post.position.x + ", " + post.position.y] = post;
        }
    };

    this.update = function() {
        //switch between showing basic posts and detailed posts.
        if (self.showFullPosts.get()) {
            if (camera.getScale() <= 160) {
                let div = $('.main-detailed-post');

                div.fadeOut(200, function() {
                    self.showFullPosts.set(false);
                });
            }
        } else {
            if (camera.getScale() > 160) {
                let div = $('.main-basic-post');

                div.fadeOut(200, function() {
                    self.showFullPosts.set(true);
                });
            }
        }

        let postVisible = function(post) {
            return (1 + post.replyCount) * camera.getScale() / 100 > 1;
        }

        visiblePostsCursor.forEach(function(post) {
            if (!camera.isPointVisible(post.position) || !postVisible(post)) {
                self.removePost(post);
            }
        });

        //Add posts which are newly visible.
        let visible = partitioner.getVisible();
        for (let post of visible) {
            if (!visiblePosts.findOne({_id: post._id}) && postVisible(post)) {
                self.addVisiblePost(post);
            }
        }

        //If we're zoomed out far enough to show labels
        if (!self.showFullPosts.get()) {

            //sort posts by priority.
            let visiblePostsByPriority = visiblePosts.find({}, {sort: {replyCount: -1}}).fetch();

            visiblePostsByPriority.forEach(function(post) {
                let hashPost = postPositionHashMap["" + post.position.x + ", " + post.position.y];
                if (hashPost)
                    hashPost.hidden = false;
            });
            //go through the sorted posts and hide the ones with less priority whenever theres a conflict.
            visiblePostsByPriority.forEach(function(post, i) {

                post = postPositionHashMap["" + post.position.x + ", " + post.position.y];

                if (!post) {
                    console.log("Not able to find post by position.");
                    return;
                }

                let div = $('#main-basic-post-' + post._id);

                let pos = camera.toScreen(post.position);

                let offset = div.offset();

                if (offset) {

                    let diffLeft = offset.left - (pos.x - div.outerWidth()/2);
                    let diffTop = offset.top - (pos.y - div.outerHeight()/2);

                    if (diffLeft > POST_PRECISION || diffLeft < -POST_PRECISION ) div.css('left', pos.x - div.outerWidth()/2);
                    if (diffTop > POST_PRECISION || diffTop < -POST_PRECISION ) div.css('top', pos.y - div.outerHeight()/2);
                } else {
                    div.css('left', pos.x - div.outerWidth()/2);
                    div.css('top', pos.y - div.outerHeight()/2);
                }

                if (!post.hidden) {
                    //This is for deciding how many adjacent posts to look for and check collisions against. Magic numbers are for max width and height of a preview.
                    let width = 1 + Math.floor(180/camera.getScale()), height = 1 + Math.floor(25/camera.getScale());

                    for (let x = -width; x < width; x++) {
                        for (let y = -height; y < height; y++) {

                            if (x === 0 && y === 0) continue;

                            let post2 = postPositionHashMap["" + (x + post.position.x) + ", " + (y + post.position.y)];
                            if (!post2 || post2.hidden) continue;

                            let pos2 = camera.toScreen(post2.position);

                            let div2 = $('#main-basic-post-' + post2._id);

                            let outerWidth1 = div.outerWidth(true)/2;
                            let outerWidth2 = div2.outerWidth(true)/2;

                            let outerHeight1 = div.outerHeight(true)/2;
                            let outerHeight2 = div2.outerHeight(true)/2;

                            //Checks for collisions, with a buffer space.
                            if ((pos.x + outerWidth1 + 20) > pos2.x - outerWidth2 &&
                                pos.x - outerWidth1 < (pos2.x + outerWidth2 + 20) &&
                                pos.y + outerHeight1 + 5 > pos2.y - outerHeight2 &&
                                pos.y - outerHeight1 < pos2.y + outerHeight2 + 5) {

                                post2.hidden = true;
                            }
                        }
                    }

                    div.css('visibility', 'visible');
                } else div.css('visibility', 'hidden');

            });

        } else {
            visiblePostsCursor.forEach(function(post, i) {
                let div = $('#main-detailed-post-' + post._id);

                let pos = camera.toScreen(post.position);

                if (div.width() - (POST_WIDTH*camera.getScale()) > POST_PRECISION || div.width() - (POST_WIDTH*camera.getScale()) < -POST_PRECISION)
                    div.width(POST_WIDTH*camera.getScale());

                let divMaxHeight = div.css('max-height');
                if (divMaxHeight && divMaxHeight !== "none") {

                    divMaxHeight = parseFloat(divMaxHeight);

                    if (divMaxHeight - (POST_HEIGHT*camera.getScale()) > POST_PRECISION || divMaxHeight - (POST_HEIGHT*camera.getScale()) < -POST_PRECISION)
                        div.css('max-height', POST_HEIGHT*camera.getScale());
                } else div.css('max-height', POST_HEIGHT*camera.getScale());

                let offset = div.offset();

                if (offset) {

                    let diffLeft = offset.left - (pos.x - div.outerWidth()/2);
                    let diffTop = offset.top - (pos.y - div.outerHeight()/2);

                    if (diffLeft > POST_PRECISION || diffLeft < -POST_PRECISION ) div.css('left', pos.x - div.outerWidth()/2);
                    if (diffTop > POST_PRECISION || diffTop < -POST_PRECISION ) div.css('top', pos.y - div.outerHeight()/2);
                } else {
                    div.css('left', pos.x - div.outerWidth()/2);
                    div.css('top', pos.y - div.outerHeight()/2);
                }
            });
        }
    };

    this.find = function() {
        return visiblePostsCursor;
    };
};

Template.mainDetailedPostLoadButton.getParents();

Template.mainDetailedPostLoadButton.events({
    'click': function(event, instance) {
        //Our parent is a mainDetailedPost, and its parent is the mainView.
        Posts.find({inReplyTo: this._id}).forEach(function(post) {
            subscriptionManager.subscribe('abstractPost', post._id);
            instance.parent.parent.addPost(post);
        });

        subscriptionManager.subscribe('abstractPost', instance.parent.data.inReplyTo);
        instance.parent.parent.addPost(Posts.findOne({_id: instance.parent.data.inReplyTo}));
    }
});

Template.mainDetailedPostReplyButton.getParents();

Template.mainDetailedPostReplyButton.events({
    'click': function(event, instance) {
        //Our parent is a mainDetailedPost, and its parent is the mainView.
        instance.parent.parent.targetPost.set(instance.parent.data);
        instance.parent.parent.targetMode.set("Reply");
    }
});

Template.mainDetailedPostEditButton.getParents();

Template.mainDetailedPostEditButton.events({
    'click': function(event, instance) {
        //Our parent is a mainDetailedPost, and its parent is the mainView.
        instance.parent.parent.targetPost.set(instance.parent.data);
        instance.parent.parent.targetMode.set("Edit");
    }
});

Template.mainDetailedPostReportButton.getParents();

Template.mainDetailedPostReportButton.events({
    'click': function(event, instance) {
        //Our parent is a mainDetailedPost, and its parent is the mainView.
        instance.parent.parent.reportTarget.set(instance.parent.data);
    }
});

Template.mainDetailedPostDeleteButton.getParents();

Template.mainDetailedPostDeleteButton.events({
    'click': function(event, instance) {
        //Our parent is a mainDetailedPost, and its parent is the mainView.
        if (confirm("Are you sure you want to delete this post?")) {
            Meteor.call('deletePost', instance.parent.data._id);
        }
    }
});

Template.mainBasicPost.getParents();

Template.mainBasicPost.onCreated(function() {
    let instance = this;
    let onSubReady = new Notifier();
    this.onRendered = new Notifier();
    this.seen = new ReactiveVar(true);

    this.subscribe('fullPost', this.data._id, this.data.attributedTo, {onReady: onSubReady.fulfill});

    Notifier.all(onSubReady, this.onRendered).onFulfilled(function() {
        //Fade out spinner and fade in actual post.
        instance.div.children('.main-basic-post-spinner').fadeOut(100);
        instance.div.css('overflow', 'visible');
        instance.div.children('.main-basic-post-flex')
            .css('display', 'flex')
            .hide()
            .fadeIn(200);

        if (!postIsSeen(instance.data)) {
            instance.seen.set(false);
            instance.div.addClass('unseen');
        }
    });
});


Template.mainBasicPost.onRendered(function() {
    this.div = $('#main-basic-post-' + this.data._id);
    this.div.css('display', 'flex').hide().fadeIn(200);
    setTimeout(this.onRendered.fulfill, 250);
});

Template.mainBasicPost.helpers({
    actor: function() {
        return Actors.findOne({id: this.attributedTo});
    },
    initials: function() {
        return Actors.findOne({id: this.attributedTo}).name[0];
    },
    preview: function() {
        if (this.summary) return this.summary.slice(0, 20);
        else {
            let rawContent = this.content;
            let bbcontent, finalContent = "";
            if (rawContent) {
                bbcontent = XBBCODE.process({
                    text: rawContent,
                    removeMisalignedTags: false,
                    addInLineBreaks: true
                }).html;

                let insideTags = 0, openTags = 0, characters = 20

                while (bbcontent.length > 0 || insideTags > 0 || openTags > 0) {

                    if (bbcontent[0] == '<') {
                        insideTags++;
                        if (bbcontent[1] != '/')
                            openTags++;
                        else openTags--;
                    }

                    if (characters > 0 && insideTags < 1) {
                        if (bbcontent[0] != '\n') finalContent += bbcontent[0];
                        else finalContent += ' ';
                    }

                    if (insideTags <= 0) characters--;

                    if (bbcontent[0] == '>') insideTags--;

                    bbcontent = bbcontent.substr(1, bbcontent.length - 1);

                }

                return finalContent;


            }
        }
    },
    seen: function() {
        return Template.instance().seen.get();
    }
});
