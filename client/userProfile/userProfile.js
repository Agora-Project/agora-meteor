/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/


Template.userProfile.getParents();

Template.userProfile.helpers({
    actor: function() {
        return Actors.findOne({id: this.id});
    },
    editing: function() {
        return Template.instance().editing.get();;
    },
    errorMessage: function() {
        return Template.instance().errorMessage.get();
    },
    ownProfile: function() {
        let actor = Actors.findOne({id: this.id});
        if (actor)
            return Meteor.user().actor == actor.id;
    },
    initials: function() {
        let actor = Actors.findOne({id: this.id});
        if (!actor) return;
        return actor.name[0];
    },
    summary: function() {
        let actor = Actors.findOne({id: this.id});
        if (!actor) return;
        let rawBio = actor.summary;
        if (rawBio) {
            return rawBio;
        }
    }
});

Template.userProfile.onCreated(function() {
    let instance = this;

    this.subscribe('actor', this.data.id);

    this.editing = new ReactiveVar(false);
    this.errorMessage = new ReactiveVar();

    this.submitEdit = function() {
        Meteor.call("updateActorSummary", $('.profile-summary-edit-textarea').val(), function(error) {
            if (error) {
                //Display error message to user.
                instance.errorMessage.set(error.reason);
            }
            else {
                //Don't delete user's work unless it posts successfully.
                instance.editing.set(false);
                instance.errorMessage.set();
            }
        });
    }
});

Template.userProfile.onRendered(function() {
});

Template.userProfile.events({
    "click .profile-summary-edit-button": function(event, instance) {
        let width = $(".profile-summary-text-div").outerWidth();

        instance.editing.set(true);

        Meteor.setTimeout(function() {
            //First, expand the text area's width to that of the div that came before it.
            //Then, have it start autosizing it's height as people write in it.
            //We also change it's width with an event, down below.
            autosize($(".profile-summary-edit-textarea").css('width', width));
        }, 100);
    },
    'keydown, keyup': function(event, instance) {
        if (instance.editing.get() && event.ctrlKey && event.key == "Enter") {
            instance.submitEdit();
        }
    },
    "click .profile-summary-edit-submit-button": function(event, instance) {
        instance.submitEdit();
    },
    "click .profile-summary-edit-cancel-button": function(event, instance) {
        let actor = Actors.findOne({id: this.id});
        if (!actor) return;
        if ($(".profile-summary-edit-textarea").val() == actor.summary || confirm('You have an unfinished edit. Are you sure you want to cancel?')) {
            instance.editing.set(false);
            instance.errorMessage.set();
        } else event.stopPropagation();
    },
    'autosize:resized': function() {
        //We want our text area to expand it's width, not just it's height.
        //So, we call this event when it resize height and manually resize width.
        let textarea = $(".profile-summary-edit-textarea");

        let width = textarea.outerWidth();
        let height = textarea.outerHeight();

        if (width > height * 3) {
            textarea.css('width', height * 3);
            autosize.update(textarea);
        } else if (width < height * 2) {
            textarea.css('width', height * 2);
            autosize.update(textarea);
        }
    }
});
