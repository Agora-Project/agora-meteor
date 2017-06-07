Template.mainReply.getParents();

Template.mainReply.onCreated(function() {
    this.errorMessage = new ReactiveVar();
});

Template.mainReply.onRendered(function() {
    let instance = this;
    let reply;
    let target;

    let titleInput = $('#main-reply-title');
    let contentInput = $('#main-reply-textarea');

    if (this.parent.replyTarget.get()) {
        target = this.parent.replyTarget.get();
        reply = true;
    } else if (this.parent.editTarget.get()) {
        target = this.parent.editTarget.get();
        reply = false;

        titleInput.val(target.title);
        contentInput.val(target.content);
    }

    let hasContent = function() {
        return titleInput.val().length > 0 || contentInput.val().length > 0;
    };

    let hasEdit = function() {
        let title = target.title === undefined ? "" : target.title;
        return titleInput.val() != title || contentInput.val() != target.content;
    };

    let submitReply = function(event) {
        let post = {
            title: titleInput.val(),
            content: contentInput.val(),
            target: target._id
        };

        Meteor.call("insertPost", post, function(error) {
            if (error) {
                //Display error message to user.
                instance.errorMessage.set(error.reason);
            }
            else {
                //Don't delete user's work unless it posts successfully.
                instance.parent.replyTarget.set();
            }
        });
    };

    let submitEdit = function(event) {
        let post = {
            title: titleInput.val(),
            content: contentInput.val()
        };

        Meteor.call("editPost", target._id, post, function(error) {
            if (error) {
                //Display error message to user.
                instance.errorMessage.set(error.reason);
            }
            else {
                //Don't delete user's work unless it posts successfully.
                instance.parent.editTarget.set();
            }
        });
    };

    let cancelReply = function(event) {
        if (!hasContent() || confirm('You have an unfinished post. Are you sure you want to lose it?')) {
            instance.parent.replyTarget.set();
        }
    };

    let cancelEdit = function(event) {
        if (!hasEdit() || confirm('You have an unfinished edit. Are you sure you want to lose it?')) {
            instance.parent.editTarget.set();
        }
    };

    if (reply) {
        $('#main-reply-submit-button').click(submitReply);
        $('#main-reply-cancel-button').click(cancelReply);
        $(window).on('beforeunload', cancelReply);
    } else {
        $('#main-reply-submit-button').click(submitEdit);
        $('#main-reply-cancel-button').click(cancelEdit);
        $(window).on('beforeunload', cancelEdit);
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
    }
});

Template.mainReply.onDestroyed(function() {
    $(window).off('beforeunload');
});
