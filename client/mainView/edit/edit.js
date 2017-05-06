Template.mainEdit.onCreated(function() {
    let parentView = this.view.parentView;
    while (parentView.templateInstance === undefined) {
        parentView = parentView.parentView;
    }
    this.parent = parentView.templateInstance();

    this.errorMessage = new ReactiveVar();
});

Template.mainEdit.onRendered(function() {
    let instance = this;
    let target = this.parent.editTarget.get();

    let div = $('#main-edit');
    div.css('top', -div.outerHeight());

    let titleInput = $('#main-edit-title');
    let contentInput = $('#main-edit-textarea');

    titleInput.val(target.title);
    contentInput.val(target.content);

    let hasContent = function() {
        return titleInput.val().length > 0 || contentInput.val().length > 0;
    };

    $('#main-edit-submit-button').click(function(event) {
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
    });

    $('#main-edit-cancel-button').click(function(event) {
        if ((titleInput.val() == target.title && contentInput.val() == target.content) ||
             confirm('You have an unfinished edit. Are you sure you want to cancel?')) {
            instance.parent.editTarget.set();
        }
    });

    $(window).on('beforeunload', function(event) {
        if (hasContent()) {
            return 'You have an unfinished edit. Are you sure you want to close Agora?';
        }
    });
});

Template.mainEdit.helpers({
    errorMessage: function() {
        return Template.instance().errorMessage.get();
    }
});

Template.mainEdit.events({
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

Template.mainEdit.onDestroyed(function() {
    $(window).off('beforeunload');
});
