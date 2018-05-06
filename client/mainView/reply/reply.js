/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

Template.mainReply.getParents();

Template.mainReply.onCreated(function() {
    this.errorMessage = new ReactiveVar();
});

Template.mainReply.onRendered(function() {
    let instance = this;
    let target;

    let summaryInput = $('#main-reply-summary');
    let contentInput = $('#main-reply-textarea');

    this.submitButton = null;

    this.submitted = false; //This is for preventing double-posts.

    let hasContent = function() {
        return summaryInput.val().length > 0 || contentInput.val().length > 0;
    };

    let hasEdit = function() {
        let summary = target.summary === undefined ? "" : target.summary;
        return summaryInput.val() != summary || contentInput.val() != target.content;
    };

    let submitReply = function(event) {
        if (instance.submitted) return;
        let post = {
            summary: summaryInput.val(),
            content: contentInput.val(),
            target: target._id
        };

        Meteor.call("insertPost", post, function(error, result) {
            if (error) {
                //Display error message to user.
                instance.errorMessage.set(error.reason);
                instance.submitted = false
            }
            else {
                //Don't delete user's work unless it posts successfully.
                instance.parent.targetPost.set();
                subscriptionManager.subscribe('abstractPost', result);
                instance.parent.addPostByID(result);
            }
        });
        instance.submitted = true;
    };

    let submitEdit = function(event) {
        if (instance.submitted) return;

        let post = {
            summary: summaryInput.val(),
            content: contentInput.val()
        };

        Meteor.call("editPost", target._id, post, function(error) {
            if (error) {
                //Display error message to user.
                instance.errorMessage.set(error.reason);
                instance.submitted = false;
            }
            else {
                //Don't delete user's work unless it posts successfully.
                instance.parent.targetPost.set();
            }
        });
        instance.submitted = true;
    };

    let cancelReply = function(event) {
        if (!hasContent() || confirm('You have an unfinished post. Are you sure you want to cancel?')) {
            instance.parent.targetPost.set();
        }
    };

    let cancelEdit = function(event) {
        if (!hasEdit() || confirm('You have an unfinished edit. Are you sure you want to cancel?')) {
            instance.parent.targetPost.set();
        }
    };

    let exitReply = function(event) {
        if (hasContent())
            return "You have an unfinished post. Are you sure you want to close the page?";
    };

    let exitEdit = function(event) {
        if (hasEdit())
            return "You have an unfinished edit. Are you sure you want to close the page?";
    };

    if (this.parent.targetMode.get() === "Reply") {
        target = this.parent.targetPost.get();

        this.submitButton = submitReply;

        $('#main-reply-submit-button').click(this.submitButton);
        $('#main-reply-cancel-button').click(cancelReply);
        $(window).on('beforeunload', exitReply);
    } else if (this.parent.targetMode.get() === "Edit") {
        target = this.parent.targetPost.get();

        summaryInput.val(target.summary);
        contentInput.val(target.content);

        this.submitButton = submitEdit;

        $('#main-reply-submit-button').click(this.submitButton);
        $('#main-reply-cancel-button').click(cancelEdit);
        $(window).on('beforeunload', exitEdit);
    }
});

Template.mainReply.helpers({
    errorMessage: function() {
        return Template.instance().errorMessage.get();
    }
});

Template.mainReply.events({
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
    'keydown, keyup': function(event) {
        event.stopImmediatePropagation();

        if (event.ctrlKey && event.key == "Enter")
            Template.instance().submitButton();

    }
});

Template.mainReply.onDestroyed(function() {
    $(window).off('beforeunload');
});
