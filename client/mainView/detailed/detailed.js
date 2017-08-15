let POST_WIDTH = 0.75;
let POST_HEIGHT = 0.875;

Template.mainDetailedPost.getParents();

Template.mainDetailedPost.onCreated(function() {
    let instance = this;
    let onSubReady = new Notifier();
    this.onRendered = new Notifier();

    let user = Meteor.users.findOne({_id: Meteor.userId()});

    if (postIsSeen(instance.data))
        instance.seen = true;

    this.subscribe('post', this.data._id, this.data.poster, {onReady: onSubReady.fulfill});

    Notifier.all(onSubReady, this.onRendered).onFulfilled(function() {
        //Fade out spinner and fade in actual post.
        instance.div.children('.main-detailed-post-spinner').fadeOut(100);
        //instance.div.children('.main-detailed-post-info').css('overflow', 'visible');
        instance.div.children('.main-detailed-post-flex')
            .css('display', 'flex')
            .hide()
            .fadeIn(200);

        if (instance.data.postedOn && instance.data.poster != Meteor.userId() && Date.now() - instance.data.postedOn < (1000*60*60*24*30) && !instance.seen) {
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
    currentUser: function() {
        return (Meteor.user());
    },
    verifiedUser:function() {
        let user = Meteor.user();
        return (user.emails && user.emails.length > 0 && user.emails[0].verified);
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
    },
    seen: function() {
        return (!this.postedOn || this.poster == Meteor.userId() || Date.now() - this.postedOn >= (1000*60*60*24*30) || Template.instance().seen);
    }
});

Template.mainDetailedPost.events({
    'click .resend-verification-link' ( event, template ) {
        Meteor.call( 'sendVerificationLink', ( error, response ) => {
        if ( error ) {
            window.alert( error.reason, 'danger' );
        } else {
            let email = Meteor.user().emails[ 0 ].address;
            window.alert( `Verification sent to ${ email }!`, 'success' );
        }
        });
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

MainViewDetailedPosts = function(camera, partitioner, localPostPositions) {
    let self = this;

    //Collection of currently visible detailed posts.
    let visiblePosts = new Mongo.Collection(null);
    let visiblePostsCursor = visiblePosts.find({});
    this.showFullPosts = new ReactiveVar(false);

    this.init = function(postArray) {
    };

    this.addPost = function(post) {
        visiblePosts.insert(post);
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
        });
    };

    this.updatePost = function(id, fields) {
        visiblePosts.update({_id: id}, {$set: fields});
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
        visiblePostsCursor.forEach(function(post) {
            if (!camera.isPointVisible(post.defaultPosition) || ((2 + post.replies.length) <=
                5 * (1-camera.getZoomFraction()))) {
                self.removePost(post);
            }
        });

        //Add posts which are newly visible.
        let visible = partitioner.getVisible();
        for (let post of visible) {
            if (!visiblePosts.findOne({_id: post._id}) && ((2 + post.replies.length) >
                5 * (1-camera.getZoomFraction()))) {
                self.addPost(post);
            }
        }

        //Update post positions/sizes.
        visiblePostsCursor.forEach(function(post) {
            let div;

            if (self.showFullPosts.get()) {
                div = $('#main-detailed-post-' + post._id);
                div.width(POST_WIDTH*camera.getScale());
                div.css('max-height', POST_HEIGHT*camera.getScale());
            } else {
                div = $('#main-basic-post-' + post._id);
            }
            let pos = camera.toScreen(post.defaultPosition);
            div.css('left', pos.x - div.outerWidth()/2);
            div.css('top', pos.y - div.outerHeight()/2);
        });
    };

    this.find = function() {
        return visiblePostsCursor;
    };
};

Template.mainDetailedPostReplyButton.getParents();

Template.mainDetailedPostReplyButton.events({
    'click': function(event, instance) {
        //Our parent is a mainDetailedPost, and its parent is the mainView.
        instance.parent.parent.replyTarget.set(instance.parent.data);
    }
});

Template.mainDetailedPostEditButton.getParents();

Template.mainDetailedPostEditButton.events({
    'click': function(event, instance) {
        //Our parent is a mainDetailedPost, and its parent is the mainView.
        instance.parent.parent.editTarget.set(instance.parent.data);
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

    let user = Meteor.users.findOne({_id: Meteor.userId()});

    if (postIsSeen(instance.data))
        instance.seen = true;

    this.subscribe('post', this.data._id, this.data.poster, {onReady: onSubReady.fulfill});

    Notifier.all(onSubReady, this.onRendered).onFulfilled(function() {
        //Fade out spinner and fade in actual post.
        instance.div.children('.main-basic-post-spinner').fadeOut(100);
        instance.div.css('overflow', 'visible');
        instance.div.children('.main-basic-post-flex')
            .css('display', 'flex')
            .hide()
            .fadeIn(200);

        if (instance.data.postedOn && instance.data.poster != Meteor.userId() && Date.now() - instance.data.postedOn < (1000*60*60*24*30) && !instance.seen)
            instance.div.addClass('unseen');
    });
});


Template.mainBasicPost.onRendered(function() {
    this.div = $('#main-basic-post-' + this.data._id);
    this.div.css('display', 'flex').hide().fadeIn(200);
    setTimeout(this.onRendered.fulfill, 250);
});

Template.mainBasicPost.helpers({
    poster: function() {
        let post = Template.currentData();
        return Meteor.users.findOne({_id: post.poster});
    },
    preview: function() {
        if (Template.currentData().title) return Template.currentData().title.slice(0, 20);
        else {
            let rawContent = Template.currentData().content;
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
                        if (bbcontent[0] != '\n') finalContent = finalContent + bbcontent[0];
                        else finalContent = finalContent + ' ';
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
        return (!this.postedOn || this.poster == Meteor.userId() || Date.now() - this.postedOn >= (1000*60*60*24*30) || Template.instance().seen);
    }
});
