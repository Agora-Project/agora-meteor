Template.mainReply.onCreated(function() {
    let parentView = this.view.parentView;
    while (parentView.templateInstance === undefined) {
        parentView = parentView.parentView;
    }
    this.parent = parentView.templateInstance();
    
    this.errorMessage = new ReactiveVar();
});

Template.mainReply.onRendered(function() {
    let instance = this;
    let target = this.parent.replyTarget.get();
    
    let div = $('#main-reply');
    div.css('top', -div.outerHeight());
    
    let titleInput = $('#main-reply-title');
    let contentInput = $('#main-reply-textarea');
    
    let hasContent = function() {
        return titleInput.val().length > 0 || contentInput.val().length > 0;
    };
    
    $('#main-reply-submit-button').click(function(event) {
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
    });

    $('#main-reply-cancel-button').click(function(event) {
        if (!hasContent() || confirm('You have an unfinished post. Are you sure you want to cancel?')) {
            instance.parent.replyTarget.set();
        }
    });
    
    $(window).on('beforeunload', function(event) {
        if (hasContent()) {
            return 'You have an unfinished post. Are you sure you want to close Agora?';
        }
    });
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
