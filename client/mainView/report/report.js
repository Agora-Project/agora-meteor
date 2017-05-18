Template.mainReport.getParents();

Template.mainReport.onCreated(function() {
    this.errorMessage = new ReactiveVar();
});

Template.mainReport.onRendered(function() {
    let instance = this;
    let target = this.parent.reportTarget.get();
    
    let contentInput = $('#main-report-textarea');

    let hasContent = function() {
        return contentInput.val().length > 0;
    };

    $('#main-report-submit-button').click(function(event) {
        let report = {
            content: contentInput.val(),
            target: target._id
        };

        Meteor.call("submitReport", report, function(error) {
            if (error) {
                //Display error message to user.
                instance.errorMessage.set(error.reason);
            }
            else {
                //Don't delete user's work unless it posts successfully.
                instance.parent.reportTarget.set();
            }
        });
    });

    $('#main-report-cancel-button').click(function(event) {
        if (!hasContent() || confirm('You have an unfinished report. Are you sure you want to cancel?')) {
            instance.parent.reportTarget.set();
        }
    });

    $(window).on('beforeunload', function(event) {
        if (hasContent()) {
            return 'You have an unfinished report. Are you sure you want to close Agora?';
        }
    });
});

Template.mainReport.helpers({
    errorMessage: function() {
        return Template.instance().errorMessage.get();
    }
});

Template.mainReport.events({
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

Template.mainReport.onDestroyed(function() {
    $(window).off('beforeunload');
});
