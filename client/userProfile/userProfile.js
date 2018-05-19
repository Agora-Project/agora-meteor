/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

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
        Meteor.call("updateActorSummary", $('#profile-summary-textarea').val(), function(error) {
            if (error) {
                //Display error message to user.
                instance.errorMessage.set(error.reason);
            }
            else {
                //Don't delete user's work unless it posts successfully.
                instance.editing.set(false);
            }
        });
    }
});

Template.userProfile.onRendered(function() {
    if (this.data.floating)
        $('#profile-body').css('transform', 'translateY(-50%) translateX(-50%)');
});

Template.userProfile.events({
    "click #profile-summary-edit": function(event, instance) {
        instance.editing.set(true);
    },
    'keydown, keyup': function(event, instance) {
        event.stopImmediatePropagation();

        if (instance.editing.get() && event.ctrlKey && event.key == "Enter") {
            instance.submitEdit();
        }

    },
    "click #profile-summary-submit-button": function(event, instance) {
        instance.submitEdit();
    },
    "click #profile-summary-cancel-button": function(event, instance) {
        instance.editing.set(false);
    },
    'click': function(event, instance) {
        event.stopPropagation();
    }
});
