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

    let hasEdit = function() {
        let title = target.title === undefined ? "" : target.title;
        return titleInput.val() != title || contentInput.val() != target.content;
    };
    
    $('#main-edit-cancel-button').click(function(event) {
        if (!hasEdit() || confirm('You have an unfinished edit. Are you sure you want to cancel?')) {
            instance.parent.editTarget.set();
        }
    });

    $(window).on('beforeunload', function(event) {
        if (hasEdit()) {
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
